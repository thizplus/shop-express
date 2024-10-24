import { Request, Response } from 'express';
import axios from 'axios';
import StoreConfig from '../../models/configStore';

// เพิ่ม interface สำหรับ product
interface Product {
  name: string;
  price: number;
  qty: number;
  total: number;
}

export const sendLineNotification = async (req: Request, res: Response) => {
  try {
    const { orderData } = req.body;
    
    // ดึง config จาก database
    const config = await StoreConfig.findOne();
    
    if (!config || !config.lineNotification.NOTIFY_ENABLED || !config.lineNotification.LINE_NOTIFY_TOKEN) {
      return res.status(400).json({ message: 'Line Notification is not enabled or token is missing' });
    }

    // สร้างข้อความสำหรับรายการสินค้า
    const productsList = orderData.listProducts.map((product: Product) => 
    `${product.name}\n ราคา: ${product.price}฿ x ${product.qty} = ${product.total}฿`
    ).join('\n\n');

    const message = `
รายการสั่งซื้อใหม่ !
----------------
คำสั่งซื้อ: ${orderData.orderId}
ชื่อลูกค้า: ${orderData.shippingInfo.cusName}
โทรศัพท์: ${orderData.shippingInfo.cusTel}
----------------
ที่อยู่จัดส่ง:
${orderData.shippingInfo.addressNo} ${orderData.shippingInfo.district} ${orderData.shippingInfo.amphoe} ${orderData.shippingInfo.province} ${orderData.shippingInfo.zipcode}
----------------
ยอดรวม: ${orderData.totalAmount}฿
ค่าจัดส่ง: ${orderData.shippingCost}฿
รวมทั้งสิ้น: ${orderData.netTotal}฿
สถานะ: ${orderData.payment.status}
----------------
    `;

    const response = await axios.post('https://notify-api.line.me/api/notify',
      `message=${encodeURIComponent(message)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${config.lineNotification.LINE_NOTIFY_TOKEN}`
        }
      }
    );

    if (response.status === 200) {
      res.status(200).json({ message: 'Line Notification sent successfully' });
    } else {
      throw new Error('Failed to send Line Notification');
    }
  } catch (error: unknown) {
    console.error('Error sending Line Notification:', error);
    
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error sending Line Notification', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while sending Line Notification' });
    }
  }
};