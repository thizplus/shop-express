import { Request, Response } from 'express';
import axios from 'axios';

export const downloadQR = async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ message: 'URL is required' });
      return;
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer'
    });

    // Headers สำหรับการดาวน์โหลด
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'attachment; filename=qr-payment.png');

    res.send(response.data);
  } catch (error) {
    console.error('Error downloading QR:', error);
    res.status(500).json({ message: 'Failed to download QR code' });
  }
};