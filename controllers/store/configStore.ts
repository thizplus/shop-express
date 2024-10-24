import { Request, Response } from 'express';
import StoreConfig, { IConfig } from '../../models/configStore';

function deepMerge(target: any, source: any) {
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] instanceof Object && key in target) {
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
  return target;
}

export const getStoreConfig = async (req: Request, res: Response) => {
  try {
    const config = await StoreConfig.findOneOrCreate();
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving store configuration', error });
  }
};

export const updateStoreConfig = async (req: Request, res: Response) => {
  try {
    const updateData: Partial<IConfig> = req.body;
    let config = await StoreConfig.findOneOrCreate();
    
    // Deep merge function (as before)
    function deepMerge(target: any, source: any) {
      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          if (source[key] instanceof Object && key in target) {
            deepMerge(target[key], source[key]);
          } else if (source[key] !== undefined && source[key] !== null) {
            // Only update if the value is not undefined or null
            target[key] = source[key];
          }
        }
      }
      return target;
    }

    // Deep merge the existing config with the update data
    const updatedConfig = deepMerge(config.toObject(), updateData);

    // Assign the merged config back to the document
    Object.assign(config, updatedConfig);

    await config.save();
    res.status(200).json(config);
  } catch (error) {
    console.error('Error updating store configuration:', error);
    res.status(500).json({ message: 'Error updating store configuration', error: error instanceof Error ? error.message : 'Unknown error' });
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