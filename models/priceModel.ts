import mongoose, { Document, Schema } from 'mongoose';

export interface IListPrice {
  priceId: string;
  priceName: string;
  price: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IPrice extends Document {
  sku: string;
  name: string;
  listPrice: IListPrice[];
  createdAt: Date;
  updatedAt: Date;
}

const listPriceSchema = new Schema<IListPrice>({
  priceId: { type: String, required: true },
  priceName: { type: String, required: true },
  price: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const priceSchema = new Schema<IPrice>({
  sku: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  listPrice: [listPriceSchema]
}, 
{ 
  timestamps: true,
  collection: 'tbl_store_price'
});

export default mongoose.model<IPrice>('Price', priceSchema);