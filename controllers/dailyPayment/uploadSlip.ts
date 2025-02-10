// controllers/dailyPayment/uploadSlip.ts
import { Request, Response } from 'express';
import multer from 'multer';
import uploadImageToSpaces from '../../functions/uploadImageToSpaces';
import dotenv from 'dotenv';
import { verifySlip } from '../slipOK/verifySlip';

dotenv.config();

const storage = multer.memoryStorage();

const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // รองรับทั้ง image/ และ application/octet-stream
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/octet-stream') {
    console.log('File accepted:', file.originalname, file.mimetype);
    cb(null, true);
  } else {
    console.log('File rejected:', file.originalname, file.mimetype);
    cb(new Error('Invalid file type. Only images are allowed.'));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter
});

export const uploadSlip = async (req: Request, res: Response) => {
  // กำหนด allowed file types
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/octet-stream'  // สำหรับไฟล์จากมือถือ
  ];

  // ฟังก์ชันตรวจสอบนามสกุลไฟล์
  const isValidFileExtension = (filename: string): boolean => {
    const allowedExtensions = ['.jpg', '.jpeg', '.png'];
    const ext = filename.toLowerCase().slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2);
    return allowedExtensions.includes(`.${ext}`);
  };

  upload.single('file')(req, res, async function (err) {
    // จัดการ error จาก multer
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          status: 'error', 
          message: 'ขนาดไฟล์เกิน 5MB กรุณาลองใหม่อีกครั้ง' 
        });
      }
      return res.status(400).json({ 
        status: 'error', 
        message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์', 
        error: err.message 
      });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(400).json({ 
        status: 'error', 
        message: 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', 
        error: err instanceof Error ? err.message : 'An unknown error occurred' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'กรุณาเลือกไฟล์ที่ต้องการอัพโหลด' 
      });
    }

    try {
      // ตรวจสอบนามสกุลไฟล์
      if (!isValidFileExtension(req.file.originalname)) {
        return res.status(400).json({
          status: 'error',
          message: 'รองรับเฉพาะไฟล์ภาพนามสกุล .jpg, .jpeg, หรือ .png เท่านั้น'
        });
      }

      // จัดการ mimetype สำหรับไฟล์จากมือถือ
      if (req.file.mimetype === 'application/octet-stream') {
        const fileExt = req.file.originalname.split('.').pop()?.toLowerCase();
        if (fileExt === 'jpg' || fileExt === 'jpeg') {
          req.file.mimetype = 'image/jpeg';
        } else if (fileExt === 'png') {
          req.file.mimetype = 'image/png';
        }
      }

      // ตรวจสอบ mimetype
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          status: 'error',
          message: 'รูปแบบไฟล์ไม่ถูกต้อง กรุณาอัพโหลดไฟล์ภาพเท่านั้น'
        });
      }

      console.log('Processing upload:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const downloadURL = await uploadImageToSpaces(req.file, 'daily-payment-slips');
      
      if (!downloadURL) {
        throw new Error('ไม่สามารถอัพโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
      }

      return res.status(200).json({ 
        status: 'success',
        data: {
          url: downloadURL
        }
      });

    } catch (error) {
      console.error('Error in uploadSlip:', error);
      return res.status(500).json({ 
        status: 'error',
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ กรุณาลองใหม่อีกครั้ง'
      });
    }
  });
};

export const verifyAndUpdatePayment = async (req: Request, res: Response) => {
  try {
    const { slipUrl, amount, docId, slipOK } = req.body;

    if (!slipUrl || !amount || !docId || !slipOK) {
      return res.status(400).json({
        status: 'error',
        message: 'ข้อมูลไม่ครบถ้วน'
      });
    }

    // ตรวจสอบสลิป
    const verifyResult = await new Promise<any>((resolve) => {
      const mockRes = {
        status: function() { return this; },
        json: function(data: any) { resolve(data); }
      };

      verifySlip({
        body: {
          url: slipUrl,
          amount: parseFloat(amount),
          slipokApiKey: slipOK.API_KEY,
          slipokApiUrl: slipOK.API_URL
        }
      } as Request, mockRes as any);
    });

    if (verifyResult.status === 'success' && verifyResult.data) {
      const warehouseResponse = await fetch(`${process.env.STORE_API_URL}/api/daily-payment/${docId}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          slipUrl,
          amount: verifyResult.data.amount,
          verifyResult: verifyResult.data
        })
      });

      if (!warehouseResponse.ok) {
        const errorText = await warehouseResponse.text();
        console.error('Warehouse error response:', errorText);
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'ไม่สามารถอัพเดทข้อมูลที่คลังสินค้าได้');
        } catch (e) {
          throw new Error(`ไม่สามารถอัพเดทข้อมูลที่คลังสินค้าได้: ${errorText}`);
        }
      }

      const warehouseResult = await warehouseResponse.json();

      return res.status(200).json({
        status: 'success',
        data: {
          slipUrl,
          amount: verifyResult.data.amount,
          ...warehouseResult
        }
      });
    }

    return res.status(400).json({
      status: 'error',
      message: verifyResult.message || 'ไม่สามารถตรวจสอบสลิปได้'
    });

  } catch (error) {
    console.error('Error in verifyAndUpdatePayment:', error);
    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการตรวจสอบสลิป'
    });
  }
};