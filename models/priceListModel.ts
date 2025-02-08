// models/priceListModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceList extends Document {
  priceId: string;
  priceName: string;
  status: boolean;
  LIFF_ID?: string;
  allowedUsers: string[]; // เพิ่ม allowedUsers
  createdAt: Date;
  updatedAt: Date;
}

const priceListSchema = new Schema<IPriceList>({
    priceId: { type: String, required: true, unique: true },
    priceName: { type: String, required: true },  // ลบ unique ออกถ้าไม่จำเป็น
    status: { type: Boolean, default: true },
    LIFF_ID: { type: String },
    allowedUsers: { 
      type: [String],
      default: []  // เพิ่ม default เป็น array เปล่า
    },
  }, {
    timestamps: true,
    collection: 'tbl_store_price_list'
  });

// Index for performance
priceListSchema.index({ priceId: 1, allowedUsers: 1 });

export default mongoose.model<IPriceList>('PriceList', priceListSchema);