import { Request, Response } from 'express';
import Client, { IClient } from '../../models/clientModel';
import StoreConfig from '../../models/configStore';

export const getClient = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    const clients: IClient[] = await Client.find({})
      .skip(skip)
      .limit(limit)
      .exec();
    
    const config = await StoreConfig.findOne();
    
    const itemsWithPrices = clients.map(client => {
      const accessiblePrices = config?.saleModel.listPrice
        .filter(price => price.allowedUsers?.includes(client.userId))
        .map(price => ({
          id: price.id,
          name: price.name
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
    res.status(500).json({ message: 'Internal server error' });
  }
};

