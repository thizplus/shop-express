// controllers/priceController.ts
import { Request, Response } from 'express';
import Price from '../../models/priceModel';
import Product from '../../models/productModel';


interface BulkOperation {
  updateOne: {
    filter: { sku: string };
    update: {
      $set: { name: string };
      $push: {
        listPrice: {
          priceId: string;
          priceName: string;
          price: number;
          createdAt: Date;
          updatedAt: Date;
        };
      };
    };
    upsert: boolean;
  };
}
// Helper function to generate a random 9-character alphanumeric ID
const generateAlphanumericId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 9; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Helper function to check if an ID or name already exists
const isUniqueIdAndName = async (id: string, name: string): Promise<boolean> => {
  const existingPrice = await Price.findOne({
    $or: [
      { 'listPrice.id': id },
      { 'listPrice.name': name }
    ]
  });
  return !existingPrice;
};

// Helper function to generate a unique ID that's not used as a name
const generateUniqueIdAndName = async (name: string): Promise<string> => {
  let id = generateAlphanumericId();
  let attempts = 0;
  const maxAttempts = 10; // Limit the number of attempts to prevent infinite loops

  while (!(await isUniqueIdAndName(id, name)) && attempts < maxAttempts) {
    id = generateAlphanumericId();
    attempts++;
  }

  if (attempts === maxAttempts) {
    throw new Error('Failed to generate a unique ID after multiple attempts');
  }

  return id;
};


export const createOrUpdateStorePrice = async (req: Request, res: Response) => {
  try {
    const { priceName, defaultPrice = 0, copyFromId } = req.body;

    if (!priceName) {
      return res.status(400).json({ message: 'Price name is required' });
    }

    // Check if the price name already exists
    const existingPriceWithName = await Price.findOne({ 'listPrice.priceName': priceName });
    if (existingPriceWithName) {
      return res.status(400).json({ message: 'Price name already exists' });
    }

    const newPriceId = generateAlphanumericId();
    const now = new Date();

    // Fetch source prices if copyFromId is provided
    const sourcePrices: Record<string, number> = {};
    if (copyFromId) {
      const sourcePriceTiers = await Price.find({ 'listPrice.priceId': copyFromId });
      sourcePriceTiers.forEach(tier => {
        const sourcePrice = tier.listPrice.find(p => p.priceId === copyFromId);
        if (sourcePrice) {
          sourcePrices[tier.sku] = sourcePrice.price;
        }
      });
    }

    // Update or create new prices for all SKUs
    const bulkOps: BulkOperation[] = [];
    const products = await Product.find({}, 'sku name');

    products.forEach(product => {
      const priceToSet = sourcePrices[product.sku] || defaultPrice;
      bulkOps.push({
        updateOne: {
          filter: { sku: product.sku },
          update: {
            $set: { name: product.name },
            $push: {
              listPrice: {
                priceId: newPriceId,
                priceName: priceName,
                price: priceToSet,
                createdAt: now,
                updatedAt: now
              }
            }
          },
          upsert: true
        }
      });
    });

    const result = await Price.bulkWrite(bulkOps);

    res.status(200).json({
      message: 'New price added to all products',
      modifiedCount: result.modifiedCount,
      upsertedCount: result.upsertedCount,
      newPriceId: newPriceId
    });

  } catch (error) {
    console.error('Error in createOrUpdateStorePrice:', error);
    res.status(500).json({ message: 'Internal server error', error: error instanceof Error ? error.message : String(error) });
  }
};