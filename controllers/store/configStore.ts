import { Request, Response } from 'express';
import multer from 'multer';
import StoreConfig, { IConfig, IDisplayConfig, ISliderImage, ISlipOK } from '../../models/configStore';
import uploadImageQRToSpaces from '../../functions/uploadImageQRToSpaces';

// กำหนดค่า multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer processing file:', {
      fieldname: file.fieldname,
      mimetype: file.mimetype,
      originalname: file.originalname
    });
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
}).fields([
  { name: 'qr_image', maxCount: 1 },
  { name: 'logo', maxCount: 1 },
  { name: 'slider', maxCount: 10 }
]);



export const updateStoreConfig = async (req: Request, res: Response) => {
  console.log('Starting updateStoreConfig...');
  console.log('Raw request body:', req.body);

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size exceeds the limit of 5MB' });
      }
      return res.status(400).json({ message: 'Error uploading file', error: err.message });
    } else if (err) {
      console.error('Unknown error in multer:', err);
      return res.status(400).json({ message: 'Unknown error', error: err instanceof Error ? err.message : 'An unknown error occurred' });
    }

    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let updateData: Partial<IConfig>;

      // แปลง body เป็น object
      if (typeof req.body.config === 'string') {
        updateData = JSON.parse(req.body.config);
      } else if (typeof req.body === 'string') {
        updateData = JSON.parse(req.body);
      } else {
        updateData = req.body;
      }

      // ลบ property config ที่ซ้ำซ้อน
      if ('config' in updateData) {
        delete updateData.config;
      }

      // อัพโหลดไฟล์ถ้ามี
      if (files && Object.keys(files).length > 0) {
        if (files.qr_image?.[0]) {
          const imageUrl = await uploadImageQRToSpaces(files.qr_image[0], 'qr-codes');
          if (imageUrl) {
            const slipOKConfig: ISlipOK = {
              ...(updateData.slipOK || {}),
              API_URL: updateData.slipOK?.API_URL || '',
              API_KEY: updateData.slipOK?.API_KEY || '',
              ENABLED: updateData.slipOK?.ENABLED || false,
              qr_image: imageUrl
            };
            updateData.slipOK = slipOKConfig;
          }
        }

        if (files.logo?.[0]) {
          const logoUrl = await uploadImageQRToSpaces(files.logo[0], 'logos');
          if (logoUrl) {
            const displayConfig: IDisplayConfig = {
              ...(updateData.displayConfig || {}),
              logo: logoUrl,
              sliders: updateData.displayConfig?.sliders || [],
              primaryColor: updateData.displayConfig?.primaryColor || '#000000',
              isProtected: updateData.displayConfig?.isProtected || false // เพิ่มค่าเริ่มต้น
            };
            updateData.displayConfig = displayConfig;
          }
        }

        if (files.slider?.length) {
          const newSliders: ISliderImage[] = [];
          
          for (const file of files.slider) {
            const imageUrl = await uploadImageQRToSpaces(file, 'sliders');
            if (imageUrl) {
              newSliders.push({
                id: `${Date.now()}-${newSliders.length}`,
                url: imageUrl,
                order: newSliders.length
              });
            }
          }
         
          if (newSliders.length > 0) {
            // กรองเอาเฉพาะ sliders ที่ไม่มี URL เป็น blob
            const existingSliders = (updateData.displayConfig?.sliders || [])
              .filter(slider => !slider.url.startsWith('blob:'));
            
            const displayConfig: IDisplayConfig = {
              ...(updateData.displayConfig || {}),
              logo: updateData.displayConfig?.logo || '',
              primaryColor: updateData.displayConfig?.primaryColor || '#000000',
              sliders: [...existingSliders, ...newSliders],
              isProtected: updateData.displayConfig?.isProtected || false // เพิ่มค่าเริ่มต้น
            };
            updateData.displayConfig = displayConfig;
          }
        }


      }

      // ดึง config ปัจจุบัน
      let config = await StoreConfig.findOneOrCreate();
      const currentConfig = config.toObject();

      // Merge function ใหม่
      function deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
        // ถ้า source ไม่ใช่ object หรือเป็น null ให้คืนค่า target
        if (!source || typeof source !== 'object') return source;
        
        // ถ้าเป็น Array ให้คืนค่า source array เลย
        if (Array.isArray(source)) return [...source];
        
        // สร้าง object ใหม่จาก target
        const merged = { ...target };
        
        for (const key in source) {
          // กรณีพิเศษสำหรับ sliders
          if (key === 'sliders') {
            merged[key] = source[key];
            continue;
          }
          
          // ถ้าเป็น object ให้ทำ deep merge
          if (source[key] instanceof Object && !Array.isArray(source[key])) {
            merged[key] = deepMerge(merged[key] || {}, source[key]);
          } else {
            merged[key] = source[key];
          }
        }
        
        return merged;
      }

      // Merge configs
      const updatedConfig = deepMerge(currentConfig, updateData);
      console.log('Merged config:', JSON.stringify(updatedConfig, null, 2));

      // Save config
      Object.assign(config, updatedConfig);
      await config.save();
      
      res.status(200).json(config);

    } catch (error) {
      console.error('Error in updateStoreConfig:', error);
      res.status(500).json({ 
        message: 'Error updating store configuration',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

export const getStoreConfig = async (req: Request, res: Response) => {
  try {
    const config = await StoreConfig.findOneOrCreate();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving store configuration', error });
  }
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