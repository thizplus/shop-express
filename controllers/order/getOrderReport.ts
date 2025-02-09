// controllers/orders/types.ts
import type { ObjectId } from "mongodb";

// Base types from orderTypes.ts
export interface OrderProduct {
  _id?: ObjectId;
  sku: string;
  name: string;
  price: number;
  cost: number;
  qty: number;
  total: number;
  totalCost: number;
  profit: number;
}

export interface ShippingInfo {
  _id: string;
  cusName: string;
  cusTel: string;
  addressNo: string;
  district: string;
  amphoe: string;
  province: string;
  zipcode: string;
  location?: string;
  isDefault: boolean;
  trackingNo?: string;
  shippingChannel?: string;
  trackingUpdateAt?: Date;
}

export interface ProfitSummary {
  totalCost: number;    // ต้นทุนรวม
  grossProfit: number;  // กำไรขั้นต้น
  netProfit: number;    // กำไรสุทธิ
  updatedAt?: Date;
}

export interface WarehouseFees {
  shippingCost: number;
  serviceFee: number;
  totalFees: number;
}

// Report specific types
export interface DailySummary {
  totalOrders: number;
  totalShippingCost: number;
  totalAmount: number;
  totalNetAmount: number;
  totalPaymentAmount: number;
  totalCost: number;         
  totalGrossProfit: number;  
  totalNetProfit: number;    
  totalWarehouseFees: number;
}

export interface ReportOrder {
  orderId: string;
  shippingInfo: ShippingInfo;
  listProducts: OrderProduct[];
  shippingCost: number;
  totalAmount: number;
  netTotal: number;
  status: string;
  createdAt: string | Date;
  payment: {
    amount: number;
    status: string;
  };
  profitSummary?: ProfitSummary;
  warehouseFees?: WarehouseFees;
}

export interface DailyReport {
  date: string;
  orders: ReportOrder[];
  summary: DailySummary;
}

export interface ReportResponse {
  dailyReports: DailyReport[];
  summary: DailySummary;
  dateRange: {
    start: Date;
    end: Date;
  };
}

// controllers/orders/getOrderReport.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';
import { format } from 'date-fns-tz';




export const getOrderReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);

    const orders = await Order.find({
      createdAt: {
        $gte: parsedStartDate,
        $lte: parsedEndDate
      },
      'payment.status': 'success'
    }).sort({ createdAt: 1 });

    // จัดกลุ่มตามวันที่
    const ordersByDate = orders.reduce<Record<string, DailyReport>>((acc, order) => {
      const orderDate = new Date(order.createdAt);
      const dateKey = orderDate.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      const timeStr = orderDate.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        hour: '2-digit',
        minute: '2-digit'
      });

      const fullDateTimeStr = `${dateKey} ${timeStr}`;

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          orders: [],
          summary: {
            totalOrders: 0,
            totalShippingCost: 0,
            totalAmount: 0,
            totalNetAmount: 0,
            totalPaymentAmount: 0,
            totalCost: 0,
            totalGrossProfit: 0,
            totalNetProfit: 0,
            totalWarehouseFees: 0
          }
        };
      }

      // Transform order to ReportOrder type
      const reportOrder: ReportOrder = {
        orderId: order.orderId,
        shippingInfo: order.shippingInfo,
        listProducts: order.listProducts.map(product => ({
          ...product,
          cost: product.cost || 0,
          totalCost: product.totalCost || 0,
          profit: product.profit || 0
        })),
        shippingCost: order.shippingCost,
        totalAmount: order.totalAmount,
        netTotal: order.netTotal,
        status: order.payment.status,
        createdAt: fullDateTimeStr,
        payment: {
          amount: order.payment.amount || 0,
          status: order.payment.status
        },
        profitSummary: order.profitSummary,
        warehouseFees: order.warehouseFees
      };

      acc[dateKey].orders.push(reportOrder);

      // Update daily summary
      acc[dateKey].summary.totalOrders += 1;
      acc[dateKey].summary.totalShippingCost += order.shippingCost;
      acc[dateKey].summary.totalAmount += order.totalAmount;
      acc[dateKey].summary.totalNetAmount += order.netTotal;
      acc[dateKey].summary.totalPaymentAmount += (order.payment.amount || 0);
      acc[dateKey].summary.totalCost += order.profitSummary?.totalCost || 0;
      acc[dateKey].summary.totalGrossProfit += order.profitSummary?.grossProfit || 0;
      acc[dateKey].summary.totalNetProfit += order.profitSummary?.netProfit || 0;
      acc[dateKey].summary.totalWarehouseFees += order.warehouseFees?.totalFees || 0;

      return acc;
    }, {});

    // Sort daily reports
    const dailyReports = Object.values(ordersByDate).sort((a, b) => {
      const dateA = new Date(a.orders[0].createdAt);
      const dateB = new Date(b.orders[0].createdAt);
      return dateA.getTime() - dateB.getTime();
    });

    // Calculate overall summary
    const overallSummary: DailySummary = {
      totalOrders: orders.length,
      totalShippingCost: orders.reduce((sum, order) => sum + order.shippingCost, 0),
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalNetAmount: orders.reduce((sum, order) => sum + order.netTotal, 0),
      totalPaymentAmount: orders.reduce((sum, order) => sum + (order.payment.amount || 0), 0),
      totalCost: orders.reduce((sum, order) => sum + (order.profitSummary?.totalCost || 0), 0),
      totalGrossProfit: orders.reduce((sum, order) => sum + (order.profitSummary?.grossProfit || 0), 0),
      totalNetProfit: orders.reduce((sum, order) => sum + (order.profitSummary?.netProfit || 0), 0),
      totalWarehouseFees: orders.reduce((sum, order) => sum + (order.warehouseFees?.totalFees || 0), 0)
    };

    const response: ReportResponse = {
      dailyReports,
      summary: overallSummary,
      dateRange: {
        start: parsedStartDate,
        end: parsedEndDate
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error generating order report:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};