// controllers/product/getProducts.ts
import { Request, Response } from 'express';
import Product, { IProduct } from '../../models/productModel';
import { IListPrice } from '../../models/priceModel';
import { PipelineStage } from 'mongoose';
import axios from 'axios';

interface WarehousePriceResponse {
  items: {
    sku: string;
    listPrice: {
      priceId: string;
      priceName: string;
      price: number;
    }[];
  }[];
  allowedPriceIds: string[];
}

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

async function fetchWarehousePrices(skus: string[]): Promise<WarehousePriceResponse | null> {
  try {
    const warehouseUrl = process.env.STORE_API_URL;
    const shopCode = process.env.SHOP_NAME;
    
    if (!warehouseUrl || !shopCode) {
      console.error('Missing STORE_API_URL or SHOP_NAME in environment variables');
      return null;
    }

    const response = await axios.get<WarehousePriceResponse>(
      `${warehouseUrl}/api/shops/${shopCode}/products/prices`,
      {
        params: { skus: skus.join(',') }
      }
    );
    
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Error fetching warehouse prices:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
    } else {
      console.error('Error fetching warehouse prices:', error);
    }
    return null;
  }
}

export const getProducts = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    // 1. ดึงข้อมูลสินค้าและราคาของร้านค้าก่อน
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

    // 2. ดึงข้อมูลราคาจากคลังสินค้าเฉพาะ SKUs ในหน้าปัจจุบัน
    const skus = items.map(item => item.sku);
    const warehousePrices = await fetchWarehousePrices(skus);

    // 3. รวมข้อมูลสินค้า ราคาร้านค้า และราคาคลังสินค้า
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
      warehousePricesStatus: warehousePrices ? 'success' : 'error' // เพิ่ม status เพื่อ debug
    });

  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};