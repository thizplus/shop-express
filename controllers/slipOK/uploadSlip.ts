// controllers/uploadSlipController.ts
import { Request, Response } from 'express';
import multer from 'multer';
import uploadImageToSpaces from '../../functions/uploadImageToSpaces';

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
  upload.single('file')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the limit of 5MB' });
      }
      return res.status(400).json({ message: 'Error uploading file', error: err.message });
    } else if (err) {
      console.error('Unknown upload error:', err);
      return res.status(400).json({ 
        message: 'Unknown error', 
        error: err instanceof Error ? err.message : 'An unknown error occurred' 
      });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      // กำหนด mimetype เป็น image/jpeg ถ้าเป็น octet-stream
      if (req.file.mimetype === 'application/octet-stream') {
        req.file.mimetype = 'image/jpeg';
      }

      console.log('Uploading file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      const downloadURL = await uploadImageToSpaces(req.file, 'slips');
      
      if (downloadURL) {
        return res.status(200).json({ 
          success: true,
          message: 'File uploaded successfully', 
          url: downloadURL 
        });
      } else {
        throw new Error('Failed to upload file');
      }
    } catch (error) {
      console.error('Error in uploadSlip:', error);
      return res.status(500).json({ 
        success: false,
        message: 'Error uploading file', 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
};