// controllers/client/updateClientPrices.ts
import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore';

export const updateClientPrices = async (req: Request, res: Response) => {
  try {
    const { userId, priceIds } = req.body;

    if (!userId || !Array.isArray(priceIds)) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const config = await StoreConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'Store configuration not found' });
    }

    // Update each price level's allowedUsers
    const updatedListPrice = config.saleModel.listPrice.map(price => {
      if (priceIds.includes(price.id)) {
        // Add user if not already in allowedUsers
        if (!price.allowedUsers?.includes(userId)) {
          return {
            ...price,
            allowedUsers: [...(price.allowedUsers || []), userId]
          };
        }
      } else {
        // Remove user from allowedUsers
        return {
          ...price,
          allowedUsers: price.allowedUsers?.filter(id => id !== userId) || []
        };
      }
      return price;
    });

    config.saleModel.listPrice = updatedListPrice;
    await config.save();

    res.json({ message: 'Prices updated successfully' });
  } catch (error) {
    console.error('Error updating client prices:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};