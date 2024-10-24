import { Request, Response } from 'express';
import Order, { IOrder } from '../../models/orderModel';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const orderData: IOrder = req.body;
    
    // สร้าง Order ใหม่
    const newOrder = new Order(orderData);
    
    // บันทึกลงในฐานข้อมูล
    await newOrder.save();
    
    res.status(201).json({ message: 'Order created successfully', order: newOrder });
  } catch (error: unknown) {
    console.error('Error creating order:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error creating order', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while creating the order' });
    }
  }
};

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.status(200).json(order);
  } catch (error: unknown) {
    console.error('Error fetching order:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error fetching order', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while fetching the order' });
    }
  }
};


export const getOrders = async (req: Request, res: Response) => {
  try {
    const userId: string = req.query.userId as string;
    const typeId: string = req.query.typeId as string;
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 10;
    const skip: number = (page - 1) * limit;

    if (!userId || !typeId) {
      return res.status(400).json({ message: 'userId and typeId are required' });
    }

    const items: IOrder[] = await Order.find({ userId, typeId })
      .sort({ createdAt: -1 }) // สั่งจากใหม่ไปเก่า
      .skip(skip)
      .limit(limit)
      .exec();
    
    const totalItems: number = await Order.countDocuments({ userId, typeId });
    
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


export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;
    const { slipUrl, verifyResult } = req.body;

    if (!orderId || !slipUrl || !verifyResult) {
      res.status(400).json({ message: 'orderId, slipUrl, and verifyResult are required' });
      return;
    }

    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const slipAmount = verifyResult.data.amount;
    const newTotalPaid = (order.payment.amount || 0) + slipAmount;
    const newStatus = newTotalPaid >= order.netTotal ? 'success' : 'pending';

    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      { 
        $set: {
          'payment.status': newStatus,
          'payment.amount': newTotalPaid,
        },
        $push: {
          'payment.slip': {
            url: slipUrl,
            amount: slipAmount,
            uploadedAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!updatedOrder) {
      res.status(500).json({ message: 'Failed to update order' });
      return;
    }

    res.status(200).json({ 
      message: 'Payment status updated successfully', 
      order: updatedOrder,
      fullyPaid: newStatus === 'success'
    });
  } catch (error: unknown) {
    console.error('Error updating payment status:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error updating payment status', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while updating payment status' });
    }
  }
};