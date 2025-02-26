import mongoose, { Document, Schema } from 'mongoose';

// Shipping Address Interface
export interface IShippingAddress extends Document {
  _id: mongoose.Types.ObjectId;
  cusName: string;
  cusTel: string;
  addressNo: string;
  district: string;
  amphoe: string;
  province: string;
  zipcode: string;
  location?: string;
  isDefault: boolean;
}

export interface ICustomPrice {
  sku: string;
  price: number;
  name?: string;
}

// Client Interface with updated userType
export interface IClient extends Document {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  userType: 'store' | 'shop' | 'wholesale'; // เพิ่ม 'wholesale'
  idType?: string;
  shippingAddresses: IShippingAddress[];
  enableGrabDelivery?: boolean; // เพิ่ม field นี้
  customPrices?: ICustomPrice[];  // เพิ่มฟิลด์นี้
  pin?: string;                // PIN สำหรับเข้าถึงเว็บไซต์
  isPinVerified?: boolean;     // สถานะการยืนยัน PIN
  pinCreatedAt?: Date;         // วันที่สร้าง PIN (optional สำหรับใช้ในกรณีต้องการให้ PIN หมดอายุ)
  pinAttempts?: number;        // จำนวนครั้งที่ใส่ PIN ผิด (optional สำหรับระบบความปลอดภัย)
  pinLastAttempt?: Date;       // เวลาที่ใส่ PIN ครั้งล่าสุด
  createdAt: Date; // เพิ่มส่วนนี้
  updatedAt: Date; // เพิ่มส่วนนี้
}

// Shipping Address Schema
const shippingAddressSchema = new Schema<IShippingAddress>({
  cusName: { type: String, required: true },
  cusTel: { type: String, required: true },
  addressNo: { type: String, required: true },
  district: { type: String, required: true },
  amphoe: { type: String, required: true },
  province: { type: String, required: true },
  zipcode: { type: String, required: true },
  location: { type: String, required: false },
  isDefault: { type: Boolean, default: false }
}, { _id: true }); // Ensure _id is generated for subdocuments

const customPriceSchema = new Schema({
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  name: { type: String }
});

// Client Schema with updated userType enum
const clientSchema = new Schema<IClient>({
  userId: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  pictureUrl: { type: String },
  userType: { 
    type: String, 
    enum: ['store', 'shop', 'wholesale'], // เพิ่ม 'wholesale'
    required: true,
    default: 'store'
  },
  idType: { type: String },
  shippingAddresses: [shippingAddressSchema],
  enableGrabDelivery: { type: Boolean, default: false }, // เพิ่ม field นี้
  customPrices: [customPriceSchema],  // เพิ่มฟิลด์นี้
  pin: { 
    type: String,
    select: false // ป้องกันการดึงค่า PIN โดยไม่ตั้งใจ
  },
  isPinVerified: { 
    type: Boolean, 
    default: false 
  },
  pinCreatedAt: { 
    type: Date 
  },
  pinAttempts: { 
    type: Number,
    default: 0
  },
  pinLastAttempt: { 
    type: Date 
  }
}, { 
  timestamps: true,
  collection: 'tbl_clients'
});

// Optional: Add index for better query performance
clientSchema.index({ userId: 1 });
clientSchema.index({ userType: 1 });

export default mongoose.model<IClient>('Client', clientSchema);

// Export type for use in other files
export type UserType = 'store' | 'shop' | 'wholesale';