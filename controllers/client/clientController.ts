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




  // ดึงข้อมูล PIN ของลูกค้า
export const getClientPin = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const client = await Client.findOne(
      { userId }, 
      'pin isPinVerified pinCreatedAt pinAttempts pinLastAttempt'
    ).select('+pin'); // ระบุให้ดึง field pin ที่ถูก select: false

    if (!client) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกค้า' });
    }

    res.json({
      pin: client.pin || null,
      isPinVerified: client.isPinVerified,
      pinCreatedAt: client.pinCreatedAt,
      pinAttempts: client.pinAttempts,
      pinLastAttempt: client.pinLastAttempt
    });

  } catch (error) {
    console.error('Error in getClientPin:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล PIN',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// อัพเดท PIN ของลูกค้า
export const updateClientPin = async (req: Request, res: Response) => {
  try {
    const { userId, pin } = req.body;

    // ตรวจสอบความถูกต้องของข้อมูล
    if (!userId || !pin) {
      return res.status(400).json({ message: 'กรุณาระบุ userId และ pin' });
    }

    // Validate PIN format
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ message: 'PIN ต้องเป็นตัวเลข 4-6 หลัก' });
    }

    // อัพเดทข้อมูล
    const updatedClient = await Client.findOneAndUpdate(
      { userId },
      {
        $set: {
          pin,
          isPinVerified: false, // รีเซ็ตสถานะการยืนยัน PIN
          pinCreatedAt: new Date(),
          pinAttempts: 0, // รีเซ็ตจำนวนครั้งที่ใส่ผิด
          pinLastAttempt: null
        }
      },
      { 
        new: true,
        select: '-pin' // ไม่ส่ง PIN กลับไปในการตอบกลับ
      }
    );

    if (!updatedClient) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลลูกค้า' });
    }

    // ส่งข้อมูลการอัพเดทกลับ
    res.json({
      message: 'อัพเดท PIN สำเร็จ',
      client: {
        userId: updatedClient.userId,
        isPinVerified: updatedClient.isPinVerified,
        pinCreatedAt: updatedClient.pinCreatedAt
      }
    });

  } catch (error) {
    console.error('Error in updateClientPin:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการอัพเดท PIN',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};