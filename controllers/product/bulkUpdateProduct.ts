// controllers/product/bulkUpdateProduct.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Product from '../../models/productModel';
import Price from '../../models/priceModel';
import Category from '../../models/categoryModel';

interface BulkUpdateRequest {
  skus: string[];
  prices?: { [priceId: string]: number };
  categories?: string[];
}

export const bulkUpdateProduct = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { skus, prices, categories } = req.body as BulkUpdateRequest;
    const now = new Date();

    // 1. อัพเดท categories (ถ้ามี)
    if (categories && categories.length > 0) {
      // ดึงข้อมูล category ทั้งหมดที่ถูกเลือก
      const categoryDocs = await Category.find({ 
        catId: { $in: categories }
      }).lean();

      // สร้าง object ที่มี catId และ name
      const categoryData = categoryDocs.map(cat => ({
        catId: cat.catId,
        name: cat.name
      }));

      // อัพเดท categories และ updatedAt ในสินค้าทั้งหมดที่ถูกเลือก
      await Product.updateMany(
        { sku: { $in: skus } },
        { 
          $set: { 
            categories: categoryData,
            updatedAt: now
          } 
        },
        { session }
      );
    }

    // 2. อัพเดทราคา (ถ้ามี)
    if (prices && Object.keys(prices).length > 0) {
      // สร้าง bulk operations สำหรับการอัพเดทราคา
      const bulkOps = Object.entries(prices).map(([priceId, newPrice]) => ({
        updateMany: {
          filter: { 
            sku: { $in: skus },
            'listPrice.priceId': priceId 
          },
          update: { 
            $set: { 
              'listPrice.$.price': newPrice,
              'listPrice.$.updatedAt': now,
              updatedAt: now  // อัพเดท updatedAt ของ document หลัก
            }
          }
        }
      }));

      // ทำการอัพเดทราคาทั้งหมด
      if (bulkOps.length > 0) {
        await Price.bulkWrite(bulkOps, { session });
      }
    }

    // Commit transaction
    await session.commitTransaction();

    // ส่งผลลัพธ์กลับ
    res.status(200).json({
      success: true,
      message: 'อัพเดทข้อมูลสำเร็จ',
      updated: {
        products: skus.length,
        categories: categories?.length || 0,
        prices: prices ? Object.keys(prices).length : 0,
        timestamp: now
      }
    });

  } catch (error) {
    // Rollback ถ้าเกิด error
    await session.abortTransaction();

    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการอัพเดทข้อมูล'
    });

  } finally {
    session.endSession();
  }
};