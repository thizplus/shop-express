// models/categoryModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  catId: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const categorySchema = new Schema({
  catId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  active: { type: Boolean, default: true }
}, { 
  timestamps: true,
  collection: 'tbl_categories'
});



const Category = mongoose.model<ICategory>('Category', categorySchema);

export default Category;