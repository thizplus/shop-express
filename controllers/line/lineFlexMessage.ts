import { Request, Response } from 'express';
import axios from 'axios';
import StoreConfig from '../../models/configStore';

interface Product {
  name: string;
  price: number;
  qty: number;
  total: number;
}

export const sendLineFlexMessage = async (req: Request, res: Response) => {
  try {
    const { orderData } = req.body;
    
    const config = await StoreConfig.findOne();
    
    if (!config || !config.lineMessage.MESSAGE_ENABLED || !config.lineMessage.CHANNEL_ACCESS_TOKEN) {
      return res.status(400).json({ message: 'Line Messaging API is not enabled or token is missing' });
    }
    const flexMessage = {
        type: 'flex',
        altText: 'รายการสั่งซื้อใหม่',
        contents: {
          type: 'bubble',
          header: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'รายการสั่งซื้อใหม่',
                weight: 'bold',
                size: 'xl',
                color: '#ffffff'
              }
            ],
            backgroundColor: '#27ACB2'
          },
          body: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `คำสั่งซื้อ: ${orderData.orderId}`,
                weight: 'bold'
              },
              {
                type: 'text',
                text: `ลูกค้า: ${orderData.shippingInfo.cusName}`,
                margin: 'md'
              },
              {
                type: 'separator',
                margin: 'xl'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  { type: 'text', text: 'สินค้า', size: 'sm', weight: 'bold', flex: 3 },
                  { type: 'text', text: 'ราคา', size: 'sm', weight: 'bold', align: 'end', flex: 1 },
                  { type: 'text', text: 'จำนวน', size: 'sm', weight: 'bold', align: 'end', flex: 1 },
                  { type: 'text', text: 'รวม', size: 'sm', weight: 'bold', align: 'end', flex: 1 }
                ]
              },
              {
                type: 'separator',
                margin: 'sm'
              },
              {
                type: 'box',
                layout: 'vertical',
                margin: 'md',
                spacing: 'sm',
                contents: orderData.listProducts.map((product: Product) => ({
                  type: 'box',
                  layout: 'horizontal',
                  contents: [
                    { type: 'text', text: product.name, size: 'sm', wrap: true, flex: 3 },
                    { type: 'text', text: `${product.price}฿`, size: 'sm', align: 'end', flex: 1 },
                    { type: 'text', text: `${product.qty}`, size: 'sm', align: 'end', flex: 1 },
                    { type: 'text', text: `${product.total}฿`, size: 'sm', align: 'end', flex: 1 }
                  ]
                }))
              },
              {
                type: 'separator',
                margin: 'xl'
              },
              {
                type: 'box',
                layout: 'horizontal',
                margin: 'md',
                contents: [
                  { type: 'text', text: 'ยอดรวม', size: 'sm', color: '#555555', flex: 3 },
                  { type: 'text', text: `${orderData.totalAmount}฿`, size: 'sm', color: '#111111', align: 'end', flex: 1 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ค่าจัดส่ง', size: 'sm', color: '#555555', flex: 3 },
                  { type: 'text', text: `${orderData.shippingCost}฿`, size: 'sm', color: '#111111', align: 'end', flex: 1 }
                ]
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'รวมทั้งสิ้น', size: 'sm', color: '#555555', weight: 'bold', flex: 3 },
                  { type: 'text', text: `${orderData.netTotal}฿`, size: 'sm', color: '#111111', align: 'end', weight: 'bold', flex: 1 }
                ]
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: `สถานะ: ${orderData.payment.status}`,
                weight: 'bold',
                color: '#27ACB2',
                align: 'center'
              }
            ]
          }
        }
      };

    const response = await axios.post('https://api.line.me/v2/bot/message/push', 
      {
        to: orderData.userId, // Assuming you have the user's LINE userId
        messages: [flexMessage]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.lineMessage.CHANNEL_ACCESS_TOKEN}`
        }
      }
    );

    if (response.status === 200) {
      res.status(200).json({ message: 'Line Flex Message sent successfully' });
    } else {
      throw new Error('Failed to send Line Flex Message');
    }
  } catch (error: unknown) {
    console.error('Error sending Line Flex Message:', error);
    
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error sending Line Flex Message', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while sending Line Flex Message' });
    }
  }
};