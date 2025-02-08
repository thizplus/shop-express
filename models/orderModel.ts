import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
  orderId: string;
  warehouseOrderId: string;
  typeOrder: 'store' | 'shop';
  typeId: string;
  userId: string;
  listProducts: Array<{
    sku: string;
    name: string;
    price: number;      // ราคาขาย
    cost?: number;      // ราคาต้นทุน
    qty: number;
    total: number;      // ยอดขายรวม (price * qty)
    totalCost?: number; // ต้นทุนรวม (cost * qty)
    profit?: number;    // กำไรต่อชิ้น (price - cost)
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
    location?: string;
    isDefault: boolean;
    trackingNo?: string;
    trackingUpdateAt?: Date;
    shippingChannel?: string;
  };
  shippingCost: number;
  shippingMethod: 'standard' | 'grab';
  grabPayment?: {
    status: 'pending' | 'processing' | 'success';
    amount: number;
    updatedAt?: Date;
    paymentAt?: Date;
    note?: string;
  };
  subTotal: number;
  totalAmount: number;
  netTotal: number;
  expire: Date;
  coupon?: {
    code: string;
    type: 'cart' | 'shipping';
    value: number;
    isPercent: boolean;
    discountAmount: number;
  };
  discountAmount: number;
  payment: {
    status: 'pending' | 'success' | 'cancelled';
    amount: number;
    slip: Array<{
      url: string;
      amount: number;
      uploadedAt: Date;
    }>;
  };
  warehouseFees?: {
    shippingCost: number;    // ค่าจัดส่งที่คลังเรียกเก็บ
    serviceFee: number;      // ค่าบริการที่คลังเรียกเก็บ
    totalFees: number;       // รวมค่าใช้จ่ายทั้งหมด
  };
  profitSummary?: {
    totalCost: number;       // รวมต้นทุนสินค้าทั้งหมด
    grossProfit: number;     // กำไรขั้นต้น (totalAmount - totalCost)
    netProfit: number;       // กำไรสุทธิ (grossProfit - totalFees)
    updatedAt: Date;         // วันที่อัพเดทข้อมูลต้นทุนล่าสุด
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema: Schema = new Schema({
  orderId: { type: String, required: true, unique: true },
  warehouseOrderId: { type: String, required: true },
  typeOrder: { type: String, enum: ['store', 'shop'], required: true },
  typeId: { type: String, required: true },
  userId: { type: String, required: true },
  listProducts: [{
    sku: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    cost: { type: Number },
    qty: { type: Number, required: true },
    total: { type: Number, required: true },
    totalCost: { type: Number },
    profit: { type: Number }
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
    location: { type: String, required: false },
    isDefault: { type: Boolean, required: true },
    trackingNo: { type: String },
    shippingChannel: { type: String },
    trackingUpdateAt: { type: Date }
  },
  shippingCost: { type: Number, required: true },
  shippingMethod: { 
    type: String,
    enum: ['standard', 'grab'],
    required: true,
    default: 'standard'
  },
  grabPayment: {
    status: { 
      type: String,
      enum: ['pending', 'processing', 'success'],
      default: 'pending'
    },
    amount: { type: Number, default: 0 },
    updatedAt: { type: Date },
    paymentAt: { type: Date },
    note: { type: String }
  },
  subTotal: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  netTotal: { type: Number, required: true },
  expire: { type: Date, required: true },
  coupon: {
    code: { type: String },
    type: { type: String, enum: ['cart', 'shipping'] },
    value: { type: Number },
    isPercent: { type: Boolean },
    discountAmount: { type: Number }
  },
  discountAmount: { type: Number, default: 0 },
  payment: {
    status: { 
      type: String, 
      enum: ['pending', 'success', 'cancelled'], 
      default: 'pending' 
    },
    amount: { type: Number, default: 0 },
    slip: [{
      url: { type: String, required: true },
      amount: { type: Number, required: true },
      uploadedAt: { type: Date, default: Date.now }
    }]
  },
  warehouseFees: {
    shippingCost: { type: Number },
    serviceFee: { type: Number },
    totalFees: { type: Number }
  },
  profitSummary: {
    totalCost: { type: Number },
    grossProfit: { type: Number },
    netProfit: { type: Number },
    updatedAt: { type: Date }
  }
}, { 
  timestamps: true,
  collection: 'tbl_orders'
});

// Indexes
OrderSchema.index({ warehouseOrderId: 1 });
OrderSchema.index({ typeId: 1, createdAt: -1 });
OrderSchema.index({ 'payment.status': 1 });
OrderSchema.index({ 'listProducts.sku': 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);