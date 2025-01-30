// controllers/priceController.ts
import { Request, Response } from 'express';
import PriceList from '../../models/priceListModel';

export const getPriceTiers = async (req: Request, res: Response) => {
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
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
 };