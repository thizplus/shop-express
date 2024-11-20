// controllers/orders/getOrderReport.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';
import { startOfDay, endOfDay, parseISO } from 'date-fns';
import { format } from 'date-fns-tz';


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
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // แปลงวันที่เป็น UTC ตามที่เก็บใน MongoDB
    const parsedStartDate = new Date(startDate as string);
    const parsedEndDate = new Date(endDate as string);

    // Query MongoDB ด้วยเวลา UTC
    const orders = await Order.find({
      createdAt: {
        $gte: parsedStartDate,
        $lte: parsedEndDate
      },
      'payment.status': 'success'
    }).sort({ createdAt: 1 });

    console.log('Query UTC range:', {
      start: parsedStartDate.toISOString(),
      end: parsedEndDate.toISOString()
    });

    // จัดกลุ่มตามวันที่
    const ordersByDate = orders.reduce<{ [key: string]: any }>((acc, order) => {
      // แปลง UTC เป็นเวลาไทยสำหรับการแสดงผล
      const orderDate = new Date(order.createdAt);
      
      // Format วันที่แบบไทย
      const dateKey = orderDate.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format เวลา
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
        createdAt: fullDateTimeStr,
        payment: {
          amount: order.payment.amount || 0
        }
      });

      // อัพเดทสรุปรายวัน
      acc[dateKey].summary.totalOrders += 1;
      acc[dateKey].summary.totalShippingCost += order.shippingCost;
      acc[dateKey].summary.totalAmount += order.totalAmount;
      acc[dateKey].summary.totalNetAmount += order.netTotal;
      acc[dateKey].summary.totalPaymentAmount += (order.payment.amount || 0);

      return acc;
    }, {});

    // แปลง object เป็น array และจัดเรียงตามวันที่
    const dailyReports = Object.values(ordersByDate).sort((a: any, b: any) => {
      const dateA = new Date(a.orders[0].createdAt.replace(/[^\d\s:]/g, ''));
      const dateB = new Date(b.orders[0].createdAt.replace(/[^\d\s:]/g, ''));
      return dateA.getTime() - dateB.getTime();
    });

    // คำนวณสรุปรวม
    const overallSummary = {
      totalOrders: orders.length,
      totalShippingCost: orders.reduce((sum, order) => sum + order.shippingCost, 0),
      totalAmount: orders.reduce((sum, order) => sum + order.totalAmount, 0),
      totalNetAmount: orders.reduce((sum, order) => sum + order.netTotal, 0),
      totalPaymentAmount: orders.reduce((sum, order) => sum + (order.payment.amount || 0), 0)
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