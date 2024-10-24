import { Request, Response } from 'express';
import Price from '../../../models/priceModel';

interface ProductCSVData {
    sku: string;
    name: string;
    priceId: string;
    priceName: string;
    price: number;
  }

const escapeCSV = (field: unknown): string => {
  if (field == null) return '';
  const str = String(field);
  return str.includes(',') || str.includes('"') || str.includes('\n') 
    ? `"${str.replace(/"/g, '""')}"` 
    : str;
};

const convertToCSV = (data: ProductCSVData[]): string => {
  const header = 'sku,name,priceId,priceName,price\n';
  const rows = data.map(row => 
    `${escapeCSV(row.sku)},${escapeCSV(row.name)},${escapeCSV(row.priceId)},${escapeCSV(row.priceName)},${escapeCSV(row.price)}`
  ).join('\n');
  return header + rows;
};

export const getProductsByPriceIdCSV = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params;

    console.log(`Fetching all products for priceId: ${priceId} for CSV export`);

    // Fetch price name first
    const priceData = await Price.findOne({ "listPrice.priceId": priceId }, { "listPrice.$": 1 });
    const priceName = priceData?.listPrice[0]?.priceName || 'Unknown Price';

    // Fetch all products with price details from tbl_store_price
    const products = await Price.aggregate([
      { $unwind: "$listPrice" },
      { $match: { "listPrice.priceId": priceId } },
      { $sort: { "listPrice.updatedAt": -1 } },
      { $group: {
        _id: "$sku",
        name: { $first: "$name" },
        latestPrice: { $first: "$listPrice" }
      }},
      { $project: {
        sku: "$_id",
        name: 1,
        priceId: "$latestPrice.priceId",
        price: "$latestPrice.price",
      }},
      { $sort: { sku: 1 } }
    ]);

    console.log(`Fetched ${products.length} products for CSV export`);

    // Combine product details with price name
    const result: ProductCSVData[] = products.map(product => ({
      sku: product.sku,
      name: product.name,
      priceId: product.priceId,
      priceName,
      price: product.price
    }));

    // Convert to CSV
    const csv = convertToCSV(result);

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=products_${priceId}.csv`);

    // Send CSV file
    res.send(csv);

  } catch (error) {
    console.error('Error exporting products to CSV:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};