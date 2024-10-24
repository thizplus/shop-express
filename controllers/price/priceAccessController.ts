// controllers/config/priceAccessController.ts
import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore';

export const getPriceAccess = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params;

    const config = await StoreConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'Config not found' });
    }

    const priceConfig = config.saleModel.listPrice.find(p => p.id === priceId);
    if (!priceConfig) {
      return res.status(404).json({ message: 'Price level not found' });
    }

    res.json({
      id: priceConfig.id,
      name: priceConfig.name,
      minPurchase: priceConfig.minPurchase,
      allowedUsers: priceConfig.allowedUsers || []
    });

  } catch (error) {
    console.error('Error fetching price access:', error);
    res.status(500).json({ 
      message: 'Failed to fetch price access',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};


