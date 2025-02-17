// controllers/orders/getCustomerOrderStats.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';
import Product from '../../models/productModel';
import { startOfDay, endOfDay } from 'date-fns';


// backend/src/types/orderStats.ts
export interface CustomerProductStats {
    sku: string;
    name: string;
    totalQty: number;
    totalAmount: number;
    imagePath: string | null;
    categories: Array<{
      catId: string;
      name: string;
    }>;
  }
  
  export interface CategoryStats {
    catId: string;
    name: string;
    totalAmount: number;
    totalItems: number;
  }
  
  export interface CustomerStatsSummary {
    totalAmount: number;
    totalOrders: number;
    avgOrderValue: number;
    topProducts: CustomerProductStats[];
    topCategories: CategoryStats[];
  }
  
  export interface CustomerStatsResponse {
    summary: CustomerStatsSummary;
    dateRange: {
      start: string;
      end: string;
    };
  }


export const getCustomerOrderStats = async (req: Request, res: Response) => {
  try {
    const { userId, typeId, startDate, endDate } = req.query;

    if (!userId || !typeId || !startDate || !endDate) {
      return res.status(400).json({ 
        message: 'userId, typeId, startDate and endDate are required' 
      });
    }

    const parsedStartDate = startOfDay(new Date(startDate as string));
    const parsedEndDate = endOfDay(new Date(endDate as string));

    // ดึงข้อมูล Orders ของลูกค้า
    const orders = await Order.find({
      userId,
      typeId,
      createdAt: {
        $gte: parsedStartDate,
        $lte: parsedEndDate
      },
      'payment.status': 'success'
    }).sort({ createdAt: -1 });

    // รวบรวม SKUs ทั้งหมด
    const skus = new Set<string>();
    orders.forEach(order => {
      order.listProducts.forEach(product => skus.add(product.sku));
    });

    // ดึงข้อมูลสินค้า
    const products = await Product.find({ sku: { $in: Array.from(skus) } });
    const productMap = new Map(products.map(p => [p.sku, p]));

    // คำนวณสถิติสินค้าและหมวดหมู่
    const productStats = new Map<string, CustomerProductStats>();
    const categoryStats = new Map<string, {
      catId: string;
      name: string;
      totalAmount: number;
      totalItems: number;
    }>();

    // คำนวณสถิติ
    orders.forEach(order => {
      order.listProducts.forEach(item => {
        const productInfo = productMap.get(item.sku);
        if (!productInfo) return;

        // สถิติสินค้า
        const prodStat = productStats.get(item.sku) || {
          sku: item.sku,
          name: item.name,
          totalQty: 0,
          totalAmount: 0,
          imagePath: productInfo.imagepath,
          categories: productInfo.categories
        };

        prodStat.totalQty += item.qty;
        prodStat.totalAmount += item.total;
        productStats.set(item.sku, prodStat);

        // สถิติหมวดหมู่
        productInfo.categories.forEach(cat => {
          const catStat = categoryStats.get(cat.catId) || {
            catId: cat.catId,
            name: cat.name,
            totalAmount: 0,
            totalItems: 0
          };

          catStat.totalAmount += item.total;
          catStat.totalItems += item.qty;
          categoryStats.set(cat.catId, catStat);
        });
      });
    });

    // คำนวณสรุป
    const totalAmount = orders.reduce((sum, order) => sum + order.netTotal, 0);
    const avgOrderValue = orders.length > 0 ? totalAmount / orders.length : 0;

    // จัดเรียงและส่งผลลัพธ์
    const response = {
      summary: {
        totalAmount,
        totalOrders: orders.length,
        avgOrderValue,
        topProducts: Array.from(productStats.values())
          .sort((a, b) => b.totalAmount - a.totalAmount),
        topCategories: Array.from(categoryStats.values())
          .sort((a, b) => b.totalAmount - a.totalAmount)
      },
      dateRange: {
        start: parsedStartDate.toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'long'
        }),
        end: parsedEndDate.toLocaleString('th-TH', {
          timeZone: 'Asia/Bangkok',
          dateStyle: 'long'
        })
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error generating customer order statistics:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};