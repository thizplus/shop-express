// controllers/coupon/couponController.ts
import { Request, Response } from 'express';
import Coupon from '../../models/couponModel';

// สร้าง coupon ใหม่
export const createCoupon = async (req: Request, res: Response) => {
  try {
    const coupon = new Coupon(req.body);
    await coupon.save();
    res.status(201).json(coupon);
  } catch (error) {
    res.status(400).json({ 
      message: 'Error creating coupon',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


export const searchCoupon = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '20' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (currentPage - 1) * limitNumber;

    const searchQuery = {
      $or: [
        { code: searchRegex },

      ]
    };

    const items = await Coupon.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .exec();

    const totalItems = await Coupon.countDocuments(searchQuery);

    res.json({
      items,
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });
  } catch (error) {
    console.error('Error searching orders:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// ดึงข้อมูล promotions ทั้งหมด
export const getAllCoupons = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  try {
    const total = await Coupon.countDocuments();
    const promotions = await Coupon.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      items: promotions,
      pagination: {
        current: page,
        total: Math.ceil(total / limit),
        totalItems: total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching promotions' });
  }
};

// ตรวจสอบความถูกต้องของ coupon code
export const validateCoupon = async (req: Request, res: Response) => {
  try {
    const { code, cartTotal } = req.body;
    const coupon = await Coupon.findOne({ code, isActive: true });

    if (!coupon) {
      return res.status(404).json({ message: 'Coupon code not found' });
    }

    // ตรวจสอบวันหมดอายุ
    const now = new Date();
    if (now < coupon.startDate || now > coupon.endDate) {
      return res.status(400).json({ message: 'Coupon code is expired' });
    }

    // ตรวจสอบจำนวนการใช้งาน
    if (coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon code usage limit exceeded' });
    }

    // ตรวจสอบยอดขั้นต่ำ
    if (coupon.minPurchase && cartTotal < coupon.minPurchase) {
      return res.status(400).json({ 
        message: `Minimum purchase amount is ${coupon.minPurchase}` 
      });
    }

    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: 'Error validating coupon' });
  }
};


export const toggleCouponStatus = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // หา coupon ตาม id
      const coupon = await Coupon.findById(id);
      
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
  
      // toggle status
      coupon.isActive = !coupon.isActive;
      
      // บันทึกการเปลี่ยนแปลง
      await coupon.save();
  
      res.json(coupon);
    } catch (error) {
      res.status(500).json({ 
        message: 'Error toggling coupon status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };