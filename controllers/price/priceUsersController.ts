import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore';

export const updatePriceUsers = async (req: Request, res: Response) => {
  try {
    const { priceId, userIds } = req.body;

    if (!priceId || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const config = await StoreConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'Config not found' });
    }

    const priceIndex = config.saleModel.listPrice.findIndex(p => p.id === priceId);
    if (priceIndex === -1) {
      return res.status(404).json({ message: 'Price level not found' });
    }

    // อัพเดท allowedUsers
    config.saleModel.listPrice[priceIndex].allowedUsers = userIds;
    await config.save();

    res.json({
      success: true,
      message: 'Users updated successfully',
      data: {
        priceId,
        priceName: config.saleModel.listPrice[priceIndex].name,
        allowedUsers: userIds
      }
    });
  } catch (error) {
    console.error('Error updating price users:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update users',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};