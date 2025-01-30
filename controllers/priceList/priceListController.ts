// controllers/priceList/createPrice.ts
import { Request, Response } from 'express';
import PriceList from '../../models/priceListModel';

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
  try {
    const { priceName } = req.body;
    if (!priceName?.trim()) {
      return res.status(400).json({ message: 'Price name is required' });
    }
 
    const priceId = generateAlphanumericId();
    const isUnique = await isUniqueIdAndName(priceId, priceName);
    if (!isUnique) {
      return res.status(400).json({ message: 'Price name already exists' });
    }
 
    const priceList = await PriceList.create({
      priceId,
      priceName: priceName.trim(),
      status: true
    });
 
    res.status(201).json({
      message: 'Price list created successfully',
      priceList
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
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
  try {
    const { priceId } = req.params;
    
    const result = await PriceList.findOneAndDelete({ priceId });
    
    if (!result) {
      return res.status(404).json({ message: 'Price list not found' });
    }
 
    res.json({ message: 'Price list deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
 };