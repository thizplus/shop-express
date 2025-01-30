// controllers/client/updateGrabDelivery.ts
import { Request, Response } from 'express';
import Client from '../../models/clientModel';

export const updateGrabDelivery = async (req: Request, res: Response) => {
  try {
    const { userId, enableGrabDelivery } = req.body;

    if (!userId || typeof enableGrabDelivery !== 'boolean') {
      return res.status(400).json({ message: 'Invalid request body' });
    }

    const updatedClient = await Client.findOneAndUpdate(
      { userId },
      { enableGrabDelivery },
      { new: true }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'Client not found' });
    }

    res.json({ message: 'Grab delivery status updated successfully' });
  } catch (error) {
    console.error('Error updating grab delivery status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};