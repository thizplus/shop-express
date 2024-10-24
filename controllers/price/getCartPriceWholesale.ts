// api/store/prices/getCartPricesWholesale.ts
import { Request, Response } from 'express';
import Price, { IPrice } from '../../models/priceModel';

interface CartPriceRequest {
  skus: string[];
  priceId: string;
}

export const getCartPrices = async (req: Request, res: Response) => {
  try {
    const { skus, priceId } = req.body as CartPriceRequest;

    if (!skus || !priceId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // Find all prices for the given SKUs
    const prices = await Price.find({ sku: { $in: skus } }).lean();

    // Map prices to required format
    const productsWithPrices = skus.map(sku => {
      const priceData = prices.find(p => p.sku === sku);
      let price = 0;

      if (priceData?.listPrice) {
        const selectedPrice = priceData.listPrice.find(p => p.priceId === priceId);
        price = selectedPrice?.price || 0;
      }

      return { sku, price };
    });

    res.json(productsWithPrices);
  } catch (error) {
    console.error('Error fetching cart prices:', error);
    res.status(500).json({ message: 'Failed to fetch cart prices' });
  }
};