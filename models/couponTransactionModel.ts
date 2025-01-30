// models/couponTransactionModel.ts
import mongoose, { Schema, Document } from 'mongoose';

interface ICouponTransaction extends Document {
  couponId: string;
  userId: string;
  orderId: string;
  discountAmount: number;
  usedAt: Date;
}

const couponTransactionSchema = new Schema({
  couponId: { type: String, required: true },
  userId: { type: String, required: true },
  orderId: { type: String, required: true },
  discountAmount: { type: Number, required: true },
  usedAt: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'tbl_coupon_transactions'
});

export default mongoose.model<ICouponTransaction>('CouponTransaction', couponTransactionSchema);