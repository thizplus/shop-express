import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore';
import PriceList from '../../models/priceListModel';

export const getPriceLiffId = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params;
    const priceList = await PriceList.findOne({ priceId });

    if (!priceList) {
      return res.status(404).json({ message: 'Price list not found' });
    }

    res.json({ liffId: priceList.LIFF_ID || null });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const updatePriceLiffId = async (req: Request, res: Response) => {
  try {
    const { priceId, liffId } = req.body;

    if (!priceId || !liffId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    const priceList = await PriceList.findOneAndUpdate(
      { priceId },
      { LIFF_ID: liffId },
      { new: true }
    );

    if (!priceList) {
      return res.status(404).json({ message: 'Price list not found' });
    }

    res.json({
      message: 'LIFF ID updated successfully',
      priceName: priceList.priceName,
      liffId
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error' });
  }
};