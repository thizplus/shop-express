// lineFlexMessage.ts
import axios from 'axios';
import { IOrder } from '../../models/orderModel';
import { IConfig } from '../../models/configStore';

interface ShopInfo {
  name?: string;
  slogan?: string;
  logo?: string;
  primaryColor?: string;
}

export const sendOrderFlexMessage = async (
  order: IOrder,
  config: IConfig,
  userId: string
): Promise<boolean> => {
  try {
    if (!config.lineMessage.MESSAGE_ENABLED || !config.lineMessage.CHANNEL_ACCESS_TOKEN) {
      console.log('Line message is not enabled or missing token');
      return false;
    }

    const shopInfo: ShopInfo = {
      name: config.displayConfig.shopName || 'SHOP',
      slogan: config.displayConfig.shopSlogan,
      logo: config.displayConfig.logo,
      primaryColor: config.displayConfig.primaryColor || '#000000'
    };

    const flexMessage = {
      type: 'flex',
      altText: 'รายการสั่งซื้อใหม่',
      contents: {
        type: 'bubble',
        header: {
          type: 'box',
          layout: 'vertical',
          backgroundColor: shopInfo.primaryColor || '#000000',
          paddingTop: 'xl',
          paddingBottom: 'xl',
          paddingStart: 'md',
          paddingEnd: 'md',
          contents: [
            {
              type: 'text',
              text: shopInfo.name || '',
              weight: 'bold',
              size: 'xl',
              color: '#FFFFFF',
              align: 'center',
              wrap: true
            },
            shopInfo.slogan ? {
              type: 'text',
              text: shopInfo.slogan,
              size: 'md',
              color: '#FFFFFF',
              align: 'center',
              margin: 'sm',
              wrap: true
            } : null
          ].filter(Boolean)
        },
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `คำสั่งซื้อ: ${order.orderId}`,
              weight: 'bold'
            },
            {
              type: 'text',
              text: `ลูกค้า: ${order.shippingInfo.cusName}`,
              margin: 'md'
            },
            {
              type: 'box',
              layout: 'vertical',
              margin: 'xl',
              contents: [
                {
                  type: 'text',
                  text: 'ข้อมูลการจัดส่ง',
                  weight: 'bold',
                  color: shopInfo.primaryColor,
                  size: 'md'
                },
                {
                  type: 'box',
                  layout: 'vertical',
                  margin: 'sm',
                  spacing: 'sm',
                  contents: [
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        { 
                          type: 'text', 
                          text: 'รูปแบบการจัดส่ง', 
                          size: 'sm', 
                          color: '#555555', 
                          flex: 2 
                        },
                        { 
                          type: 'text', 
                          text: order.shippingMethod === 'grab' ? 'จัดส่งผ่าน Grab' : 'จัดส่งมาตรฐาน', 
                          size: 'sm', 
                          color: '#111111', 
                          flex: 3,
                          align: 'end'
                        }
                      ]
                    },
                    {
                      type: 'box',
                      layout: 'horizontal',
                      contents: [
                        { 
                          type: 'text', 
                          text: 'เบอร์โทร', 
                          size: 'sm', 
                          color: '#555555', 
                          flex: 2 
                        },
                        { 
                          type: 'text', 
                          text: order.shippingInfo.cusTel, 
                          size: 'sm', 
                          color: '#111111', 
                          flex: 3,
                          align: 'end'
                        }
                      ]
                    },
                    {
                      type: 'text',
                      text: `${order.shippingInfo.addressNo} ${order.shippingInfo.district} ${order.shippingInfo.amphoe}`,
                      size: 'sm',
                      color: '#555555',
                      wrap: true
                    },
                    {
                      type: 'text',
                      text: `${order.shippingInfo.province} ${order.shippingInfo.zipcode}`,
                      size: 'sm',
                      color: '#555555'
                    }
                  ]
                }
              ]
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
              contents: order.listProducts.map((product) => ({
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
                { type: 'text', text: `${order.totalAmount}฿`, size: 'sm', color: '#111111', align: 'end', flex: 1 }
              ]
            },
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ค่าจัดส่ง', size: 'sm', color: '#555555', flex: 3 },
                { type: 'text', text: `${order.shippingCost}฿`, size: 'sm', color: '#111111', align: 'end', flex: 1 }
              ]
            },
            order.discountAmount > 0 ? {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'ส่วนลด', size: 'sm', color: '#555555', flex: 3 },
                { type: 'text', text: `-${order.discountAmount}฿`, size: 'sm', color: '#111111', align: 'end', flex: 1 }
              ]
            } : null,
            {
              type: 'box',
              layout: 'horizontal',
              contents: [
                { type: 'text', text: 'รวมทั้งสิ้น', size: 'sm', color: '#555555', weight: 'bold', flex: 3 },
                { type: 'text', text: `${order.netTotal}฿`, size: 'sm', color: '#111111', align: 'end', weight: 'bold', flex: 1 }
              ]
            }
          ].filter(Boolean)
        },
        footer: {
          type: 'box',
          layout: 'vertical',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#28a745',
              height: 'sm',
              action: {
                type: 'message',
                label: 'ชำระเงินเรียบร้อยแล้ว',
                text: 'ชำระเงินเรียบร้อยแล้ว'
              }
            }
          ]
        }
      }
    };

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

    return true;
  } catch (error) {
    console.error('Error sending Line Flex Message:', error);
    return false;
  }
};