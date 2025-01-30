import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore';
import PriceList from '../../models/priceListModel';

export const getPriceLiffId = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params;
    
    // หา price จาก PriceList ก่อน
    const priceList = await PriceList.findById(priceId);
    if (!priceList) {
      return res.status(404).json({ message: 'Price not found in PriceList' });
    }

    // หา config และ price ที่ตรงกับ priceId จาก PriceList
    const config = await StoreConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'Config not found' });
    }

    const price = config.saleModel.listPrice.find(p => p.id === priceList.priceId);
    if (!price) {
      return res.status(404).json({ message: 'Price not found in StoreConfig' });
    }

    res.json({ liffId: price.LIFF_ID || null });
  } catch (error) {
    console.error('Error fetching LIFF ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updatePriceLiffId = async (req: Request, res: Response) => {
  try {
    const { priceId, liffId } = req.body;

    if (!priceId || !liffId) {
      return res.status(400).json({ message: 'Missing required parameters' });
    }

    // ค้นหาใน PriceList ก่อน
    const priceList = await PriceList.findById(priceId);
    if (!priceList) {
      return res.status(404).json({ message: 'Price not found in PriceList' });
    }

    const config = await StoreConfig.findOne();
    if (!config) {
      return res.status(404).json({ message: 'Config not found' });
    }

    const priceIndex = config.saleModel.listPrice.findIndex(p => p.id === priceList.priceId);
    if (priceIndex === -1) {
      return res.status(404).json({ message: 'Price not found in StoreConfig' });
    }

    config.saleModel.listPrice[priceIndex].LIFF_ID = liffId;
    await config.save();

    res.json({ 
      message: 'LIFF ID updated successfully',
      liffId 
    });
  } catch (error) {
    console.error('Error updating LIFF ID:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};