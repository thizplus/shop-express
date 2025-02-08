// controllers/client/clientController.ts
import { Request, Response } from 'express';
import Client, { IClient } from '../../models/clientModel';
import PriceList from '../../models/priceListModel';

export const getClient = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    // ดึงข้อมูล clients
    const clients: IClient[] = await Client.find({})
      .skip(skip)
      .limit(limit)
      .exec();
    
    // ดึงข้อมูล price lists ทั้งหมดครั้งเดียว
    const priceLists = await PriceList.find(
      { status: true },
      'priceId priceName allowedUsers'
    );
    
    // Map clients พร้อมข้อมูลราคาที่เข้าถึงได้
    const itemsWithPrices = clients.map(client => {
      const accessiblePrices = priceLists
        .filter(price => price.allowedUsers?.includes(client.userId))
        .map(price => ({
          id: price.priceId,
          name: price.priceName
        }));
      
      return {
        ...client.toObject(),
        accessiblePrices
      };
    });

    const totalItems: number = await Client.countDocuments();
    
    res.json({
      items: itemsWithPrices,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};