import { Request, Response } from 'express';
import Price, { IPrice } from '../../models/priceModel';

export const searchPrice = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '10' } = req.query;
    const currentPage = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return res.json({
        items: [],
        currentPage,
        totalPages: 0,
        totalItems: 0
      });
    }

    const cleanedQuery = query.trim();
    const searchRegex = new RegExp(cleanedQuery, 'i');

    const aggregationPipeline = [
      { $unwind: '$listPrice' },
      {
        $match: {
          $or: [
            { 'listPrice.priceId': searchRegex },
            { 'listPrice.priceName': searchRegex }
          ]
        }
      },
      {
        $group: {
          _id: '$listPrice.priceId',
          name: { $first: '$listPrice.priceName' },
          createdAt: { $first: '$listPrice.createdAt' },
          updatedAt: { $first: '$listPrice.updatedAt' }
        }
      },
      { $skip: (currentPage - 1) * limitNumber },
      { $limit: limitNumber }
    ];

    const items = await Price.aggregate(aggregationPipeline);

    if (items.length === 0) {
      return res.json({
        items: [],
        currentPage,
        totalPages: 0,
        totalItems: 0
      });
    }

    const totalItemsResult = await Price.aggregate([
      { $unwind: '$listPrice' },
      {
        $match: {
          $or: [
            { 'listPrice.priceId': searchRegex },
            { 'listPrice.priceName': searchRegex }
          ]
        }
      },
      {
        $group: {
          _id: '$listPrice.priceId'
        }
      },
      { $count: 'total' }
    ]);

    const totalItems = totalItemsResult.length > 0 ? totalItemsResult[0].total : 0;
    const totalPages = Math.ceil(totalItems / limitNumber);

    res.json({
      items,
      currentPage,
      totalPages,
      totalItems
    });
  } catch (error) {
    console.error('Error searching prices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};