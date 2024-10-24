import { Request, Response } from 'express';
import multer from 'multer';
import uploadImageToFirebase from '../../functions/uploadSlipToFirebase';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // จำกัดขนาดไฟล์ที่ 5MB
  },
  fileFilter: (req, file, cb) => {
    // ตรวจสอบ MIME type
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

export const uploadSlip = async (req: Request, res: Response) => {
  upload.single('file')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the limit of 5MB' });
      }
      return res.status(400).json({ message: 'Error uploading file', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'Unknown error', error: err instanceof Error ? err.message : 'An unknown error occurred' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const downloadURL = await uploadImageToFirebase(req.file, 'slips');
      
      if (downloadURL) {
        res.status(200).json({ message: 'File uploaded successfully', url: downloadURL });
      } else {
        throw new Error('Failed to upload file to Firebase');
      }
    } catch (error) {
      console.error('Error in uploadSlip:', error);
      res.status(500).json({ 
        message: 'Error uploading to Firebase', 
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      });
    }
  });
};