import mongoose, { Document, Schema } from 'mongoose';

export interface IPriceList extends Document {
 priceId: string;
 priceName: string;
 status: boolean;
 LIFF_ID?: string; // เพิ่ม LIFF_ID เป็น optional
 createdAt: Date;
 updatedAt: Date;
}

const priceListSchema = new Schema<IPriceList>({
 priceId: { type: String, required: true, unique: true },
 priceName: { type: String, required: true, unique: true },
 status: { type: Boolean, default: true },
 LIFF_ID: { type: String } // เพิ่ม field LIFF_ID
}, {
 timestamps: true,
 collection: 'tbl_store_price_list'
});

export default mongoose.model<IPriceList>('PriceList', priceListSchema);