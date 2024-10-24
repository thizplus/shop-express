import { Request, Response } from 'express';
import Client from '../../models/clientModel';

export const searchClients = async (req: Request, res: Response) => {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ message: 'Query parameter is required' });
    }

    const clients = await Client.find({
      $or: [
        { displayName: { $regex: query, $options: 'i' } },
        { userId: { $regex: query, $options: 'i' } }
      ]
    })
    .select('userId displayName pictureUrl')
    .limit(10)
    .lean();

    res.json(clients);
  } catch (error) {
    console.error('Error searching clients:', error);
    res.status(500).json({ 
      message: 'Failed to search clients',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getBulkClients = async (req: Request, res: Response) => {
    try {
      const { ids } = req.query;
      
      console.log('Received IDs:', ids); // เพิ่ม log
  
      if (!ids || typeof ids !== 'string') {
        return res.status(400).json({ 
          success: false,
          message: 'IDs parameter is required' 
        });
      }
  
      const userIds = ids.split(',').filter(id => id); // กรอง empty string ออก
      
      console.log('Processed userIds:', userIds); // เพิ่ม log
  
      if (userIds.length === 0) {
        return res.json([]); // ส่ง empty array ถ้าไม่มี IDs
      }
  
      const clients = await Client.find({
        userId: { $in: userIds }
      })
      .select('userId displayName pictureUrl')
      .lean();
  
      console.log('Found clients:', clients); // เพิ่ม log
  
      // เรียงลำดับและกรอง undefined
      const sortedClients = userIds
        .map(id => clients.find(client => client.userId === id))
        .filter((client): client is NonNullable<typeof client> => client !== undefined);
  
      console.log('Sorted clients:', sortedClients); // เพิ่ม log
  
      res.json(sortedClients);
    } catch (error) {
      console.error('Error fetching bulk clients:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to fetch clients',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };