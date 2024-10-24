import { Request, Response } from 'express';
import Price from '../../../models/priceModel';
import Product from '../../../models/productModel';
import StoreConfig from '../../../models/configStore';

export const searchProductsByPriceId = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params;
    const { query, page = 1, limit = 20 } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;
    const searchRegex = new RegExp(query as string, 'i');

    // 1. ดึงข้อมูล allowedUsers จาก config
    const config = await StoreConfig.findOne({
      'saleModel.listPrice.id': priceId
    });

    const priceConfig = config?.saleModel.listPrice.find(p => p.id === priceId);
    const allowedUsers = priceConfig?.allowedUsers || [];

    // 2. ดึงข้อมูลสินค้าและราคา
    const products = await Price.aggregate([
      { $unwind: "$listPrice" },
      { $match: { 
        "listPrice.priceId": priceId,
        $or: [
          { sku: searchRegex },
          { name: searchRegex }
        ]
      }},
      { $sort: { "listPrice.updatedAt": -1 } },
      { $group: {
        _id: "$sku",
        name: { $first: "$name" },
        latestPrice: { $first: "$listPrice" }
      }},
      { $project: {
        _id: 0,
        sku: "$_id",
        name: 1,
        priceId: "$latestPrice.priceId",
        price: "$latestPrice.price",
        createdAt: "$latestPrice.createdAt",
        updatedAt: "$latestPrice.updatedAt",
        priceName: "$latestPrice.priceName"
      }},
      { $sort: { sku: 1 } },
      { $skip: skip },
      { $limit: limitNumber }
    ]);

    // 3. ดึงข้อมูลเพิ่มเติมจาก products
    const productSkus = products.map(p => p.sku);
    const productDetails = await Product.find({ sku: { $in: productSkus } })
      .select('sku id stock availablestock')
      .lean();
    const productMap = new Map(productDetails.map(product => [product.sku, product]));

    // 4. รวมข้อมูล
    const result = products.map(product => {
      const additionalDetails = productMap.get(product.sku);
      return {
        ...product,
        stock: additionalDetails?.stock ?? null,
        availablestock: additionalDetails?.availablestock ?? null,
        id: additionalDetails?.id || null
      };
    });

    // 5. นับจำนวน total items
    const totalItems = await Price.countDocuments({ 
      "listPrice.priceId": priceId,
      $or: [
        { sku: searchRegex },
        { name: searchRegex }
      ]
    });

    // 6. ส่งข้อมูลกลับ รวมถึง allowedUsers
    res.json({
      items: result,
      totalItems,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalItems / limitNumber),
      priceId,
      priceName: products.length > 0 ? products[0].priceName : null,
      allowedUsers // ส่งข้อมูล allowedUsers กลับด้วย
    });

  } catch (error) {
    console.error('Error searching products by price ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
