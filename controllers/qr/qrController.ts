// qrController.ts
import { Request, Response } from 'express';
import axios from 'axios';

// API สำหรับดาวน์โหลดทั่วไป
export const downloadQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'ต้องระบุ URL' });
      return;
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });

    // ตั้งค่า headers สำหรับ iOS
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename="qr-payment.png"');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.send(response.data);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดาวน์โหลด QR:', error);
    res.status(500).json({ message: 'ไม่สามารถดาวน์โหลด QR code ได้' });
  }
};

// API สำหรับดาวน์โหลดใน LINE
export const downloadQRLine = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, orderId } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'ต้องระบุ URL' });
      return;
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `inline; filename="qr-payment-${orderId}.png"`);
    
    res.send(response.data);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการดาวน์โหลด QR:', error);
    res.status(500).json({ message: 'ไม่สามารถดาวน์โหลด QR code ได้' });
  }
};