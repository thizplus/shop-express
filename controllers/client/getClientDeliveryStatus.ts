// controllers/client/getClientDeliveryStatus.ts
import { Request, Response } from 'express';
import Client from '../../models/clientModel';

export const getClientDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const client = await Client.findOne({ userId });

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({
      enableGrabDelivery: client.enableGrabDelivery || false
    });

  } catch (error) {
    console.error('Error fetching client delivery status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};