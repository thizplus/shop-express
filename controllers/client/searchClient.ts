// controllers/client/searchClient.ts
import { Request, Response } from 'express';
import Client, { IClient } from '../../models/clientModel';
import PriceList from '../../models/priceListModel';

export const searchClient = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '20' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string);
    const limitNumber = parseInt(limit as string);
    const skip = (currentPage - 1) * limitNumber;

    // ค้นหา clients และ price lists พร้อมกัน
    const [clients, priceLists] = await Promise.all([
      Client.find({
        $or: [
          { displayName: searchRegex },
          { userId: searchRegex } // เพิ่มการค้นหาจาก userId
        ]
      })
        .skip(skip)
        .limit(limitNumber)
        .exec(),

      PriceList.find(
        { status: true },
        'priceId priceName allowedUsers'
      )
    ]);

    // Map ข้อมูลเหมือนใน getClient
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

    // หาจำนวนทั้งหมดของผลการค้นหา
    const totalItems = await Client.countDocuments({
      $or: [
        { displayName: searchRegex },
        { userId: searchRegex }
      ]
    });

    res.json({
      items: itemsWithPrices,
      currentPage,
      totalPages: Math.ceil(totalItems / limitNumber),
      totalItems
    });

  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการค้นหาข้อมูล',
      error: error instanceof Error ? error.message : 'Unknown error',
      status: false
    });
  }
};