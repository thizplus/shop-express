// controllers/syncOrderController.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';

// อัพเดท interface ให้รองรับทุก action
interface TrackingData {
  orderId: string;
  trackingNumber: string;
  shippingChannel: string;
  trackingUpdateAt: Date;
}

interface CancelOrderData {
  orderIds: string[];
  reason: string;
  cancelledAt: Date;
}

interface SyncRequest {
  action: 'update_tracking' | 'update_status' | 'cancel_order';
  source: string;
  payload: TrackingData[] | CancelOrderData; // เปลี่ยนจาก trackingData เป็น payload
}

export const syncOrderFromWarehouse = async (req: Request<{}, {}, SyncRequest>, res: Response) => {
  try {
    const { action, source, payload } = req.body;
    
    if (source !== 'warehouse') {
      return res.status(403).json({ message: 'Invalid source' });
    }
    
    switch (action) {
      case 'update_tracking': {
        if (!Array.isArray(payload)) {
          throw new Error('Invalid tracking data');
        }

        const trackingData = payload as TrackingData[];
        const updates = await Promise.all(
          trackingData.map(async (item) => {
            const order = await Order.findOneAndUpdate(
              { orderId: item.orderId },
              {
                $set: {
                  'shippingInfo.trackingNo': item.trackingNumber,
                  'shippingInfo.shippingChannel': item.shippingChannel,
                  'shippingInfo.trackingUpdateAt': item.trackingUpdateAt,
                }
              },
              { new: true }
            );
      
            return {
              orderId: item.orderId,
              success: !!order
            };
          })
        );
      
        console.log('Tracking updated for orders:', updates.map(u => u.orderId).join(', '));
        
        res.json({ 
          success: true,
          action,
          updates
        });
        break;
      }

      case 'cancel_order': {
        const cancelData = payload as CancelOrderData;
        
        // อัพเดทสถานะ orders เป็นยกเลิก
        const updates = await Promise.all(
            cancelData.orderIds.map(async (orderId) => {
                const order = await Order.findOneAndUpdate(
                    { orderId },
                    {
                        $set: {
                            'payment.status': 'cancelled',     // อัพเดทเฉพาะ payment.status
                            updatedAt: new Date()
                        }
                    },
                    { new: true }
                );
    
                return {
                    orderId,
                    success: !!order
                };
            })
        );
    
        console.log('Orders cancelled:', cancelData.orderIds.join(', '));
        
        res.json({
            success: true,
            action,
            updates
        });
        break;
    }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

  } catch (error) {
    console.error('Order sync failed:', error);
    res.status(500).json({ 
      error: 'Order sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};