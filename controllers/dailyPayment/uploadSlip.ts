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
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter
});

export const uploadSlip = async (req: Request, res: Response) => {
  upload.single('file')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          status: 'error', 
          message: 'File size exceeds the limit of 5MB' 
        });
      }
      return res.status(400).json({ 
        status: 'error', 
        message: 'Error uploading file', 
        error: err.message 
      });
    } else if (err) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Unknown error', 
        error: err instanceof Error ? err.message : 'An unknown error occurred' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'No file uploaded' 
      });
    }

    try {
      // แก้ไข mimetype สำหรับไฟล์จากมือถือ
      if (req.file.mimetype === 'application/octet-stream') {
        req.file.mimetype = 'image/jpeg';
      }

      console.log('Processing upload:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const downloadURL = await uploadImageToSpaces(req.file, 'daily-payment-slips');
      
      if (downloadURL) {
        return res.status(200).json({ 
          status: 'success',
          data: {
            url: downloadURL
          }
        });
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error in uploadSlip:', error);
      return res.status(500).json({ 
        status: 'error',
        message: error instanceof Error ? error.message : 'An unknown error occurred'
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