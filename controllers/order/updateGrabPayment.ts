// controllers/order/updateGrabPayment.ts 
import { Request, Response } from 'express';
import Order from '../../models/orderModel';
import dotenv from 'dotenv';
dotenv.config();

export const updateGrabPayment = async (req: Request, res: Response) => {
 try {
   const { orderId } = req.params;
   const { amount, status, note } = req.body;

   const order = await Order.findByIdAndUpdate(
     orderId,
     {
       $set: {
         'grabPayment.status': status,
         'grabPayment.amount': amount,
         'grabPayment.note': note,
         'grabPayment.updatedAt': new Date()
       }
     },
     { new: true }
   );

   if (!order) {
     return res.status(404).json({ message: 'Order not found' });
   }

   // Send Line Flex Message after successful update
   try {
     await fetch(`${process.env.BASE_URL}/api/line/flexMessage/grab-payment`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         orderId: order.orderId,
         userId: order.userId,
         cusName: order.shippingInfo.cusName,
         amount,
         status,
         note
       })
     });
   } catch (error) {
     console.error('Error sending Line Flex Message:', error);
     // Don't return error, just log it since the main update was successful
   }

   res.json({ message: 'Updated successfully', order });

 } catch (error) {
   console.error('Error updating grab payment:', error);
   res.status(500).json({ 
     message: 'Internal server error',
     error: error instanceof Error ? error.message : 'Unknown error' 
   });
 }
};