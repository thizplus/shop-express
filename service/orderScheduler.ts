import schedule from 'node-schedule';
import axios from 'axios';
import Order from '../models/orderModel';
import { schedulerLogger } from './logger';

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

  private async voidOrderInZortout(orderId: string, zortoutId: string): Promise<boolean> {
    try {
      const storeName = process.env.ZORTOUT_STORENAME;
      const apiKey = process.env.ZORTOUT_APIKEY;
      const apiSecret = process.env.ZORTOUT_APISECRET;

      if (!storeName || !apiKey || !apiSecret) {
        schedulerLogger.error('Zortout credentials are missing');
        return false;
      }

      schedulerLogger.info(`Attempting to void order in Zortout`, { orderId, zortoutId });

      const response = await axios.post(
        `https://open-api.zortout.com/v4/Order/VoidOrder?id=${zortoutId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'storename': storeName,
            'apikey': apiKey,
            'apisecret': apiSecret
          }
        }
      );

      if (response.status === 200 && response.data.resCode === "200") {
        schedulerLogger.info(`Successfully voided order in Zortout`, { orderId, zortoutId });
        return true;
      } else {
        schedulerLogger.error(`Failed to void order in Zortout`, {
          orderId,
          zortoutId,
          response: response.data
        });
        return false;
      }
    } catch (error) {
      schedulerLogger.error(`Error voiding order in Zortout`, {
        orderId,
        zortoutId,
        error
      });
      return false;
    }
  }

  private async checkExpiredOrders(): Promise<void> {
    const now = new Date();
    
    try {
      const expiredOrders = await Order.find({
        expire: { $lt: now },
        'payment.status': 'pending'
      });

      schedulerLogger.info(`Found ${expiredOrders.length} expired orders to process`);
      
      for (const order of expiredOrders) {
        schedulerLogger.info(`Processing expired order`, {
          orderId: order.orderId,
          expireDate: order.expire
        });

        try {
          if (order.zortoutId) {
            schedulerLogger.info(`Voiding order in Zortout`, {
              orderId: order.orderId,
              zortoutId: order.zortoutId
            });

            const voidSuccess = await this.voidOrderInZortout(order.orderId, order.zortoutId);
            if (!voidSuccess) {
              schedulerLogger.error(`Skipping order cancellation due to Zortout void failure`, {
                orderId: order.orderId
              });
              continue;
            }
          }

          await Order.updateOne(
            { _id: order._id },
            { $set: { 'payment.status': 'cancelled' } }
          );

          schedulerLogger.info(`Successfully cancelled order`, {
            orderId: order.orderId,
            originalExpireDate: order.expire
          });
        } catch (error) {
          schedulerLogger.error(`Error processing expired order`, {
            orderId: order.orderId,
            error
          });
        }
      }
    } catch (error) {
      schedulerLogger.error('Error in checkExpiredOrders', { error });
      throw error;
    }
  }

  public async checkSingleOrder(orderId: string): Promise<void> {
    schedulerLogger.info(`Checking single order`, { orderId });

    try {
      const order = await Order.findOne({ orderId });
      if (!order) {
        schedulerLogger.warn(`Order not found`, { orderId });
        return;
      }

      if (order.expire < new Date() && order.payment.status === 'pending') {
        schedulerLogger.info(`Order expired and pending, processing cancellation`, { orderId });

        if (order.zortoutId) {
          const voidSuccess = await this.voidOrderInZortout(order.orderId, order.zortoutId);
          if (!voidSuccess) {
            schedulerLogger.error(`Skipping order cancellation due to Zortout void failure`, { orderId });
            return;
          }
        }

        await Order.updateOne(
          { orderId },
          { $set: { 'payment.status': 'cancelled' } }
        );

        schedulerLogger.info(`Successfully cancelled single order`, { orderId });
      }
    } catch (error) {
      schedulerLogger.error(`Error checking single order`, { orderId, error });
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