import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore'; // Import StoreConfig model
import dotenv from 'dotenv';

dotenv.config();

export const registerShop = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, code } = req.body;

    if (!name || !code) {
      res.status(400).json({ message: 'Missing required fields: name or code' });
      return;
    }

    // ดึง telegramNotification จาก StoreConfig
    const storeConfig = await StoreConfig.findOneOrCreate();
    const telegramNotification = storeConfig.telegramNotification || {
      TELEGRAM_BOT_TOKEN: '',
      TELEGRAM_CHAT_ID: '',
    };

    const frontend = process.env.FRONTEND_URL;
    const backend = process.env.BASE_URL;

    // เพิ่ม log เพื่อดูข้อมูลที่จะส่งไป
    console.log('Sending data to warehouse API:', {
      name,
      code,
      frontend,
      backend,
      telegramNotification,
    });

    // ส่งข้อมูลไปยังคลังสินค้า
    const response = await fetch(`${process.env.STORE_API_URL}/api/shops/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        code,
        frontend,
        backend,
        telegramNotification, // รวม telegramNotification ไปใน request
      }),
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(`Warehouse API error: ${errorResponse.message || 'Unknown error'}`);
    }

    const warehouseResult = await response.json();

    // ตอบกลับผลลัพธ์กลับไปยัง client
    res.status(201).json({
      message: 'Shop registered successfully with warehouse',
      warehouseResult,
    });
  } catch (error) {
    console.error('Error registering shop', error);
    res.status(500).json({
      message: 'Error registering shop',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
