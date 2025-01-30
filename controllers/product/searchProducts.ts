// controllers/product/searchProducts.ts
import { Request, Response } from 'express';
import Product from '../../models/productModel';
import type { PipelineStage } from 'mongoose';

// Define interfaces for type safety
interface AggregationResult {
  metadata: Array<{ totalItems: number }>;
  items: Array<{
    _id: string;
    id: number;
    name: string;
    sku: string;
    stock: number;
    availablestock: number;
    imagepath: string | null;
    categoryid: number | null;
    category: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    listPrice?: Array<{
      _id: string;
      priceId: string;
      priceName: string;
      price: number;
      createdAt: Date;
      updatedAt: Date;
    }>;
  }>;
}

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '10' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (currentPage - 1) * limitNumber;

    const aggregationPipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { name: searchRegex },
            { sku: searchRegex }
          ]
        }
      },
      {
        $lookup: {
          from: 'tbl_store_price',
          localField: 'sku',
          foreignField: 'sku',
          as: 'priceData'
        }
      },
      {
        $unwind: {
          path: '$priceData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          id: 1,
          name: 1,
          sku: 1,
          stock: 1,
          availablestock: 1,
          imagepath: 1,
          categoryid: 1,
          category: 1,
          active: 1,
          createdAt: 1,
          updatedAt: 1,
          listPrice: {
            $cond: {
              if: { $isArray: '$priceData.listPrice' },
              then: '$priceData.listPrice',
              else: []
            }
          }
        }
      },
      {
        $facet: {
          metadata: [{ $count: 'totalItems' }],
          items: [
            { $skip: skip },
            { $limit: limitNumber }
          ]
        }
      }
    ];

    const [result] = await Product.aggregate<AggregationResult>(aggregationPipeline);

    const totalItems = result.metadata[0]?.totalItems || 0;
    const items = result.items;

    res.json({
      items: items.map((item) => ({
        ...item,
        listPrice: item.listPrice || []
      })),
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });

  } catch (error) {
    console.error('Error searching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage,
      success: false 
    });
  }
};

export const searchProductsWithSort = async (req: Request, res: Response) => {
  try {
    const { 
      query, 
      page = '1', 
      limit = '10',
      sortField = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (currentPage - 1) * limitNumber;

    const sortStage: PipelineStage.Sort = {
      $sort: {
        [sortField as string]: sortOrder === 'desc' ? -1 : 1
      }
    };

    const aggregationPipeline: PipelineStage[] = [
      {
        $match: {
          $or: [
            { name: searchRegex },
            { sku: searchRegex }
          ]
        }
      },
      {
        $lookup: {
          from: 'tbl_store_price',
          localField: 'sku',
          foreignField: 'sku',
          as: 'priceData'
        }
      },
      {
        $unwind: {
          path: '$priceData',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          id: 1,
          name: 1,
          sku: 1,
          stock: 1,
          availablestock: 1,
          imagepath: 1,
          categoryid: 1,
          category: 1,
          active: 1,
          createdAt: 1,
          updatedAt: 1,
          listPrice: {
            $cond: {
              if: { $isArray: '$priceData.listPrice' },
              then: '$priceData.listPrice',
              else: []
            }
          }
        }
      },
      sortStage,
      {
        $facet: {
          metadata: [{ $count: 'totalItems' }],
          items: [
            { $skip: skip },
            { $limit: limitNumber }
          ]
        }
      }
    ];

    const [result] = await Product.aggregate<AggregationResult>(aggregationPipeline);

    const totalItems = result.metadata[0]?.totalItems || 0;
    const items = result.items;

    res.json({
      items: items.map((item) => ({
        ...item,
        listPrice: item.listPrice || []
      })),
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });

  } catch (error) {
    console.error('Error searching products:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    res.status(500).json({ 
      message: 'Internal server error',
      error: errorMessage,
      success: false 
    });
  }
};


export const clientSearchProducts = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }

    const products = await Product.find({
      $or: [
        { sku: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    })
    .select('sku name availablestock')
    .limit(10)
    .lean();

    res.json(products);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};