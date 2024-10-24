import { Request, Response } from 'express';
import Price from '../../../models/priceModel';
import Product, { IProduct } from '../../../models/productModel';

export const getProductsWithMultiPrices = async (req: Request, res: Response) => {
  try {
    const { priceIds } = req.query;
    const { page = 1, limit = 20 } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const priceIdList = (priceIds as string).split(',');

    console.log(`Fetching products for priceIds: ${priceIdList}`);
    console.log(`Page Number: ${pageNumber}, Limit Number: ${limitNumber}`);

    // Fetch products with price details from tbl_store_price
    const products = await Price.aggregate([
      { $unwind: "$listPrice" },
      { $match: { "listPrice.priceId": { $in: priceIdList } } },
      { $sort: { "listPrice.updatedAt": -1 } },
      { $group: {
        _id: "$sku",
        name: { $first: "$name" },
        prices: { 
          $push: {
            priceId: "$listPrice.priceId",
            priceName: "$listPrice.priceName",
            price: "$listPrice.price",
            updatedAt: "$listPrice.updatedAt"
          }
        }
      }},
      { $project: {
        _id: 0,
        sku: "$_id",
        name: 1,
        prices: 1
      }},
      { $sort: { sku: 1 } },
      { $skip: skip },
      { $limit: limitNumber }
    ]);

    console.log(`Fetched ${products.length} products`);

    // Fetch additional product details from tbl_products
    const productSkus = products.map(p => p.sku);
    const productDetails = await Product.find({ sku: { $in: productSkus } })
      .select('sku id stock availablestock')
      .lean();
    const productMap = new Map(productDetails.map(product => [product.sku, product]));

    // Combine product details
    const result = products.map(product => {
      const additionalDetails = productMap.get(product.sku);
      return {
        ...product,
        stock: additionalDetails?.stock ?? null,
        availablestock: additionalDetails?.availablestock ?? null,
        id: additionalDetails?.id || null
      };
    });

    // Count total items
    const totalItems = await Price.countDocuments({ "listPrice.priceId": { $in: priceIdList } });

    res.json({
      items: result,
      totalItems,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalItems / limitNumber),
      priceIds: priceIdList
    });
  } catch (error) {
    console.error('Error fetching products with multiple prices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
