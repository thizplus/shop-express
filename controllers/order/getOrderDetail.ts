// controllers/orders/getOrderDetail.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';

export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // จัดรูปแบบข้อมูลก่อนส่งกลับ
    const orderDetail = {
      orderId: order.orderId,
      listProducts: order.listProducts.map(product => ({
        sku: product.sku,
        name: product.name,
        price: product.price,
        cost: product.cost,
        qty: product.qty,
        total: product.total,
        totalCost: product.totalCost,
        profit: product.profit
      })),
      shippingInfo: {
        cusName: order.shippingInfo.cusName,
        cusTel: order.shippingInfo.cusTel,
        addressNo: order.shippingInfo.addressNo,
        district: order.shippingInfo.district,
        amphoe: order.shippingInfo.amphoe,
        province: order.shippingInfo.province,
        zipcode: order.shippingInfo.zipcode,
        trackingNo: order.shippingInfo.trackingNo,
        shippingChannel: order.shippingInfo.shippingChannel
      },
      shippingCost: order.shippingCost,
      subTotal: order.subTotal,
      totalAmount: order.totalAmount,
      netTotal: order.netTotal,
      discountAmount: order.discountAmount,
      profitSummary: order.profitSummary ? {
        totalCost: order.profitSummary.totalCost,
        grossProfit: order.profitSummary.grossProfit,
        netProfit: order.profitSummary.netProfit
      } : undefined,
      warehouseFees: order.warehouseFees ? {
        shippingCost: order.warehouseFees.shippingCost,
        serviceFee: order.warehouseFees.serviceFee,
        totalFees: order.warehouseFees.totalFees
      } : undefined,
      createdAt: order.createdAt
    };

    res.json(orderDetail);

  } catch (error) {
    console.error('Error getting order detail:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};