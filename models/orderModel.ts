import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  typeOrder: 'store' | 'shop';
  typeId: string;
  userId: string;
  listProducts: Array<{
    sku: string;
    name: string;
    price: number;
    qty: number;
    total: number;
  }>;
  shippingInfo: {
    _id: string;
    cusName: string;
    cusTel: string;
    addressNo: string;
    district: string;
    amphoe: string;
    province: string;
    zipcode: string;
    isDefault: boolean;
    // เพิ่ม tracking information
    trackingNo?: string;
    shippingChannel?: string;
    trackingUpdateAt?: Date;
  };
  shippingCost: number;
  totalAmount: number;
  netTotal: number;
  expire: Date;
  payment: {
    status: 'pending' | 'success' | 'cancelled';
    amount: number;
    slip: Array<{
      url: string;
      amount: number;
      uploadedAt: Date;
    }>;
  };
  zortoutId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true },
  typeOrder: { type: String, enum: ['store', 'shop'], required: true },
  typeId: { type: String, required: true },
  userId: { type: String, required: true },
  listProducts: [{
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true },
    total: { type: Number, required: true }
  }],
  shippingInfo: {
    _id: { type: String, required: true },
    cusName: { type: String, required: true },
    cusTel: { type: String, required: true },
    addressNo: { type: String, required: true },
    district: { type: String, required: true },
    amphoe: { type: String, required: true },
    province: { type: String, required: true },
    zipcode: { type: String, required: true },
    isDefault: { type: Boolean, required: true },
    // เพิ่ม tracking information โดยไม่ต้อง required
    trackingNo: { type: String },
    shippingChannel: { type: String },
    trackingUpdateAt: { type: Date }
  },
  shippingCost: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  netTotal: { type: Number, required: true },
  expire: { type: Date, required: true },
  payment: {
    status: { type: String, enum: ['pending', 'success', 'cancelled'], default: 'pending' },
    amount: { type: Number, default: 0 },
    slip: [{
      url: { type: String, required: true },
      amount: { type: Number, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  zortoutId: { type: String }
}, { 
  timestamps: true,
  collection: 'tbl_orders'
});

export default mongoose.model<IOrder>('Order', OrderSchema);