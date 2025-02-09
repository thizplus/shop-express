// controllers/orders/getOrderReport.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { format } from 'date-fns-tz';

interface DailySummary {
  totalOrders: number;
  totalNetAmount: number;
  totalCost: number;
  totalNetProfit: number;
  totalWarehouseFees: number;
}

interface OrderDetail {
  orderId: string;
  customerName: string;
  netTotal: number;
  createdAt: string;
  profitInfo?: {
    totalCost: number;
    netProfit: number;
  };
  warehouseFees?: {
    totalFees: number;
  };
}

interface DailyReport {
  date: string;
  orders: OrderDetail[];
  summary: DailySummary;
}

interface ReportResponse {
  dailyReports: DailyReport[];
  summary: DailySummary;
  dateRange: {
    start: Date;
    end: Date;
  };
}

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

    const ordersByDate = orders.reduce<{ [key: string]: any }>((acc, order) => {
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
            totalNetAmount: 0,
            totalCost: 0,
            totalNetProfit: 0,
            totalWarehouseFees: 0
          }
        };
      }

      // คำนวณต้นทุนและค่าใช้จ่ายรวม
      const totalCost = order.profitSummary?.totalCost || 0;
      const warehouseFees = order.warehouseFees?.totalFees || 0;
      const totalExpense = totalCost + warehouseFees;
      
      // คำนวณกำไรสุทธิ - ถ้าไม่มีต้นทุน ให้กำไรเป็น 0
      const netProfit = totalCost === 0 ? 0 : (order.netTotal - totalExpense);

      // เพิ่มข้อมูลออเดอร์
      acc[dateKey].orders.push({
        orderId: order.orderId,
        customerName: order.shippingInfo.cusName,
        netTotal: order.netTotal,
        createdAt: fullDateTimeStr,
        profitInfo: {
          totalCost,
          netProfit
        },
        warehouseFees: order.warehouseFees
      });

      // อัพเดทสรุปรายวัน
      acc[dateKey].summary.totalOrders += 1;
      acc[dateKey].summary.totalNetAmount += order.netTotal;
      acc[dateKey].summary.totalCost += totalCost;
      acc[dateKey].summary.totalNetProfit += netProfit;
      acc[dateKey].summary.totalWarehouseFees += warehouseFees;

      return acc;
    }, {});

    const dailyReports = Object.values(ordersByDate).sort((a: any, b: any) => {
      const dateA = new Date(a.orders[0].createdAt.replace(/[^\d\s:]/g, ''));
      const dateB = new Date(b.orders[0].createdAt.replace(/[^\d\s:]/g, ''));
      return dateA.getTime() - dateB.getTime();
    });

    // คำนวณสรุปรวม
    const overallSummary = {
      totalOrders: orders.length,
      totalNetAmount: orders.reduce((sum, order) => sum + order.netTotal, 0),
      totalCost: orders.reduce((sum, order) => sum + (order.profitSummary?.totalCost || 0), 0),
      totalWarehouseFees: orders.reduce((sum, order) => sum + (order.warehouseFees?.totalFees || 0), 0),
      totalNetProfit: orders.reduce((sum, order) => {
        const totalCost = order.profitSummary?.totalCost || 0;
        if (totalCost === 0) return sum + 0;
        
        const totalExpense = totalCost + (order.warehouseFees?.totalFees || 0);
        return sum + (order.netTotal - totalExpense);
      }, 0)
    };

    const response: ReportResponse = {
      dailyReports: dailyReports as DailyReport[],
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