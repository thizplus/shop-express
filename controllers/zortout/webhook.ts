// src/controllers/zortWebhookController.ts

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import Product from '../../models/productModel'; // ปรับ path ตามโครงสร้างโปรเจคของคุณ
import { Server as SocketIOServer } from 'socket.io';

import { emitWholesaleProductUpdate } from '../wholesale/wholesaleProductController';
import { emitMultiPriceProductUpdate } from '../wholesale/getProductsWithMultiPrices';


// ฟังก์ชันสำหรับบันทึก log
const logToFile = (event: string, data: any) => {
  const logDir = path.join(__dirname, '../../logs');
  if (!fs.existsSync(logDir)){
    fs.mkdirSync(logDir);
  }
  const logFile = path.join(logDir, `zort_webhook_${new Date().toISOString().split('T')[0]}.log`);
  const logEntry = `[${new Date().toISOString()}] ${event}: ${JSON.stringify(data)}\n`;
  fs.appendFileSync(logFile, logEntry);
};


// order
export const addOrder = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received ADDORDER webhook:', data);
  logToFile('ADDORDER', data);
  // ทำการประมวลผลข้อมูลตามต้องการ
  res.status(200).json({ message: 'ADDORDER webhook received' });
};

export const updateOrder = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received UPDATEORDER webhook:', data);
  logToFile('UPDATEORDER', data);
  // ทำการประมวลผลข้อมูลตามต้องการ
  res.status(200).json({ message: 'UPDATEORDER webhook received' });
};

export const updateOrderTracking = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received UPDATEORDERTRACKING webhook:', data);
  logToFile('UPDATEORDERTRACKING', data);
  // ทำการประมวลผลข้อมูลตามต้องการ
  res.status(200).json({ message: 'UPDATEORDERTRACKING webhook received' });
};

export const deleteOrder = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received DELETEORDER webhook:', data);
  logToFile('DELETEORDER', data);
  // ทำการประมวลผลข้อมูลตามต้องการ
  res.status(200).json({ message: 'DELETEORDER webhook received' });
};

// product

export const addProduct = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received ADDPRODUCT webhook:', data);
  logToFile('ADDPRODUCT', data);
  // ทำการประมวลผลข้อมูลตามต้องการ เช่น เพิ่มสินค้าใหม่ลงในฐานข้อมูล
  res.status(200).json({ message: 'ADDPRODUCT webhook received' });
};

export const updateProduct = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received UPDATEPRODUCT webhook:', data);
  logToFile('UPDATEPRODUCT', data);
  // ทำการประมวลผลข้อมูลตามต้องการ เช่น อัปเดตข้อมูลสินค้าในฐานข้อมูล
  res.status(200).json({ message: 'UPDATEPRODUCT webhook received' });
};


export const updateProductQuantity = async (req: Request, res: Response) => {
  try {
    const { sku, stock, availablestock } = req.body;
    console.log('Received UPDATEPRODUCTQUANTITY webhook:', { sku, stock, availablestock });
    
    if (!sku || stock === undefined || availablestock === undefined) {
      return res.status(400).json({ message: 'Missing required fields: sku, stock, or availablestock' });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { sku },
      { 
        $set: { 
          stock: parseInt(stock),
          availablestock: parseInt(availablestock)
        }
      },
      { new: true }
    ).lean();

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // ส่งข้อมูลอัปเดตผ่าน Socket.IO
    const io: SocketIOServer = req.app.get('socketio');
    if (io) {
      console.log('Emitting product updates for wholesale and multi-price:', updatedProduct);
      await emitWholesaleProductUpdate(io, updatedProduct);
      await emitMultiPriceProductUpdate(io, updatedProduct);
    } else {
      console.warn('Socket.IO instance not found. Real-time updates not sent.');
    }

    res.status(200).json({ 
      message: 'UPDATEPRODUCTQUANTITY webhook processed successfully',
      updatedProduct
    });
  } catch (error) {
    console.error('Error processing UPDATEPRODUCTQUANTITY webhook:', error);
    res.status(500).json({ message: 'Internal server error', error: (error as Error).message });
  }
};

export const deleteProduct = (req: Request, res: Response) => {
  const data = req.body;
  console.log('Received DELETEPRODUCT webhook:', data);
  logToFile('DELETEPRODUCT', data);
  // ทำการประมวลผลข้อมูลตามต้องการ เช่น ลบสินค้าออกจากฐานข้อมูล
  res.status(200).json({ message: 'DELETEPRODUCT webhook received' });
};