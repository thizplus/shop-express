// models/categoryModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  __v: number;
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema<ICategory>({
  id: { type: String, required: true, unique: true },
  __v: { type: Number, default: 0 },
  name: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'tbl_categories'
});

const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;