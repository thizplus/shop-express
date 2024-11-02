// controllers/orders/getPendingOrders.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';

export const getPendingOrders = async (req: Request, res: Response) => {
  try {
    const { userId, typeId, page = '1', limit = '10' } = req.query;
    const currentPage = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (currentPage - 1) * limitNumber;

    // สร้าง query object
    const queryObject: any = {
      'payment.status': 'pending',
      expire: { $gt: new Date() }
    };

    // เพิ่ม filters ถ้ามีการส่งมา
    if (userId) queryObject.userId = userId;
    if (typeId) queryObject.typeId = typeId;

    console.log('Query:', queryObject);

    const items = await Order.find(queryObject)
      .sort({ createdAt: -1 })
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

export const getLatestPendingOrder = async (req: Request, res: Response) => {
  try {
    const { userId, typeId } = req.params;
    console.log('Getting latest pending order:', { userId, typeId });

    if (!userId || !typeId) {
      console.log('Missing required params');
      return res.status(400).json({ message: 'userId and typeId are required' });
    }

    const query = {
      userId,
      typeId,
      'payment.status': 'pending',
      expire: { $gt: new Date() }
    };

    console.log('Query:', query);

    const order = await Order.findOne(query)
      .sort({ createdAt: -1 })
      .exec();

    console.log('Found order:', order ? 'Yes' : 'No');

    if (!order) {
      return res.json({ order: null });
    }

    res.json({ order });
  } catch (error) {
    console.error('Error in getLatestPendingOrder:', error);
    res.status(500).json({ 
      message: 'Failed to fetch latest pending order',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};