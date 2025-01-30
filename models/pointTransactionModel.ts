// models/pointTransactionModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum PointTransactionType {
  EARNED = 'earned',     // ได้รับแต้ม
  USED = 'used'         // ใช้แต้ม
}

export interface IPointTransaction extends Document {
  customerId: string;
  type: PointTransactionType;
  points: number;
  orderId?: mongoose.Types.ObjectId;  // อ้างอิงออเดอร์ (ถ้ามี)
  couponId?: mongoose.Types.ObjectId; // อ้างอิงคูปองที่แลก (ถ้ามี)
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

const pointTransactionSchema = new Schema<IPointTransaction>({
    customerId: {
      type: String,  // เปลี่ยนจาก ObjectId เป็น String
      required: true
    },
    type: {
      type: String,
      enum: Object.values(PointTransactionType),
      required: true
    },
    points: {
      type: Number,
      required: true
    },
    orderId: {
      type: String,  // เปลี่ยนเป็น String เพราะ orderId เป็น WB-xxxxxx
      ref: 'Order'
    },
    couponId: {
      type: Schema.Types.ObjectId,  // อันนี้คงเป็น ObjectId
      ref: 'Promotion'
    },
    description: {
      type: String,
      required: true
    }
  }, {
    timestamps: true,
    collection: 'tbl_point_transactions'
  });

pointTransactionSchema.index({ customerId: 1, createdAt: -1 });

export default mongoose.model<IPointTransaction>('PointTransaction', pointTransactionSchema);