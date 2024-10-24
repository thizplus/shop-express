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
  isDefault: boolean;
}

// Client Interface with updated userType
export interface IClient extends Document {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  userType: 'store' | 'shop' | 'wholesale'; // เพิ่ม 'wholesale'
  idType?: string;
  shippingAddresses: IShippingAddress[];
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
  isDefault: { type: Boolean, default: false }
}, { _id: true }); // Ensure _id is generated for subdocuments

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
  shippingAddresses: [shippingAddressSchema]
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