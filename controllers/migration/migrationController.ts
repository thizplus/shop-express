// controllers/migrationController.ts
import { Request, Response } from 'express';
import StoreConfig from '../../models/configStore';
import PriceList from '../../models/priceListModel';

export const migrateAllowedUsers = async (req: Request, res: Response) => {
  try {
    // 1. ดึงข้อมูลจาก Config
    const config = await StoreConfig.findOne();
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'Store config not found'
      });
    }

    console.log('Found store config:', {
      id: config._id,
      saleModel: config.saleModel?.listPrice?.length || 0
    });

    const operations = [];
    let migratedCount = 0;

    // 2. สร้าง operations สำหรับ bulk write
    if (config.saleModel?.listPrice) {
      for (const price of config.saleModel.listPrice) {
        console.log('Processing price:', {
          id: price.id,
          name: price.name,
          allowedUsers: price.allowedUsers
        });

        operations.push({
          updateOne: {
            filter: { priceId: price.id },
            update: {
              $set: {
                priceName: price.name,
                allowedUsers: Array.isArray(price.allowedUsers) ? price.allowedUsers : [],
                minPurchase: price.minPurchase || 0,
                LIFF_ID: price.LIFF_ID || null,
                status: true
              }
            },
            upsert: true
          }
        });
        migratedCount++;
      }
    }

    // 3. ทำ bulk write
    let result;
    if (operations.length > 0) {
      console.log('Executing operations:', JSON.stringify(operations, null, 2));
      result = await PriceList.bulkWrite(operations);
      console.log('Bulk write result:', result);
    } else {
      console.log('No operations to execute');
    }

    // 4. ดึงข้อมูลที่ migrate แล้ว และตรวจสอบ
    const migratedData = await PriceList.find({}).lean();
    
    // Log ข้อมูลที่ migrate แล้ว
    console.log('Migrated data:', migratedData.map(item => ({
      priceId: item.priceId,
      priceName: item.priceName,
      allowedUsers: item.allowedUsers
    })));

    // เปรียบเทียบข้อมูลต้นทางและปลายทาง
    let validationErrors = [];
    if (config.saleModel?.listPrice) {
      for (const sourcePrice of config.saleModel.listPrice) {
        const migratedPrice = migratedData.find(m => m.priceId === sourcePrice.id);
        if (!migratedPrice) {
          validationErrors.push(`Price ${sourcePrice.id} not found in migrated data`);
        } else if (!Array.isArray(migratedPrice.allowedUsers)) {
          validationErrors.push(`Invalid allowedUsers for price ${sourcePrice.id}`);
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(500).json({
        success: false,
        message: 'Migration validation failed',
        errors: validationErrors
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      totalMigrated: migratedCount,
      result,
      data: migratedData
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

// ฟังก์ชั่นสำหรับดูข้อมูลที่ migrate แล้ว
export const getMigratedData = async (req: Request, res: Response) => {
  try {
    const priceLists = await PriceList.find({}).lean();
    
    return res.status(200).json({
      success: true,
      total: priceLists.length,
      data: priceLists
    });

  } catch (error) {
    console.error('Failed to fetch migrated data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};