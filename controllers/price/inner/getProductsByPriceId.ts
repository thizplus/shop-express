import { Request, Response } from 'express';
import Product, { IProduct } from '../../../models/productModel';
import PriceList from '../../../models/priceListModel';

export const getProductsByPriceId = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // 1. ดึงข้อมูล price list
    const priceList = await PriceList.findOne({ priceId });
    if (!priceList) {
      return res.status(404).json({ message: 'Price list not found' });
    }

    // 2. ดึงข้อมูลสินค้าพร้อมราคา
    const products = await Product.aggregate([
      {
        $lookup: {
          from: 'tbl_store_price',
          let: { productSku: '$sku' },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$sku', '$$productSku'] },
                'listPrice.priceId': priceId
              }
            },
            { $unwind: '$listPrice' },
            { $match: { 'listPrice.priceId': priceId } }
          ],
          as: 'priceData'
        }
      },
      {
        $addFields: {
          price: { $first: '$priceData.listPrice.price' }
        }
      },
      {
        $project: {
          _id: 0,
          sku: 1,
          name: 1,
          stock: 1,
          availablestock: 1,
          price: { $ifNull: ['$price', 0] }
        }
      },
      { $sort: { sku: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit as string) }
    ]);

    const totalItems = await Product.countDocuments();

    res.json({
      items: products,
      totalItems,
      currentPage: parseInt(page as string),
      totalPages: Math.ceil(totalItems / parseInt(limit as string)),
      priceId,
      priceName: priceList.priceName
    });

  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};