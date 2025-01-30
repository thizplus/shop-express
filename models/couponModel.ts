// models/couponModel.ts 
import mongoose, { Document, Schema } from 'mongoose';

export enum DiscountType {
  CART = 'cart',         // ส่วนลดจากตะกร้าสินค้า
  SHIPPING = 'shipping'  // ส่วนลดค่าจัดส่ง
}

export interface ICoupon extends Document {
  code: string;              // รหัสคูปอง
  type: DiscountType;        // ประเภทส่วนลด
  value: number;             // มูลค่าส่วนลด
  isPercent: boolean;        // true = ลดเป็นเปอร์เซ็นต์, false = ลดเป็นจำนวนเงิน
  maxDiscount?: number;      // จำนวนเงินส่วนลดสูงสุด (กรณีลดเป็นเปอร์เซ็นต์)
  minPurchase?: number;      // ยอดซื้อขั้นต่ำที่สามารถใช้คูปองได้
  startDate: Date;           // วันที่เริ่มใช้งาน
  endDate: Date;            // วันที่หมดอายุ
  isActive: boolean;        // สถานะการใช้งาน
  usageLimit: number;       // จำนวนครั้งที่สามารถใช้ได้ทั้งหมด
  usageCount: number;       // จำนวนครั้งที่ถูกใช้ไปแล้ว
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>({
  code: { 
    type: String, 
    required: true, 
    unique: true, 
    uppercase: true 
  },
  type: { 
    type: String, 
    enum: Object.values(DiscountType), 
    required: true 
  },
  value: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  isPercent: { 
    type: Boolean, 
    required: true 
  },
  maxDiscount: { 
    type: Number, 
    min: 0 
  },
  minPurchase: { 
    type: Number, 
    min: 0 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  usageLimit: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  usageCount: { 
    type: Number, 
    default: 0, 
    min: 0 
  }
}, {
  timestamps: true,
  collection: 'tbl_coupons'
});

// Index for faster queries
couponSchema.index({ code: 1 });
couponSchema.index({ startDate: 1, endDate: 1 });
couponSchema.index({ isActive: 1 });

export default mongoose.model<ICoupon>('Coupon', couponSchema);