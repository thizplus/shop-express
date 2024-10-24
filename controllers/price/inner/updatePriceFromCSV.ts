import { Request, Response } from 'express';
import csv from 'csv-parser';
import { Readable } from 'stream';
import Price from '../../../models/priceModel';

// Define a custom interface that extends Express.Request
interface RequestWithFile extends Request {
  file?: Express.Multer.File;
}

interface CSVRow {
  sku: string;
  priceId: string;
  price: string;
}

export const updatePriceFromCSV = async (req: RequestWithFile, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const priceUpdates: CSVRow[] = [];

  try {
    // Parse CSV file
    await new Promise((resolve, reject) => {
      Readable.from(req.file!.buffer)
        .pipe(csv())
        .on('data', (row: CSVRow) => {
          priceUpdates.push(row);
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Perform bulk update
    const bulkOps = priceUpdates.map(update => ({
      updateOne: {
        filter: { 
          sku: update.sku,
          'listPrice.priceId': update.priceId
        },
        update: { 
          $set: { 'listPrice.$.price': parseFloat(update.price) }
        }
      }
    }));

    const result = await Price.bulkWrite(bulkOps);

    res.json({
      message: 'Price update completed',
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error('Error updating prices:', error);
    res.status(500).json({ message: 'Error updating prices', error: (error as Error).message });
  }
};