// controllers/product/productController.ts
import { Request, Response } from 'express';
import Product from '../../models/productModel';
import Category from '../../models/categoryModel';
import Price from '../../models/priceModel';

import mongoose from 'mongoose';

  export const updateProduct = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;
  
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          message: 'รหัสสินค้าไม่ถูกต้อง'
        });
      }
  
      // ถ้ามีการอัพเดท categories
      if (updateData.categories && Array.isArray(updateData.categories)) {
        const categoryDocs = await Category.find({
          catId: { $in: updateData.categories }
        });
  
        if (categoryDocs.length !== updateData.categories.length) {
          return res.status(400).json({
            message: 'พบรหัสหมวดหมู่ที่ไม่ถูกต้อง'
          });
        }
  
        // แปลงให้อยู่ในรูปแบบที่ต้องการ และกรองค่าซ้ำ
        const uniqueCategories = Array.from(
          new Map(categoryDocs.map(cat => [cat.catId, { catId: cat.catId, name: cat.name }])).values()
        );
  
        // อัพเดทข้อมูลหมวดหมู่
        updateData.categories = uniqueCategories;

      }
  
      // อัพเดทข้อมูลสินค้า
      const product = await Product.findByIdAndUpdate(
        id,
        { $set: updateData },
        { new: true }
      );
  
      if (!product) {
        return res.status(404).json({
          message: 'ไม่พบสินค้าที่ต้องการแก้ไข'
        });
      }
  
      // ดึงข้อมูล price
      const priceData = await Price.findOne({ sku: product.sku });
  
      // ส่งข้อมูลกลับพร้อม price
      res.json({
        ...product.toObject(),
        listPrice: priceData?.listPrice || []
      });
  
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการแก้ไขสินค้า'
      });
    }
  };
