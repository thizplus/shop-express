// controllers/priceController.ts
import { Request, Response } from 'express';
import Price, { IPrice } from '../../models/priceModel';

export const getPriceTiers = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    // Aggregation pipeline to unwind and group price tiers
    const pipeline = [
      { $unwind: '$listPrice' },
      {
        $group: {
          _id: '$listPrice.priceId',
          name: { $first: '$listPrice.priceName' },
          createdAt: { $first: '$listPrice.createdAt' },
          updatedAt: { $first: '$listPrice.updatedAt' }
        }
      },
      { $skip: skip },
      { $limit: limit }
    ];

    const items: Array<{_id: string, name: string, price: number}> = await Price.aggregate(pipeline);
    
    // Count total unique price tiers
    const totalItems: number = await Price.aggregate([
      { $unwind: '$listPrice' },
      {
        $group: {
          _id: '$listPrice.priceId'
        }
      },
      { $count: 'total' }
    ]).then(result => result[0]?.total || 0);
    
    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching price tiers:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};