import { Request, Response } from 'express';
import Price from '../../../models/priceModel';

export const updatePrice = async (req: Request, res: Response) => {
  const { sku, priceId, price } = req.body;

  if (!sku || !priceId || price === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const result = await Price.updateOne(
      { 
        sku: sku,
        'listPrice.priceId': priceId
      },
      { 
        $set: { 'listPrice.$.price': price }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Product or price not found' });
    }

    res.json({
      message: 'Price updated successfully',
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ message: 'Error updating price', error: (error as Error).message });
  }
};