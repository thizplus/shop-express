import { Request, Response } from 'express';
import axios from 'axios';
import Order,{ IOrder }  from '../../models/orderModel';


export const sendOrderToZortout = async (req: Request, res: Response) => {
  try {
    const orderData: IOrder = req.body.orderData;

    const storeName = process.env.ZORTOUT_STORENAME;
    const apiKey = process.env.ZORTOUT_APIKEY;
    const apiSecret = process.env.ZORTOUT_APISECRET;

    if (!storeName || !apiKey || !apiSecret) {
      console.error('Zortout credentials are missing');
      return res.status(500).json({ message: 'Zortout credentials are not properly configured' });
    }

    const zortoutOrderData = {
      saleschannel: "เว็บไซต์",
      number: orderData.orderId,
      customername: orderData.shippingInfo.cusName,
      customerphone: orderData.shippingInfo.cusTel,
      customeraddress: `${orderData.shippingInfo.addressNo} ${orderData.shippingInfo.district} ${orderData.shippingInfo.amphoe} ${orderData.shippingInfo.province} ${orderData.shippingInfo.zipcode}`,
      shippingname: orderData.shippingInfo.cusName,
      shippingaddress: `${orderData.shippingInfo.addressNo} ${orderData.shippingInfo.district} ${orderData.shippingInfo.amphoe} ${orderData.shippingInfo.province} ${orderData.shippingInfo.zipcode}`,
      shippingphone: orderData.shippingInfo.cusTel,
      paymentMethod: "โอนเงิน",
      paymentamount: 0,
      shippingamount: orderData.shippingCost,
      amount: orderData.netTotal,
      discount: 0,
      status: orderData.payment.status,
      list: orderData.listProducts.map((product) => ({
        sku: product.sku,
        name: product.name,
        number: product.qty,
        pricepernumber: product.price,
        totalprice: product.total
      }))
    };

    console.log('Sending data to Zortout:', JSON.stringify(zortoutOrderData));

    try {
      const response = await axios.post('https://open-api.zortout.com/v4/Order/AddOrder', zortoutOrderData, {
        headers: {
          'Content-Type': 'application/json',
          'storename': storeName,
          'apikey': apiKey,
          'apisecret': apiSecret
        }
      });

      console.log('Zortout API response:', response.data);

      if (response.status === 200 && response.data.resCode === "200") {
        const zortoutId = response.data.resDesc;
        
        // อัปเดตข้อมูลใน tbl_orders
        await updateOrderWithZortoutId(orderData.orderId, zortoutId);

        // เพิ่ม zortoutId ใน orderData
        const updatedOrderData = {
          ...orderData,
          zortoutId: zortoutId
        };

        res.status(200).json({
          message: 'Order sent to Zortout successfully and updated in database',
          zortoutResponse: response.data,
          zortoutOrderId: zortoutId,
          zortoutOrderNumber: response.data.resDesc2,
          orderData: updatedOrderData
        });
      } else {
        throw new Error(`Zortout API returned an unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (axiosError) {
      if (axios.isAxiosError(axiosError)) {
        console.error('Axios error:', axiosError.response?.data);
        throw new Error(`Zortout API request failed: ${axiosError.message}`);
      } else {
        throw axiosError;
      }
    }
  } catch (error: unknown) {
    console.error('Error in sendOrderToZortout:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error sending order to Zortout', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while sending order to Zortout' });
    }
  }
};

async function updateOrderWithZortoutId(orderId: string, zortoutId: string) {
  try {
    const updatedOrder = await Order.findOneAndUpdate(
      { orderId: orderId },
      { $set: { zortoutId: zortoutId } },
      { new: true }
    );

    if (!updatedOrder) {
      console.error(`Order with ID ${orderId} not found for Zortout ID update`);
      throw new Error(`Order with ID ${orderId} not found`);
    } else {
      console.log(`Order ${orderId} updated with Zortout ID ${zortoutId}`);
    }
  } catch (error) {
    console.error('Error updating order with Zortout ID:', error);
    throw error;
  }
}


export const voidOrderToZortout = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.body;

    const storeName = process.env.ZORTOUT_STORENAME;
    const apiKey = process.env.ZORTOUT_APIKEY;
    const apiSecret = process.env.ZORTOUT_APISECRET;

    if (!storeName || !apiKey || !apiSecret) {
      console.error('Zortout credentials are missing');
      return res.status(500).json({ message: 'Zortout credentials are not properly configured' });
    }

    // ค้นหา order จากฐานข้อมูล
    const order = await Order.findOne({ orderId: orderId });

    if (!order || !order.zortoutId) {
      return res.status(404).json({ message: 'Order not found or Zortout ID is missing' });
    }

    try {
      // ยกเลิกคำสั่งซื้อใน Zortout
      const response = await axios.post(
        `https://open-api.zortout.com/v4/Order/VoidOrder?id=${order.zortoutId}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'storename': storeName,
            'apikey': apiKey,
            'apisecret': apiSecret
          }
        }
      );

      console.log('Zortout Void API response:', response.data);

      if (response.status === 200 && response.data.resCode === "200") {
        // อัปเดตสถานะของ order ในฐานข้อมูล
        const updatedOrder = await Order.findOneAndUpdate(
          { orderId: orderId },
          { 
            $set: { 
              'payment.status': 'cancelled',
              status: 'cancelled'  // เพิ่มฟิลด์ status หากคุณต้องการเก็บสถานะทั่วไปของ order
            }
          },
          { new: true }
        );

        if (!updatedOrder) {
          throw new Error('Failed to update order status in database');
        }

        res.status(200).json({
          message: 'Order voided successfully in Zortout and cancelled in database',
          zortoutResponse: response.data,
          updatedOrder: {
            orderId: updatedOrder.orderId,
            status: updatedOrder.payment.status
          }
        });
      } else {
        throw new Error(`Zortout Void API returned an unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (axiosError) {
      if (axios.isAxiosError(axiosError)) {
        console.error('Axios error:', axiosError.response?.data);
        throw new Error(`Zortout Void API request failed: ${axiosError.message}`);
      } else {
        throw axiosError;
      }
    }
  } catch (error: unknown) {
    console.error('Error in voidOrderToZortout:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error voiding order in Zortout and cancelling in database', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while voiding order in Zortout and cancelling in database' });
    }
  }
};

export const updatePaymentToZortout = async (req: Request, res: Response) => {
  try {
    const { orderId, paymentamount, paymentmethod } = req.body;

    const storeName = process.env.ZORTOUT_STORENAME;
    const apiKey = process.env.ZORTOUT_APIKEY;
    const apiSecret = process.env.ZORTOUT_APISECRET;

    if (!storeName || !apiKey || !apiSecret) {
      console.error('Zortout credentials are missing');
      return res.status(500).json({ message: 'Zortout credentials are not properly configured' });
    }

    // ค้นหา order จากฐานข้อมูล
    const order = await Order.findOne({ orderId: orderId });

    if (!order || !order.zortoutId) {
      return res.status(404).json({ message: 'Order not found or Zortout ID is missing' });
    }

    try {
      // เรียก API GetOrderDetail เพื่อดึงข้อมูล order จาก Zortout
      const orderDetailsResponse = await axios.get(
        `https://open-api.zortout.com/v4/Order/GetOrderDetail?id=${order.zortoutId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'storename': storeName,
            'apikey': apiKey,
            'apisecret': apiSecret
          }
        }
      );

      if (!orderDetailsResponse.data) {
        throw new Error('Failed to get order details from Zortout');
      }

      // ดึงข้อมูลยอดเงินจาก Zortout
      const orderDetails = orderDetailsResponse.data;
      const totalAmount = parseFloat(orderDetails.amount);
      const paidAmount = parseFloat(orderDetails.paymentamount || 0);
      const remainingAmount = totalAmount - paidAmount;

      // คำนวณยอดเงินที่จะส่งไป Zortout
      let zortoutPaymentAmount = remainingAmount >= parseFloat(paymentamount) ? 
        parseFloat(paymentamount) : remainingAmount;

      // อัพเดทการชำระเงินใน Zortout
      const response = await axios.post(
        `https://open-api.zortout.com/v4/Order/UpdateOrderPayment?id=${order.zortoutId}&paymentamount=${zortoutPaymentAmount}&paymentmethod=${paymentmethod}`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'storename': storeName,
            'apikey': apiKey,
            'apisecret': apiSecret
          }
        }
      );

      console.log('Zortout Update Payment API response:', response.data);

      if (response.status === 200 && response.data.resCode === "200") {
        // เพิ่มสลิปใหม่และคำนวณยอดรวม
        await Order.findOneAndUpdate(
          { orderId: orderId },
          { 
            $set: { 
              'payment.status': paidAmount + zortoutPaymentAmount >= totalAmount ? 'success' : 'pending',
            },
            $push: { 
              'payment.slip': {
                amount: parseFloat(paymentamount),
                uploadedAt: new Date()
              }
            }
          }
        );

        // ดึงข้อมูล order อีกครั้งเพื่อคำนวณยอดรวมที่ถูกต้อง
        const updatedOrder = await Order.findOne({ orderId: orderId });
        const totalPaid = updatedOrder?.payment.slip.reduce((sum, slip) => sum + slip.amount, 0) || 0;

        // อัพเดทยอดรวม
        await Order.updateOne(
          { orderId: orderId },
          { 
            $set: { 
              'payment.amount': totalPaid
            }
          }
        );

        res.status(200).json({
          message: 'Payment updated successfully in Zortout',
          orderId: orderId,
          zortoutId: order.zortoutId,
          actualPaymentAmount: parseFloat(paymentamount),
          zortoutPaymentAmount: zortoutPaymentAmount,
          totalPaid: totalPaid,
          zortoutResponse: response.data
        });
      } else {
        throw new Error(`Zortout Update Payment API returned an unexpected response: ${JSON.stringify(response.data)}`);
      }
    } catch (axiosError) {
      if (axios.isAxiosError(axiosError)) {
        console.error('Axios error:', axiosError.response?.data);
        throw new Error(`Zortout Update Payment API request failed: ${axiosError.message}`);
      } else {
        throw axiosError;
      }
    }
  } catch (error: unknown) {
    console.error('Error in updatePaymentToZortout:', error);
    if (error instanceof Error) {
      res.status(500).json({ message: 'Error updating payment in Zortout', error: error.message });
    } else {
      res.status(500).json({ message: 'An unknown error occurred while updating payment in Zortout' });
    }
  }
};