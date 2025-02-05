// telegramMessage.ts
import axios from 'axios';
import { IOrder } from '../../models/orderModel';
import { IConfig } from '../../models/configStore';

export const sendTelegramOrderMessage = async (
  order: IOrder,
  config: IConfig
): Promise<boolean> => {
  try {
    if (!config.telegramNotification.TELEGRAM_ENABLED || 
        !config.telegramNotification.TELEGRAM_BOT_TOKEN || 
        !config.telegramNotification.TELEGRAM_CHAT_ID) {
      console.log('Telegram notification is not enabled or missing configuration');
      return false;
    }

    const shopName = config.displayConfig.shopName || 'Your Shop Name';
    
    // สร้างข้อความแจ้งเตือน
    let message = `🔔 *${shopName} - มีออเดอร์ชำระเงินเรียบร้อย*\n\n`;
    message += `📋 *รายละเอียดออเดอร์*\n`;
    message += `รหัสออเดอร์: \`${order.orderId}\`\n`;
    message += `ลูกค้า: ${order.shippingInfo.cusName}\n`;
    message += `เบอร์โทร: ${order.shippingInfo.cusTel}\n\n`;

    message += `📍 *ที่อยู่จัดส่ง*\n`;
    message += `${order.shippingInfo.addressNo}\n`;
    message += `${order.shippingInfo.district} ${order.shippingInfo.amphoe}\n`;
    message += `${order.shippingInfo.province} ${order.shippingInfo.zipcode}\n\n`;

    message += `🚚 *รูปแบบการจัดส่ง*: ${order.shippingMethod === 'grab' ? 'จัดส่งผ่าน Grab' : 'จัดส่งมาตรฐาน'}\n\n`;

    message += `📦 *รายการสินค้า*\n`;
    order.listProducts.forEach(product => {
      message += `- ${product.name}\n`;
      message += `  จำนวน: ${product.qty} ชิ้น × ${product.price}฿ = ${product.total}฿\n`;
    });
    
    message += `\n💰 *สรุปยอด*\n`;
    message += `ยอดรวมสินค้า: ${order.totalAmount}฿\n`;
    message += `ค่าจัดส่ง: ${order.shippingCost}฿\n`;
    if (order.discountAmount > 0) {
      message += `ส่วนลด: -${order.discountAmount}฿\n`;
    }
    message += `*รวมทั้งสิ้น: ${order.netTotal}฿*\n\n`;

    message += `✅ *สถานะ: ชำระเงินเรียบร้อยแล้ว*\n`;
    message += `⏰ เวลา: ${new Date().toLocaleString('th-TH')}`;

    // ส่งข้อความไปยัง Telegram
    const telegramApiUrl = `https://api.telegram.org/bot${config.telegramNotification.TELEGRAM_BOT_TOKEN}/sendMessage`;
    
    await axios.post(telegramApiUrl, {
      chat_id: config.telegramNotification.TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });

    return true;
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
};