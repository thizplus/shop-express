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

// controllers/orders/getOrderReport.ts
export const getOrderReport = async (req: Request, res: Response) => {
  try {
    const { startDate } = req.query;

    if (!startDate) {
      return res.status(400).json({ message: 'Start date is required' });
    }

    // แปลงวันที่เป็น UTC
    const selectedDate = new Date(startDate as string);
    
    // สร้างช่วงเวลาสำหรับวันที่เลือก (00:00:00 - 23:59:59)
    const startOfSelectedDate = new Date(selectedDate);
    startOfSelectedDate.setHours(0, 0, 0, 0);
    
    const endOfSelectedDate = new Date(selectedDate);
    endOfSelectedDate.setHours(23, 59, 59, 999);

    console.log('Query range:', {
      start: startOfSelectedDate.toISOString(),
      end: endOfSelectedDate.toISOString()
    });

    // ดึงข้อมูลออเดอร์
    const orders = await Order.find({
      createdAt: {
        $gte: startOfSelectedDate,
        $lte: endOfSelectedDate
      },
      'payment.status': 'success'
    }).sort({ createdAt: 1 });

    // สร้าง dailyReport สำหรับวันที่เลือก
    const dailyReport = {
      date: startOfSelectedDate.toISOString().split('T')[0],
      orders: orders.map(order => ({
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
      })),
      summary: {
        totalOrders: orders.length,
        totalShippingCost: orders.reduce((sum, order) => sum + order.shippingCost, 0),
        totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        totalNetAmount: orders.reduce((sum, order) => sum + order.netTotal, 0),
        totalPaymentAmount: orders.reduce((sum, order) => sum + (order.payment.amount || 0), 0)
      }
    };

    const response = {
      dailyReports: [dailyReport],
      summary: dailyReport.summary,
      dateRange: {
        start: startOfSelectedDate,
        end: endOfSelectedDate
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Error generating order report:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Internal server error', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred' });
    }
  }
};