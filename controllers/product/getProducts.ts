// controllers/product/getProducts.ts
import { Request, Response } from 'express';
import Product, { IProduct } from '../../models/productModel';
import { IListPrice } from '../../models/priceModel';
import { PipelineStage } from 'mongoose';
import { fetchWarehousePrices } from '../../service/warehousePriceService';

export interface ProductWithPrice extends Omit<IProduct, '_id'> {
  _id: string;
  listPrice?: IListPrice[];
  warehousePrice?: {
    listPrice: {
      priceId: string;
      priceName: string;
      price: number;
    }[];
  };
}


export const getProducts = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    // 1. ดึงข้อมูลสินค้าและราคาของร้านค้า
    const aggregationPipeline: PipelineStage[] = [
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
        $sort: {
          active: -1,
          updatedAt: -1,
          sku: 1
        }
      },
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
    const items = result[0].items as ProductWithPrice[];
    const totalItems = result[0].metadata[0]?.totalItems || 0;

    // 2. ดึงข้อมูลราคาจากคลังสินค้าผ่าน service
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
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems,
      warehousePricesStatus: warehousePrices ? 'success' : 'error'
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};