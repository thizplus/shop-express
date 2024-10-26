// controllers/client/searchClient.ts
import { Request, Response } from 'express';
import Client, { IClient } from '../../models/clientModel';
import StoreConfig from '../../models/configStore';

export const searchClient = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '10' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // ใช้ Promise.all เพื่อ fetch ทั้ง clients และ config พร้อมกัน
    const [clients, config] = await Promise.all([
      Client.find({
        $or: [
          { displayName: searchRegex }
        ]
      })
        .skip((currentPage - 1) * limitNumber)
        .limit(limitNumber)
        .lean()
        .exec(),
      StoreConfig.findOne().lean()
    ]);

    // เพิ่มข้อมูล accessiblePrices เข้าไปใน client แต่ละคน
    const itemsWithPrices = clients.map(client => {
      const accessiblePrices = config?.saleModel.listPrice
        .filter(price => price.allowedUsers?.includes(client.userId))
        .map(price => ({
          id: price.id,
          name: price.name
        })) || [];

      return {
        ...client,
        accessiblePrices
      };
    });

    const totalItems = await Client.countDocuments({
      $or: [
        { displayName: searchRegex }
      ]
    });

    const totalPages = Math.ceil(totalItems / limitNumber);

    res.json({
      items: itemsWithPrices, // ส่งข้อมูลที่มี accessiblePrices แล้ว
      currentPage,
      totalPages,
      totalItems
    });
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};