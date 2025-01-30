// controllers/client/setPinController.ts
import { Request, Response } from 'express';
import Client from '../../models/clientModel';

export const setPinController = async (req: Request, res: Response) => {
  try {
    const { pin, userId } = req.body;

    await Client.updateOne(
      { userId },
      { 
        $set: { 
          pin, 
          isPinVerified: true 
        } 
      }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in setPinController:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Internal server error' 
    });
  }
};

// controllers/client/verifyPinController.ts
export const verifyPinController = async (req: Request, res: Response) => {
    try {
      const { pin, userId } = req.body;
      
      // เพิ่ม select('+pin') เพื่อดึง pin field
      const client = await Client.findOne({ userId }).select('+pin');
      
      if (!client || client.pin !== pin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid PIN'
        });
      }
  
      await Client.updateOne(
        { userId },
        { $set: { isPinVerified: true } }
      );
  
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in verifyPinController:', error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

