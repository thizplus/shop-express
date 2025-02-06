// controllers/priceList/createPrice.ts
import { Request, Response } from 'express';
import PriceList from '../../models/priceListModel';
import Product from '../../models/productModel';
import Price from '../../models/priceModel';
import mongoose from 'mongoose';
import StoreConfig from '../../models/configStore';

const generateAlphanumericId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const isUniqueIdAndName = async (id: string, name: string): Promise<boolean> => {
  const existingPrice = await PriceList.findOne({
    $or: [
      { priceId: id },
      { priceName: name }
    ]
  });
  return !existingPrice;
};

// controllers/priceList/priceListController.ts

export const createPriceList = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { priceName, idPrice } = req.body;
    if (!priceName?.trim()) {
      return res.status(400).json({ message: 'Price name is required' });
    }

    const priceId = generateAlphanumericId();
    const isUnique = await isUniqueIdAndName(priceId, priceName);
    if (!isUnique) {
      return res.status(400).json({ message: 'Price name already exists' });
    }

    const priceList = await PriceList.create([{
      priceId,
      priceName: priceName.trim(),
      status: true
    }], { session });

    const products = await Product.find({}, null, { session });

    if (idPrice) {
      const existingPrices = await Price.find({ 'listPrice.priceId': idPrice }, null, { session });
      
      const priceOperations = products.map(async (product) => {
        const existingPrice = existingPrices.find(p => p.sku === product.sku);
        const price = existingPrice?.listPrice.find(lp => lp.priceId === idPrice)?.price || 0;

        return Price.findOneAndUpdate(
          { sku: product.sku },
          { 
            $push: { 
              listPrice: {
                priceId,
                priceName: priceName.trim(),
                price
              }
            }
          },
          { upsert: true, new: true, session }
        );
      });

      await Promise.all(priceOperations);
    } else {
      const priceOperations = products.map(product => 
        Price.findOneAndUpdate(
          { sku: product.sku },
          { 
            $push: { 
              listPrice: {
                priceId,
                priceName: priceName.trim(),
                price: 0
              }
            }
          },
          { upsert: true, new: true, session }
        )
      );

      await Promise.all(priceOperations);
    }

    await session.commitTransaction();
    res.status(201).json({
      message: 'Price list created successfully',
      priceList: priceList[0]
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};
 
 export const getPriceLists = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
 
    const items = await PriceList.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const totalItems = await PriceList.countDocuments();
    
    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
 };
 
 export const searchPriceLists = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '20' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (currentPage - 1) * limitNumber;
 
    const items = await PriceList.find({
      $or: [
        { priceId: searchRegex },
        { priceName: searchRegex }
      ]
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);
 
    const totalItems = await PriceList.countDocuments({
      $or: [
        { priceId: searchRegex },
        { priceName: searchRegex }
      ]
    });
 
    res.json({
      items,
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
 };
 
 export const updatePriceList = async (req: Request, res: Response) => {
  try {
    const { priceId, priceName, status } = req.body;
    
    if (!priceName?.trim()) {
      return res.status(400).json({ message: 'Price name is required' });
    }
 
    const existingPrice = await PriceList.findOne({ 
      priceName: priceName.trim(),
      priceId: { $ne: priceId }
    });
 
    if (existingPrice) {
      return res.status(400).json({ message: 'Price name already exists' });
    }
 
    const updatedPrice = await PriceList.findOneAndUpdate(
      { priceId },
      { 
        priceName: priceName.trim(),
        status,
        updatedAt: new Date()
      },
      { new: true }
    );
 
    if (!updatedPrice) {
      return res.status(404).json({ message: 'Price list not found' });
    }
 
    res.json({
      message: 'Price list updated successfully',
      priceList: updatedPrice
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
 };
 
 
 export const deletePriceList = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { priceId } = req.params;
    
    await Promise.all([
      PriceList.findOneAndDelete({ priceId }, { session }),
      
      Price.updateMany(
        { 'listPrice.priceId': priceId },
        { $pull: { listPrice: { priceId } } },
        { session }
      ),

      StoreConfig.updateOne(
        {},
        { $pull: { 'saleModel.listPrice': { id: priceId } } },
        { session }
      )
    ]);

    await session.commitTransaction();
    res.json({ message: 'Price list deleted successfully' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
};


export const updateNamePriceList = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();
 
  try {
    const { priceId, priceName } = req.body;
 
    const priceList = await PriceList.findOneAndUpdate(
      { priceId },
      { priceName },
      { session, new: true }
    );
 
    if (!priceList) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Price list not found' });
    }
 
    await Promise.all([
      Price.updateMany(
        { 'listPrice.priceId': priceId },
        { $set: { 'listPrice.$.priceName': priceName } },
        { session }
      ),
 
      StoreConfig.updateOne(
        { 'saleModel.listPrice.id': priceId },
        { $set: { 'saleModel.listPrice.$.name': priceName } },
        { session }
      )
    ]);
 
    await session.commitTransaction();
    res.json({ 
      message: 'Price name updated successfully',
      priceList: {
        priceName: priceList.priceName,
        priceId: priceList.priceId
      }
    });
 
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ message: 'Internal server error' });
  } finally {
    session.endSession();
  }
 };