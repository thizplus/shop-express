// controllers/price/getMultiCartPrices.ts
import { Request, Response } from 'express';
import Price from '../../models/priceModel';
import Product from '../../models/productModel';

interface MultiCartPriceRequest {
  skus: string[];
  priceIds: string[];
}

export const getMultiCartPrices = async (req: Request, res: Response) => {
  try {
    const { skus, priceIds } = req.body as MultiCartPriceRequest;

    if (!skus || !priceIds || skus.length === 0 || priceIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters' 
      });
    }

    // ดึงข้อมูลราคาล่าสุด
    const prices = await Price.find({ sku: { $in: skus } }).lean();
    const products = await Product.find({ 
      sku: { $in: skus },
      active: true 
    }).lean();

    // รวมข้อมูลสินค้าและราคา
    const verifiedProducts = products.map(product => {
      const priceData = prices.find(p => p.sku === product.sku);
      
      return {
        ...product,
        prices: priceData ? priceData.listPrice
          .filter(price => priceIds.includes(price.priceId))
          .map(price => ({
            priceId: price.priceId,
            priceName: price.priceName,
            price: price.price
          }))
        : []
      };
    });

    res.json({
      success: true,
      data: verifiedProducts
    });
  } catch (error) {
    console.error('Error fetching multi-price cart prices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch cart prices' 
    });
  }
};