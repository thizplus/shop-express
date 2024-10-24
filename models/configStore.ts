// models/configModel.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ILineLogin {
  LINE_LIFF_ID: string;
}

export interface ILineNotification {
  LINE_NOTIFY_TOKEN: string;
  NOTIFY_ENABLED: boolean;
}

export interface ILineMessage {
  CHANNEL_ACCESS_TOKEN: string;
  CHANNEL_SECRET: string;
  MESSAGE_ENABLED: boolean;
}

export interface ISlipOK {
  API_URL: string;
  API_KEY: string;
  ENABLED: boolean;
}

export interface IListPrice {
  id: string;
  name: string;
  minPurchase: number;
  allowedUsers?: string[];
  LIFF_ID?: string; // เพิ่ม field นี้
}

export interface ISaleModel {
  minOrderStatus: boolean;
  minOrderValue: number;
  type: 'single' | 'multiple';
  listPrice: IListPrice[];
}

export interface IStandardShipping {
  value: number;
  cost: number;
}

export interface ISpecialShipping {
  value: number;
}

export interface IShippingCost {
  standard: IStandardShipping;
  special: ISpecialShipping;
}

export interface IConfig {
  lineLogin: ILineLogin;
  lineNotification: ILineNotification;
  lineMessage: ILineMessage;
  slipOK: ISlipOK;
  saleModel: ISaleModel;
  shippingCost: IShippingCost;
}

export interface IConfigDocument extends IConfig, Document {
  // เพิ่ม methods ที่เราจะใช้
  hasAccess(userId: string, priceId: string): boolean;
  getAccessiblePrices(userId: string): IListPrice[];
}

const listPriceSchema = new Schema<IListPrice>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  minPurchase: { type: Number, required: true, default: 0 },
  allowedUsers: [String],
  LIFF_ID: { type: String }, // เพิ่ม field นี้
}, { _id: false });

const saleModelSchema = new Schema<ISaleModel>({
  minOrderStatus: { type: Boolean, required: true, default: false },
  minOrderValue: { type: Number, required: true, default: 0 },
  type: { type: String, enum: ['single', 'multiple'], required: true, default: 'single' },
  listPrice: { type: [listPriceSchema], required: true, default: [{ id: 'default', name: 'Default Price', minPurchase: 0 }] },
}, { _id: false });

const standardShippingSchema = new Schema<IStandardShipping>({
  value: { type: Number, required: true, default: 0 },
  cost: { type: Number, required: true, default: 0 },
}, { _id: false });

const specialShippingSchema = new Schema<ISpecialShipping>({
  value: { type: Number, required: true, default: 0 },
}, { _id: false });

const shippingCostSchema = new Schema<IShippingCost>({
  standard: { type: standardShippingSchema, required: true, default: () => ({}) },
  special: { type: specialShippingSchema, required: true, default: () => ({}) },
}, { _id: false });

const lineLoginSchema = new Schema<ILineLogin>({
  LINE_LIFF_ID: { type: String, default: '' },

}, { _id: false });

const lineNotificationSchema = new Schema<ILineNotification>({
  LINE_NOTIFY_TOKEN: { type: String, default: '' },
  NOTIFY_ENABLED: { type: Boolean, default: false },
}, { _id: false });

const lineMessageSchema = new Schema<ILineMessage>({
  CHANNEL_ACCESS_TOKEN: { type: String, default: '' },
  CHANNEL_SECRET: { type: String, default: '' },
  MESSAGE_ENABLED: { type: Boolean, default: false },
}, { _id: false });

const slipOKSchema = new Schema<ISlipOK>({
  API_URL: { type: String, default: '' },
  API_KEY: { type: String, default: '' },
  ENABLED: { type: Boolean, default: false },
}, { _id: false });

const configSchema = new Schema<IConfigDocument>({
  lineLogin: { type: lineLoginSchema, default: () => ({}) },
  lineNotification: { type: lineNotificationSchema, default: () => ({}) },
  lineMessage: { type: lineMessageSchema, default: () => ({}) },
  slipOK: { type: slipOKSchema, default: () => ({}) },
  saleModel: { type: saleModelSchema, default: () => ({}) },
  shippingCost: { type: shippingCostSchema, default: () => ({}) },
}, { 
  timestamps: true,
  collection: 'tbl_store_config'
});

// เพิ่ม index สำหรับการค้นหา
configSchema.index({ 'saleModel.listPrice.id': 1 });
configSchema.index({ 'saleModel.listPrice.allowedUsers': 1 });

// เพิ่ม methods สำหรับตรวจสอบสิทธิ์
configSchema.methods.hasAccess = function(this: IConfigDocument, userId: string, priceId: string): boolean {
  const priceLevel = this.saleModel.listPrice.find((p: IListPrice) => p.id === priceId);
  if (!priceLevel) return false;
  return !priceLevel.allowedUsers || priceLevel.allowedUsers.length === 0 || priceLevel.allowedUsers.includes(userId);
};

configSchema.methods.getAccessiblePrices = function(this: IConfigDocument, userId: string): IListPrice[] {
  return this.saleModel.listPrice.filter((price: IListPrice) => 
    !price.allowedUsers || 
    price.allowedUsers.length === 0 || 
    price.allowedUsers.includes(userId)
  );
};

// เพิ่ม pre-save hook สำหรับเรียงลำดับราคา
configSchema.pre('save', function(next) {
  if (this.saleModel.listPrice) {
    this.saleModel.listPrice.sort((a, b) => b.minPurchase - a.minPurchase);
  }
  next();
});

export interface IConfigModel extends Model<IConfigDocument> {
  findOneOrCreate(): Promise<IConfigDocument>;
}

configSchema.statics.findOneOrCreate = async function(): Promise<IConfigDocument> {
  const config = await this.findOne();
  if (config) {
    return config;
  }
  return this.create({});
};

const StoreConfig = mongoose.model<IConfigDocument, IConfigModel>('StoreConfig', configSchema);
export default StoreConfig;