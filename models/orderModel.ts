import mongoose, { Schema, Document } from 'mongoose';

export interface IOrder extends Document {
 orderId: string;
 warehouseOrderId: string;  // เพิ่มเพื่อเก็บ reference ถึง order ในคลัง
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
   location?: string;
   isDefault: boolean;
   trackingNo?: string;
   trackingUpdateAt?: Date;
 };
 shippingCost: number;
 shippingMethod: 'standard' | 'grab';
 grabPayment?: IGrabPayment;
 subTotal: number; // ยอดรวมก่อนส่วนลด
 totalAmount: number; // ยอดรวมหลังส่วนลด
 netTotal: number; // ยอดสุทธิ (รวมค่าส่ง)
 expire: Date;
 coupon?: {
   code: string;
   type: 'cart' | 'shipping';
   value: number;
   isPercent: boolean;
   discountAmount: number;
 };
 discountAmount: number; // จำนวนส่วนลดทั้งหมด
 payment: {
   status: 'pending' | 'success' | 'cancelled';
   amount: number;
   slip: Array<{
     url: string;
     amount: number;
     uploadedAt: Date;
   }>;
 };
 createdAt: Date;
 updatedAt: Date;
}

interface IGrabPayment {
 status: 'pending' | 'processing' | 'success';
 amount: number;
 updatedAt?: Date;
 paymentAt?: Date;
 note?: string;
}

const OrderSchema: Schema = new Schema({
 orderId: { type: String, required: true, unique: true },
 warehouseOrderId: { type: String, required: true }, // เพิ่ม field
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
   status: { type: String, enum: ['pending', 'success', 'cancelled'], default: 'pending' },
   amount: { type: Number, default: 0 },
   slip: [{
     url: { type: String, required: true },
     amount: { type: Number, required: true },
     uploadedAt: { type: Date, default: Date.now }
   }]
 }
}, { 
 timestamps: true,
 collection: 'tbl_orders'
});

OrderSchema.index({ warehouseOrderId: 1 });

export default mongoose.model<IOrder>('Order', OrderSchema);