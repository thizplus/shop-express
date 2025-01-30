// models/customerPointModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICustomerPoint extends Document {
  customerId: string;
  points: number;          // แต้มคงเหลือ
  totalEarnedPoints: number; // แต้มที่เคยได้รับทั้งหมด
  totalUsedPoints: number;   // แต้มที่ใช้ไปแล้วทั้งหมด
  createdAt: Date;
  updatedAt: Date;
}

const customerPointSchema = new Schema<ICustomerPoint>({
    customerId: {
      type: String,  // เปลี่ยนจาก ObjectId เป็น String
      required: true,
      unique: true
    },
    points: {
      type: Number,
      default: 0,
      min: 0
    },
    totalEarnedPoints: {
      type: Number,
      default: 0,
      min: 0
    },
    totalUsedPoints: {
      type: Number,
      default: 0,
      min: 0
    }
  }, {
    timestamps: true,
    collection: 'tbl_customer_points'
  });

customerPointSchema.index({ customerId: 1 });

export default mongoose.model<ICustomerPoint>('CustomerPoint', customerPointSchema);