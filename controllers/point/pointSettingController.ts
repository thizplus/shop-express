// controllers/point/pointSettingController.ts
import { Request, Response } from 'express';
import PointSetting from '../../models/pointSettingModel';

// ดึงการตั้งค่าระบบแต้ม
export const getPointSetting = async (req: Request, res: Response) => {
  try {
    let setting = await PointSetting.findOne();
    
    // ถ้าไม่มีการตั้งค่า ให้สร้างค่าเริ่มต้น
    if (!setting) {
      setting = await PointSetting.create({
        isActive: false,
        pointsPerBaht: 0
      });
    }
    
    res.json(setting);
  } catch (error) {
    console.error('Error in getPointSetting:', error);
    res.status(500).json({ 
      message: 'Error fetching point settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// อัพเดตการตั้งค่าระบบแต้ม
export const updatePointSetting = async (req: Request, res: Response) => {
  try {
    const { isActive, pointsPerBaht } = req.body;

    let setting = await PointSetting.findOne();

    if (setting) {
      // อัพเดตการตั้งค่าที่มีอยู่
      setting.isActive = isActive ?? setting.isActive;
      setting.pointsPerBaht = pointsPerBaht ?? setting.pointsPerBaht;
      await setting.save();
    } else {
      // สร้างการตั้งค่าใหม่
      setting = await PointSetting.create({
        isActive: isActive ?? false,
        pointsPerBaht: pointsPerBaht ?? 0
      });
    }

    res.json(setting);
  } catch (error) {
    console.error('Error in updatePointSetting:', error);
    res.status(400).json({
      message: 'Error updating point settings',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};