import { Request, Response } from 'express';
import axios from 'axios';
import Order,{ IOrder }  from '../../models/orderModel';
import dotenv from 'dotenv';
dotenv.config();

export const sendOrderToWarehouse = async (req: Request, res: Response) => {
  try {
    const orderData: IOrder = {
      ...req.body.orderData,
      shopName: process.env.SHOP_NAME || 'default_shop'
    };

    console.log('Sending order to warehouse:', {
      url: `${process.env.STORE_API_URL}/api/orders/create`,
      orderData
    });

    const response = await axios.post(
      `${process.env.STORE_API_URL}/api/orders/create`, 
      { orderData },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      }
    );

    console.log('Warehouse response:', response.data);

    res.status(200).json({
      success: true,
      message: 'Order sent successfully',
      order: response.data.order
    });

  } catch (error) {
    console.error('Detailed error in sendOrderToWarehouse:', {
      error,
      orderData: req.body.orderData,
      storeUrl: process.env.STORE_API_URL
    });

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};


export const voidOrderToWarehouse = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    // ค้นหา order จากฐานข้อมูล
    const order = await Order.findOne({ orderId: orderId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    try {
      // ส่งคำสั่งยกเลิกไปที่ store แทน
      const storeUrl = process.env.STORE_API_URL?.replace(/\/+$/, '');
      const response = await axios.post(`${storeUrl}/api/orders/${orderId}/void`, {
        orderId
      });

      console.log('Store void order response:', response.data);

      // อัปเดตสถานะของ order ในฐานข้อมูล shop
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId: orderId },
        { 
          $set: { 
            'payment.status': 'cancelled'
          }
        },
        { new: true }
      );

      if (!updatedOrder) {
        throw new Error('Failed to update order status in database');
      }

      res.status(200).json({
        message: 'Order voided successfully',
        updatedOrder: {
          orderId: updatedOrder.orderId,
          status: updatedOrder.payment.status
        }
      });

    } catch (axiosError) {
      if (axios.isAxiosError(axiosError)) {
        console.error('Axios error:', axiosError.response?.data);
        throw new Error(`Store API request failed: ${axiosError.message}`);
      } else {
        throw axiosError;
      }
    }
  } catch (error: unknown) {
    console.error('Error in voidOrderToWarehouse:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error voiding order', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while voiding order' });
    }
  }
};

