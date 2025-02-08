// controllers/order/updateCostController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Order, { IOrder } from '../../models/orderModel';

// เพิ่ม interfaces สำหรับข้อมูลที่รับจากคลัง
interface IWarehouseProduct {
  sku: string;
  name: string;
  price: number;  // ราคาต้นทุน
  qty: number;
  total: number;  // ราคาต้นทุนรวม
}

interface IWarehouseOrderData {
  orderId: string;
  products: IWarehouseProduct[];
  shippingCost: number;
  serviceFee: number;
  totalCost: number;
}

interface ICostInfo {
  cost: number;
  qty: number;
  totalCost: number;
}

export const updateOrderCost = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { action, source, payload } = req.body;

    if (source !== 'warehouse' || !Array.isArray(payload)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request data'
      });
    }

    const results = await Promise.all(payload.map(async (orderData: IWarehouseOrderData) => {
      const { orderId, products, shippingCost, serviceFee } = orderData;

      // ค้นหา order
      const order = await Order.findOne({ orderId }).session(session);
      if (!order) {
        return {
          orderId,
          success: false,
          message: 'Order not found'
        };
      }

      // สร้าง map ของสินค้าจากคลัง
      const costMap = new Map<string, ICostInfo>(
        products.map((p: IWarehouseProduct) => [p.sku, {
          cost: p.price,
          qty: p.qty,
          totalCost: p.total
        }])
      );

      // อัพเดทข้อมูลต้นทุนในแต่ละสินค้า
      const updatedProducts = order.listProducts.map(product => {
        const costInfo = costMap.get(product.sku);
        if (!costInfo) return product;

        return {
          ...product,
          cost: costInfo.cost,
          totalCost: costInfo.totalCost,
          profit: product.price - costInfo.cost
        };
      });

      // คำนวณกำไร/ขาดทุน
      const totalProductCost = products.reduce((sum: number, p: IWarehouseProduct) => sum + p.total, 0);
      const totalFees = shippingCost + serviceFee;
      const grossProfit = order.totalAmount - totalProductCost;
      const netProfit = grossProfit - totalFees;

      // อัพเดทข้อมูล
      const updatedOrder = await Order.findOneAndUpdate(
        { orderId },
        {
          $set: {
            listProducts: updatedProducts,
            warehouseFees: {
              shippingCost,
              serviceFee,
              totalFees
            },
            profitSummary: {
              totalCost: totalProductCost,
              grossProfit,
              netProfit,
              updatedAt: new Date()
            }
          }
        },
        { 
          new: true,
          session 
        }
      );

      if (!updatedOrder) {
        return {
          orderId,
          success: false,
          message: 'Failed to update order'
        };
      }

      return {
        orderId,
        success: true,
        profitSummary: updatedOrder.profitSummary
      };
    }));

    await session.commitTransaction();

    const successCount = results.filter(r => r.success).length;
    const failedOrders = results.filter(r => !r.success);

    return res.status(200).json({
      status: 'success',
      data: {
        updated: successCount,
        total: payload.length,
        results,
        failedOrders: failedOrders.length > 0 ? failedOrders : undefined
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error updating order costs:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  } finally {
    session.endSession();
  }
};