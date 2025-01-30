// models/productModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  sku: string;
  stock: number;
  availablestock: number;
  imagepath: string | null;
  
  categories: Array<{
    catId: string;
    name: string;
  }>;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema({
  catId: { type: String, required: true },
  name: { type: String, required: true }
}, { _id: false });  

const productSchema = new Schema<IProduct>({
  name: { type: String, required: true },
  sku: { type: String, required: true },
  stock: { type: Number, required: true },
  availablestock: { type: Number, required: true },
  imagepath: { type: String, default: null },
  categories: [categorySchema], // ใช้ categorySchema แทน
  active: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'tbl_products'
});

productSchema.index({ sku: 1 });
productSchema.index({ 'categories.catId': 1 });
productSchema.index({ availablestock: 1 });

const Product = mongoose.model<IProduct>('Product', productSchema);

export default Product;