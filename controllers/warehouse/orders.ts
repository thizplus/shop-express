import { Request, Response } from 'express';
import axios from 'axios';
import Order,{ IOrder }  from '../../models/orderModel';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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

    //console.log('Warehouse response:', response.data);

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
  
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderId } = req.body;
  

    const order = await Order.findOne({ orderId });
    if (!order) {
   
      return res.status(404).json({ message: 'Order not found' });
    }
  

    // ส่งคำสั่งยกเลิกไปที่คลัง
    const warehouseUrl = process.env.STORE_API_URL?.replace(/\/+$/, '');
  

    const warehouseResponse = await axios.post(
      `${warehouseUrl}/api/orders/${orderId}/void`
    );
  
    if (!warehouseResponse.data.success) {
   
      throw new Error(`Warehouse void failed: ${warehouseResponse.data.message}`);
    }

   
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId },
      { 
        $set: { 
          'payment.status': 'cancelled'
        }
      },
      { new: true, session }
    );

    if (!updatedOrder) {
     
      throw new Error('Failed to update order status');
    }
 

    await session.commitTransaction();
   

    res.status(200).json({
      success: true,
      message: 'Order voided successfully',
      order: {
        orderId: updatedOrder.orderId,
        status: updatedOrder.payment.status
      }
    });

  } catch (error) {
    console.log('❌ Error occurred:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined
    });
    await session.abortTransaction();
    console.error('Error in voidOrderToWarehouse:', error);
    res.status(500).json({ 
      success: false,
      message: error instanceof Error ? error.message : 'Failed to void order'
    });
  } finally {
    session.endSession();
    console.log('Session ended');
  }
};
