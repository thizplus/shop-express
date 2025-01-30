// controllers/client/getClientByUserId.ts
import { Request, Response } from 'express';
import Client from '../../models/clientModel';

export const getClientByUserId = async (req: Request, res: Response) => {
  try {
    // ใช้ select('+pin') เพื่อดึง pin field ที่ถูก mark select: false
    const client = await Client.findOne({ userId: req.params.userId })
      .select('+pin');

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    res.status(200).json({
      success: true,
      data: client
    });
    
  } catch (error) {
    console.error('Error in getClientByUserId:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error'
    });
  }
};


