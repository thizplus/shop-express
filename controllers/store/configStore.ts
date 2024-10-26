import { Request, Response } from 'express';
import StoreConfig, { IConfig } from '../../models/configStore';
import uploadImageQRToFirebase from '../../functions/uploadImageQRToFirebase';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

export const getStoreConfig = async (req: Request, res: Response) => {
  try {
    const config = await StoreConfig.findOneOrCreate();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving store configuration', error });
  }
};



export const updateStoreConfig = async (req: Request, res: Response) => {
  upload.single('qr_image')(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the limit of 5MB' });
      }
      return res.status(400).json({ message: 'Error uploading file', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'Unknown error', error: err instanceof Error ? err.message : 'An unknown error occurred' });
    }

    try {
      let updateData: Partial<IConfig>;
      
      if (req.file) {
        updateData = JSON.parse(req.body.config);
        
        // ใช้ function เดียวกับ uploadSlip
        const imageUrl = await uploadImageQRToFirebase(req.file, 'qr-codes');
        
        if (imageUrl) {
          if (!updateData.slipOK) {
            updateData.slipOK = {
              API_URL: '',
              API_KEY: '',
              ENABLED: false,
              qr_image: imageUrl
            };
          } else {
            updateData.slipOK = {
              ...updateData.slipOK,
              qr_image: imageUrl
            };
          }
        }
      } else {
        updateData = req.body;
      }

      let config = await StoreConfig.findOneOrCreate();

      function deepMerge(target: any, source: any) {
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            if (source[key] instanceof Object && key in target) {
              deepMerge(target[key], source[key]);
            } else if (source[key] !== undefined && source[key] !== null) {
              target[key] = source[key];
            }
          }
        }
        return target;
      }

      const updatedConfig = deepMerge(config.toObject(), updateData);
      Object.assign(config, updatedConfig);

      await config.save();
      res.status(200).json(config);

    } catch (error) {
      console.error('Error updating store configuration:', error);
      res.status(500).json({ 
        message: 'Error updating store configuration', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });
};


export const resetStoreConfig = async (req: Request, res: Response) => {
  try {
    await StoreConfig.deleteMany({});
    const newConfig = await StoreConfig.findOneOrCreate();
    res.status(200).json(newConfig);
  } catch (error) {
    res.status(500).json({ message: 'Error resetting store configuration', error });
  }
};