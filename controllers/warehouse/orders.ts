import { Request, Response } from 'express';
import axios from 'axios';
import Order,{ IOrder }  from '../../models/orderModel';
import dotenv from 'dotenv';
dotenv.config();

export const sendOrderToWarehouse = async (req: Request, res: Response) => {
  try {
    const orderData: IOrder = {
      ...req.body.orderData,
      shopName: process.env.SHOP_NAME || 'default_shop' // เพิ่ม shopName
    };
     
   // console.log('Sending order to store:', JSON.stringify(orderData));
   // console.log('Shop - Request body:', req.body);
   // console.log('Shop - OrderData:', orderData);
    //console.log('Shop - Sending to URL:', `${process.env.STORE_API_URL}/api/orders/create`);


    try {
      // เปลี่ยนจาก Warehouse API เป็น store API
      const response = await axios.post(`${process.env.STORE_API_URL}/api/orders/create`, {
        orderData
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Store API response:', response.data);

      if (response.status === 201) {
        res.status(200).json({
          message: 'Order sent successfully',
          orderData: response.data.order
        });
      } else {
        throw new Error(`API returned an unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (axiosError) {
      if (axios.isAxiosError(axiosError)) {
        console.error('Axios error:', axiosError.response?.data);
        throw new Error(`API request failed: ${axiosError.message}`);
      } else {
        throw axiosError;
      }
    }
  } catch (error: unknown) {
    console.error('Error in sendOrderToWarehouse:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error sending order', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while sending order' });
    }
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

