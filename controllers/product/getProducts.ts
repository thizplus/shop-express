import { Request, Response } from 'express';
import Product, { IProduct } from '../../models/productModel';
import { IListPrice } from '../../models/priceModel';
import { PipelineStage } from 'mongoose';

export interface ProductWithPrice extends Omit<IProduct, '_id'> {
  _id: string;
  listPrice?: IListPrice[];
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    const aggregationPipeline: PipelineStage[] = [
      // Stage 1: Join with price data
      {
        $lookup: {
          from: 'tbl_store_price',
          localField: 'sku',
          foreignField: 'sku',
          as: 'priceData'
        }
      },
      // Stage 2: Unwind price data
      {
        $unwind: {
          path: '$priceData',
          preserveNullAndEmptyArrays: true
        }
      },
      // Stage 3: Project the fields we want
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
      // Stage 4: Sort by active and sku
      { 
        $sort: {
          active: -1,
          sku: 1
        }
      } as PipelineStage.Sort,
      // Stage 5: Facet for pagination
      {
        $facet: {
          metadata: [{ $count: "totalItems" }],
          items: [
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ];

    const result = await Product.aggregate(aggregationPipeline);
    
    // Extract pagination data
    const totalItems = result[0].metadata[0]?.totalItems || 0;
    const items = result[0].items as ProductWithPrice[];

    // Add default empty listPrice array if not present
    const formattedItems = items.map(item => ({
      ...item,
      listPrice: item.listPrice || []
    }));

    // Return the response
    res.json({
      items: formattedItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};