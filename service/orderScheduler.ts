import schedule from 'node-schedule';
import axios from 'axios';
import Order from '../models/orderModel';
import { schedulerLogger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = process.env.BASE_URL;

export class OrderScheduler {
 private static instance: OrderScheduler;
 private job: schedule.Job;
 private isRunning: boolean = false;

 private constructor() {
   schedulerLogger.info('Initializing OrderScheduler');
   this.job = schedule.scheduleJob('*/1 * * * *', async () => {
     if (this.isRunning) {
       schedulerLogger.warn('Previous job still running, skipping this iteration');
       return;
     }

     this.isRunning = true;
     schedulerLogger.info('Starting scheduled order check');
     
     try {
       await this.checkExpiredOrders();
     } catch (error) {
       schedulerLogger.error('Error in scheduled order check:', { error });
     } finally {
       this.isRunning = false;
       schedulerLogger.info('Completed scheduled order check');
     }
   });
 }

 public static getInstance(): OrderScheduler {
   if (!OrderScheduler.instance) {
     OrderScheduler.instance = new OrderScheduler();
   }
   return OrderScheduler.instance;
 }

 private async checkExpiredOrders(): Promise<void> {
   const now = new Date();
   
   try {
     const expiredOrders = await Order.find({
       expire: { $lt: now },
       'payment.status': 'pending'
     });

     schedulerLogger.info(`Found ${expiredOrders.length} expired orders`);
     
     for (const order of expiredOrders) {
       try {
         await axios.post(`${API_URL}/api/warehouse/void-order`, {
           orderId: order.orderId
         });

         schedulerLogger.info(`Cancelled order: ${order.orderId}`);
       } catch (error) {
         schedulerLogger.error(`Error cancelling order ${order.orderId}:`, error);
       }
     }
   } catch (error) {
     schedulerLogger.error('Error in checkExpiredOrders:', error);
     throw error; 
   }
 }

 public async checkSingleOrder(orderId: string): Promise<void> {
   try {
     const order = await Order.findOne({ orderId });
     if (!order) {
       schedulerLogger.warn(`Order not found: ${orderId}`);
       return;
     }

     if (order.expire < new Date() && order.payment.status === 'pending') {
       await axios.post(`${API_URL}/api/warehouse/void-order`, {
         orderId
       });
       schedulerLogger.info(`Cancelled single order: ${orderId}`);
     }
   } catch (error) {
     schedulerLogger.error(`Error checking order ${orderId}:`, error);
     throw error;
   }
 }

 public stopScheduler(): void {
   if (this.job) {
     this.job.cancel();
     schedulerLogger.info('Order expiration scheduler stopped');
   }
 }
}

export const checkOrderExpiration = async (orderId: string): Promise<void> => {
 const scheduler = OrderScheduler.getInstance();
 await scheduler.checkSingleOrder(orderId);
};