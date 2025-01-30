// models/pointTicketModel.ts
import mongoose, { Document, Schema } from 'mongoose';

export enum TicketType {
  CART = 'cart',         // ส่วนลดจากตะกร้าสินค้า
  SHIPPING = 'shipping'  // ส่วนลดค่าจัดส่ง
}

export interface IPointTicket extends Document {
  name: string;              // ชื่อตั๋ว
  description: string;       // รายละเอียด
  type: TicketType;         // ประเภทส่วนลด
  pointCost: number;        // จำนวนพอยต์ที่ใช้แลก
  discountValue: number;    // มูลค่าส่วนลด
  isPercent: boolean;       // true = ลดเป็นเปอร์เซ็นต์, false = ลดเป็นจำนวนเงิน
  maxDiscount?: number;     // จำนวนเงินส่วนลดสูงสุด (กรณีลดเป็นเปอร์เซ็นต์)
  minPurchase?: number;     // ยอดซื้อขั้นต่ำที่สามารถใช้ได้
  isActive: boolean;        // สถานะการใช้งาน
  expiresInDays: number;    // จำนวนวันที่ตั๋วใช้ได้หลังจากแลก
  createdAt: Date;
  updatedAt: Date;
}

const pointTicketSchema = new Schema<IPointTicket>({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  type: { 
    type: String, 
    enum: Object.values(TicketType), 
    required: true 
  },
  pointCost: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  discountValue: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  isPercent: { 
    type: Boolean, 
    required: true 
  },
  maxDiscount: { 
    type: Number, 
    min: 0 
  },
  minPurchase: { 
    type: Number, 
    min: 0 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  expiresInDays: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true,
  collection: 'tbl_point_tickets'
});

export default mongoose.model<IPointTicket>('PointTicket', pointTicketSchema);