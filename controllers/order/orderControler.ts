import { Request, Response } from 'express';
import Order, { IOrder } from '../../models/orderModel';
import { addPointFromOrder } from '../point/pointTransactionController';
import PointSetting from '../../models/pointSettingModel'; 

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


// Function สำหรับส่งข้อมูลไปคลังสินค้า
const updatePaymentToStorage = async (orderData: any): Promise<void> => {
  try {
    const { payment, orderId } = orderData;
    const url = `${process.env.STORE_API_URL}/api/orders/${orderId}/payment`;
    
    console.log('Sending payment update to storage:', {
      url,
      orderId,
      payment
    });

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        payment
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Storage API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      throw new Error(`Failed to update payment in storage: ${response.status} ${errorData}`);
    }

    const result = await response.json();
    console.log('Storage update success:', result);

  } catch (error) {
    console.error('Error updating payment in storage:', error);
    throw error;
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
 
    // เพิ่มการส่งข้อมูลไปคลังสินค้า
    try {
      await updatePaymentToStorage(updatedOrder);
    } catch (storageError) {
      console.error('Failed to update storage:', storageError);
      // ไม่ return error เพราะอัพเดทฝั่งร้านค้าสำเร็จแล้ว
    }
 
    // เพิ่มพอยต์เมื่อชำระเงินครบ 
    if (newStatus === 'success') {
      try {
        const pointSetting = await PointSetting.findOne();
        
        if (!pointSetting || !pointSetting.isActive) {
          res.status(200).json({
            message: 'Payment status updated successfully (Point system is inactive)',
            order: updatedOrder,  
            fullyPaid: true,
            pointsEarned: 0
          });
          return;
        }
 
        const pointResult = await addPointFromOrder(
          orderId,
          order.userId, 
          order.totalAmount
        );
 
        res.status(200).json({
          message: 'Payment status updated successfully',
          order: updatedOrder,
          fullyPaid: true,
          pointsEarned: pointResult?.points || 0,
          pointRate: pointSetting.pointsPerBaht
        });
 
      } catch (pointError) {
        console.error('Error adding points:', pointError);
        res.status(200).json({
          message: 'Payment status updated but failed to add points',
          order: updatedOrder,
          fullyPaid: true, 
          pointError: pointError instanceof Error ? pointError.message : 'Unknown error adding points'
        });
      }
    } else {
      res.status(200).json({
        message: 'Payment status updated successfully',
        order: updatedOrder,
        fullyPaid: false
      });
    }
 
  } catch (error: unknown) {
    console.error('Error updating payment status:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error updating payment status', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while updating payment status' });
    }
  }
 };