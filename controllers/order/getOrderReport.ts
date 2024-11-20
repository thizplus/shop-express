// controllers/orders/getOrderReport.ts
import { Request, Response } from 'express';
import Order, { IOrder } from '../../models/orderModel';
import { startOfDay, endOfDay, addHours } from 'date-fns';

interface DailySummary {
  totalOrders: number;
  totalShippingCost: number;
  totalAmount: number;
  totalNetAmount: number;
  totalPaymentAmount: number;
}

interface OrderDetail {
  orderId: string;
  customerName: string;
  shippingCost: number;
  totalAmount: number;
  netTotal: number;
  status: string;
  createdAt: string;
  payment: {
    amount: number;
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

    // แปลงเวลาเป็น UTC สำหรับ query MongoDB
    const thaiOffset = 7;
    const startUtc = new Date(startDate as string);
    const endUtc = new Date(endDate as string);

    const start = startOfDay(addHours(startUtc, -thaiOffset));
    const end = endOfDay(addHours(endUtc, -thaiOffset));

    console.log('Query date range:', {
      start: start.toISOString(),
      end: end.toISOString()
    });

    // ดึงข้อมูลออเดอร์
    const orders = await Order.find({
      createdAt: {
        $gte: start,
        $lte: end
      },
      'payment.status': 'success' 
    }).sort({ createdAt: 1 });

    // จัดกลุ่มข้อมูลตามวันที่ไทย
    const dailyReports = orders.reduce<{ [key: string]: DailyReport }>((acc, order) => {
      // แปลงเวลาเป็นเวลาไทย
      const orderDate = addHours(new Date(order.createdAt), thaiOffset);
      const dateKey = orderDate.toISOString().split('T')[0];
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          orders: [],
          summary: {
            totalOrders: 0,
            totalShippingCost: 0,
            totalAmount: 0,
            totalNetAmount: 0,
            totalPaymentAmount: 0
          }
        };
      }

      // เพิ่มข้อมูลออเดอร์
      acc[dateKey].orders.push({
        orderId: order.orderId,
        customerName: order.shippingInfo.cusName,
        shippingCost: order.shippingCost,
        totalAmount: order.totalAmount,
        netTotal: order.netTotal,
        status: order.payment.status,
        createdAt: order.createdAt.toISOString(),
        payment: {
          amount: order.payment.amount || 0
        }
      });

      // อัพเดทสรุป
      acc[dateKey].summary.totalOrders += 1;
      acc[dateKey].summary.totalShippingCost += order.shippingCost;
      acc[dateKey].summary.totalAmount += order.totalAmount;
      acc[dateKey].summary.totalNetAmount += order.netTotal;
      acc[dateKey].summary.totalPaymentAmount += (order.payment.amount || 0);

      return acc;
    }, {});

    // คำนวณสรุปรวม
    const overallSummary: DailySummary = {
      totalOrders: orders.length,
      totalShippingCost: orders.reduce((sum, order) => sum + order.shippingCost, 0),
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalNetAmount: orders.reduce((sum, order) => sum + order.netTotal, 0),
      totalPaymentAmount: orders.reduce((sum, order) => sum + (order.payment.amount || 0), 0)
    };

    // แปลงเวลาในการตอบกลับเป็นเวลาไทย
    const responseStart = addHours(start, thaiOffset);
    const responseEnd = addHours(end, thaiOffset);

    const response: ReportResponse = {
      dailyReports: Object.values(dailyReports),
      summary: overallSummary,
      dateRange: {
        start: responseStart,
        end: responseEnd
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error generating order report:', error);
    if (error instanceof Error) {
      res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message 
      });
    } else {
      res.status(500).json({ 
        message: 'An unknown error occurred' 
      });
    }
  }
};