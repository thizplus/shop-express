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

// controllers/order/updateCostController.ts
export const updateOrderCost = async (req: Request, res: Response) => {
    console.log('🔄 เริ่มต้นการรับข้อมูลต้นทุนจากคลัง');
    const session = await mongoose.startSession();
    session.startTransaction();
  
    try {
      const { action, source, payload } = req.body;
      console.log('📦 ข้อมูลที่ได้รับ:', {
        action,
        source,
        orderCount: payload?.length || 0
      });
  
      if (source !== 'warehouse' || !Array.isArray(payload)) {
        console.log('❌ ข้อมูลไม่ถูกต้อง:', { source, isArray: Array.isArray(payload) });
        return res.status(400).json({
          status: 'error',
          message: 'Invalid request data'
        });
      }
  
      const results = await Promise.all(payload.map(async (orderData: IWarehouseOrderData) => {
        const { orderId, products, shippingCost, serviceFee } = orderData;
  
        console.log(`\n🔍 กำลังอัพเดทข้อมูล Order: ${orderId}`);
        console.log('💰 ข้อมูลค่าใช้จ่าย:', {
          shippingCost,
          serviceFee,
          productCount: products.length
        });
  
        // ค้นหา order
        const order = await Order.findOne({ orderId }).session(session);
        if (!order) {
          console.log('❌ ไม่พบ Order:', orderId);
          return {
            orderId,
            success: false,
            message: 'Order not found'
          };
        }
  
        console.log('✅ พบ Order:', {
          orderId,
          originalAmount: order.totalAmount,
          productCount: order.listProducts.length
        });
  
        // สร้าง map ของสินค้าจากคลัง
        const costMap = new Map<string, ICostInfo>(
          products.map((p: IWarehouseProduct) => [p.sku, {
            cost: p.price,
            qty: p.qty,
            totalCost: p.total
          }])
        );
  
        console.log('📊 ข้อมูลต้นทุนสินค้า:', Object.fromEntries(costMap));
  
        // อัพเดทข้อมูลต้นทุนในแต่ละสินค้า
        const updatedProducts = order.listProducts.map(product => {
          const costInfo = costMap.get(product.sku);
          if (!costInfo) {
            console.log(`⚠️ ไม่พบข้อมูลต้นทุนสำหรับสินค้า: ${product.sku}`);
            return product;
          }
  
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
  
        console.log('💹 สรุปผลกำไร/ขาดทุน:', {
          totalProductCost,
          totalFees,
          grossProfit,
          netProfit
        });
  
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
          console.log('❌ ไม่สามารถอัพเดทข้อมูล Order:', orderId);
          return {
            orderId,
            success: false,
            message: 'Failed to update order'
          };
        }
  
        console.log('✅ อัพเดทข้อมูลสำเร็จ:', {
          orderId,
          updatedAt: updatedOrder.profitSummary?.updatedAt
        });
  
        return {
          orderId,
          success: true,
          profitSummary: updatedOrder.profitSummary
        };
      }));
  
      await session.commitTransaction();
      console.log('\n📊 สรุปผลการอัพเดท:', {
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        total: payload.length
      });
  
      const successCount = results.filter(r => r.success).length;
      const failedOrders = results.filter(r => !r.success);
  
      if (failedOrders.length > 0) {
        console.log('⚠️ รายการที่ไม่สำเร็จ:', failedOrders);
      }
  
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
      console.error('❌ เกิดข้อผิดพลาด:', error);
      return res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    } finally {
      session.endSession();
      console.log('🏁 จบการทำงาน\n');
    }
  };