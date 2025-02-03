// controllers/product/searchProducts.ts
// controllers/product/searchProducts.ts
import { Request, Response } from 'express';
import Product from '../../models/productModel';
import Price from '../../models/priceModel';
import type { PipelineStage } from 'mongoose';

import { ProductWithPrice } from './getProducts';
import { fetchWarehousePrices } from '../../service/warehousePriceService';

interface AggregationResult {
  metadata: Array<{ totalItems: number }>;
  items: Array<ProductWithPrice>;
}

export const searchProducts = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '10' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (currentPage - 1) * limitNumber;

    // 1. ค้นหาสินค้าและดึงราคาของร้านค้า
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
          categories: 1,
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

    // 2. ดึงข้อมูลราคาจากคลังสินค้า
    const skus = items.map(item => item.sku);
    const warehousePrices = await fetchWarehousePrices(skus);

    // 3. รวมข้อมูลสินค้า
    const formattedItems = items.map(item => ({
      ...item,
      listPrice: item.listPrice || [],
      warehousePrice: warehousePrices?.items.find(p => p.sku === item.sku) || null
    }));

    res.json({
      items: formattedItems,
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems,
      warehousePricesStatus: warehousePrices ? 'success' : 'error'
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




// controllers/product/clientSearchProducts.ts
export const clientSearchProducts = async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    
    if (!q) {
      return res.json([]);
    }

    // ค้นหาสินค้า
    const products = await Product.find({
      $or: [
        { sku: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    })
    .select('sku name availablestock imagepath')
    .limit(100)
    .lean();

    // ดึงราคาจาก tbl_store_price
    const skus = products.map(p => p.sku);
    const prices = await Price.find({ 
      sku: { $in: skus } 
    }).lean();

    // Map ราคาเข้ากับสินค้า
    const productsWithPrices = products.map(product => {
      const priceData = prices.find(p => p.sku === product.sku);
      return {
        ...product,
        listPrice: priceData?.listPrice || []
      };
    });

    res.json(productsWithPrices);
  } catch (error) {
    console.error('Error searching products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};