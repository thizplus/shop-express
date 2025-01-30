// src/controllers/client/updateCustomPrices.ts

import { Request, Response } from 'express';
import Client from '../../models/clientModel';

export const updateCustomPrices = async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { prices } = req.body;
  
      // Validate input
      if (!Array.isArray(prices)) {
        return res.status(400).json({ message: 'Invalid prices format' });
      }
  
      // Update client with new custom prices
      const client = await Client.findOneAndUpdate(
        { userId },
        { $set: { customPrices: prices } },
        { new: true }
      );
  
      if (!client) {
        return res.status(404).json({ message: 'Client not found' });
      }
  
      res.json({ success: true, customPrices: client.customPrices });
    } catch (error) {
      console.error('Error updating custom prices:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  };