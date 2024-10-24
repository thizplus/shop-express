// controllers/orders/getOrders.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';

export const getAdminOrders = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const items = await Order.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
    
    const totalItems = await Order.countDocuments();
    
    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const searchOrders = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '20' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (currentPage - 1) * limitNumber;

    const searchQuery = {
      $or: [
        { orderId: searchRegex },
        { 'shippingInfo.cusName': searchRegex },
        { 'shippingInfo.cusTel': searchRegex }
      ]
    };

    const items = await Order.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .exec();

    const totalItems = await Order.countDocuments(searchQuery);

    res.json({
      items,
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};