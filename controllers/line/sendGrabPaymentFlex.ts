import { Request, Response } from 'express';
import axios from 'axios';
import StoreConfig from '../../models/configStore';

interface FlexHero {
 type: 'image';
 url: string;
 size: 'full';
 aspectRatio: string;
 aspectMode: string;
}

interface FlexContent {
 type: 'bubble';
 hero?: FlexHero;
 header: {
   type: 'box';
   layout: 'vertical';
   contents: Array<any>;
   backgroundColor: string;
 };
 body: {
   type: 'box';
   layout: 'vertical';
   contents: Array<any>;
 };
 footer: {
   type: 'box';
   layout: 'vertical'; 
   contents: Array<any>;
 };
}

interface FlexMessage {
 type: 'flex';
 altText: string;
 contents: FlexContent;
}

export const sendGrabPaymentFlexMessage = async (req: Request, res: Response) => {
 try {
   const { orderId, userId, cusName, amount, status } = req.body;
   
   const config = await StoreConfig.findOne();
   
   if (!config?.lineMessage.MESSAGE_ENABLED || !config?.lineMessage.CHANNEL_ACCESS_TOKEN) {
     return res.status(400).json({ message: 'Line Messaging API not configured' });
   }

   const flexMessage: FlexMessage = {
     type: 'flex',
     altText: 'แจ้งค่าส่ง Grab',
     contents: {
       type: 'bubble',
       header: {
         type: 'box',
         layout: 'vertical',
         contents: [
           {
             type: 'text',
             text: 'แจ้งค่าส่ง Grab',
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
             text: `คำสั่งซื้อ: ${orderId}`,
             weight: 'bold'
           },
           {
             type: 'text',
             text: `ลูกค้า: ${cusName}`,
             margin: 'md'  
           },
           {
             type: 'separator',
             margin: 'xl'
           },
           {
             type: 'box',
             layout: 'horizontal',
             margin: 'xl',
             contents: [
               { 
                 type: 'text',
                 text: 'ค่าส่ง Grab:',
                 size: 'md',
                 color: '#555555',
                 flex: 1
               },
               { 
                 type: 'text',
                 text: `${amount}฿`,
                 size: 'md', 
                 color: '#111111',
                 align: 'end',
                 weight: 'bold',
                 flex: 1
               }
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
             text: `สถานะ: ${status === 'processing' ? 'กำลังเรียกเก็บเงิน' : 'ชำระแล้ว'}`,
             weight: 'bold',
             color: '#27ACB2',
             align: 'center'
           }
         ]
       }
     }
   };

   if (config.slipOK?.qr_image) {
     flexMessage.contents.hero = {
       type: 'image',
       url: config.slipOK.qr_image,
       size: 'full',
       aspectRatio: '1:1',
       aspectMode: 'cover'
     };
   }

   await axios.post(
     'https://api.line.me/v2/bot/message/push',
     {
       to: userId,
       messages: [flexMessage]
     },
     {
       headers: {
         'Content-Type': 'application/json',
         'Authorization': `Bearer ${config.lineMessage.CHANNEL_ACCESS_TOKEN}`
       }
     }
   );

   res.status(200).json({ message: 'Message sent successfully' });
 } catch (error) {
   console.error('Error sending flex message:', error);
   res.status(500).json({
     message: 'Error sending message',
     error: error instanceof Error ? error.message : 'Unknown error'
   });
 }
};