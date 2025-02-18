// controllers/product/updatePrice.ts
import { Request, Response } from 'express';
import Price from '../../models/priceModel';

export const updatePrice = async (req: Request, res: Response) => {
  try {
    const { sku, priceId, price } = req.body;

    // Validate input
    if (!sku || !priceId || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: sku, priceId, and price are required'
      });
    }

    // Validate price value
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        success: false,
        message: 'Price must be a non-negative number'
      });
    }

    // Find and update the price
    const result = await Price.findOneAndUpdate(
      {
        sku,
        'listPrice.priceId': priceId
      },
      {
        $set: {
          'listPrice.$.price': price,
       //   'listPrice.$.updatedAt': new Date()
        }
      },
      {
        new: true, // Return the updated document
        runValidators: true // Run schema validators
      }
    );

    // Check if price exists
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Price not found for the given SKU and priceId'
      });
    }

    // Return success response
    res.json({
      success: true,
      message: 'Price updated successfully',
      data: {
        sku,
        priceId,
        price,
        updatedPrice: result.listPrice.find(p => p.priceId === priceId)
      }
    });

  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};
