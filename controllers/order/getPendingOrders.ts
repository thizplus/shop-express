// controllers/orders/getPendingOrders.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';

export const getPendingOrders = async (req: Request, res: Response) => {
  try {
    const { userId, page = '1', limit = '10' } = req.query;
    const currentPage = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (currentPage - 1) * limitNumber;

    // สร้าง query object
    const queryObject: any = {
      'payment.status': 'pending',
      expire: { $gt: new Date() } // เช็คว่ายังไม่หมดเวลา
    };

    // ถ้ามี userId ให้เพิ่มเงื่อนไขการค้นหา
    if (userId) {
      queryObject.userId = userId;
    }

    const items = await Order.find(queryObject)
      .sort({ createdAt: -1 }) // เรียงจากใหม่ไปเก่า
      .skip(skip)
      .limit(limitNumber)
      .exec();

    const totalItems = await Order.countDocuments(queryObject);

    res.json({
      items,
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching pending orders:', error);
    res.status(500).json({ 
      message: 'Failed to fetch pending orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ฟังก์ชันสำหรับดึง pending order ล่าสุดของ user
export const getLatestPendingOrder = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const order = await Order.findOne({
      userId,
      'payment.status': 'pending',
      expire: { $gt: new Date() }
    })
      .sort({ createdAt: -1 }) // เรียงจากใหม่ไปเก่า
      .exec();

    if (!order) {
      return res.json({ order: null });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error fetching latest pending order:', error);
    res.status(500).json({ 
      message: 'Failed to fetch latest pending order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};