// controllers/client/clientCouponController.ts
import { Request, Response } from 'express';
import Coupon from '../../models/couponModel';
import CouponTransaction from '../../models/couponTransactionModel';

export const getAvailableCoupons = async (req: Request, res: Response) => {
  const { amount, userId } = req.query;
    
  try {
    if (!amount || !userId) {
      return res.status(400).json({ error: 'Missing parameters' });
    }

    const coupons = await Coupon.aggregate([
      {
        $match: {
          isActive: true,
          startDate: { $lte: new Date() },
          endDate: { $gte: new Date() },
          $or: [
            { minPurchase: { $exists: false } },
            { minPurchase: { $lte: Number(amount) } }
          ]
        }
      }
    ]);

    // หา transactions ของ user นี้
    const transactions = await CouponTransaction.aggregate([
      {
        $match: { 
          userId: userId.toString()
        }
      },
      {
        $group: {
          _id: '$couponId',
          userUsageCount: { $sum: 1 }
        }
      }
    ]);

    // กรอง coupons ที่ user ยังใช้ไม่เกิน limit
    const availableCoupons = coupons.filter(coupon => {
      const userUsage = transactions.find(t => t._id.toString() === coupon._id.toString());
      return !userUsage || userUsage.userUsageCount < coupon.usageLimit;
    });

    res.json({
      success: true,
      data: availableCoupons
    });

  } catch (error) {
    console.error('getAvailableCoupons error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// บันทึกการใช้คูปอง
export const applyCoupon = async (req: Request, res: Response) => {
    const { couponId, orderId, userId, amount } = req.body;
  
    try {
      const coupon = await Coupon.findOne({ code: couponId });
      if (!coupon) {
        return res.status(404).json({ success: false, error: 'Coupon not found' });
      }
  
      const existingTransaction = await CouponTransaction.findOne({ orderId });
      if (existingTransaction) {
        return res.status(400).json({ success: false, error: 'Order already has coupon applied' });
      }
  
      await CouponTransaction.create({
        couponId: coupon._id,
        userId,
        orderId,
        discountAmount: amount
      });
  
      await Coupon.findByIdAndUpdate(coupon._id, { $inc: { usageCount: 1 } });
  
      res.json({ success: true });
  
    } catch (error) {
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };