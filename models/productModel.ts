import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  id: number;
  __v: number;
  name: string;
  sku: string;
  stock: number;
  availablestock: number;
  imagepath: string | null;
  categoryid: number | null;
  category: string | null;
  active: boolean;
  price:number
  createdAt: Date;
  updatedAt: Date;
}



const productSchema = new Schema<IProduct>({
  id: { type: Number, required: true, unique: true },
  __v: { type: Number, default: 0 },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  stock: { type: Number, required: true },
  availablestock: { type: Number, required: true },
  imagepath: { type: String, default: null },
  categoryid: { type: Number, default: null },
  category: { type: String, default: null },
  active: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'tbl_products'
});

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;