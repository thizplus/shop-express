// models/pointSettingModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPointSetting extends Document {
  isActive: boolean;           // เปิด/ปิด ระบบ
  pointsPerBaht: number;      // จำนวนแต้มต่อเงิน 1 บาท (เช่น 0.1 = 10 บาทได้ 1 แต้ม)
  createdAt: Date;
  updatedAt: Date;
}

const pointSettingSchema = new Schema<IPointSetting>({
  isActive: {
    type: Boolean,
    default: false
  },
  pointsPerBaht: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true,
  collection: 'tbl_point_settings'
});

export default mongoose.model<IPointSetting>('PointSetting', pointSettingSchema);