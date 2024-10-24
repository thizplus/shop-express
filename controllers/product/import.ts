// controllers/product/import.ts
import { Request, Response } from 'express';
import axios from 'axios';
import Product from '../../models/productModel';
import Category from '../../models/categoryModel';
import Price from '../../models/priceModel';
import Config from '../../models/configStore';
import uploadImageToFirebase from '../../functions/uploadImageToFirebase';

// Interfaces
interface ZortoutProduct {
    id: number;
    name: string;
    sku: string;
    stock: number;
    availablestock: number;
    imagepath: string | null;
    categoryid: number | null;
    category: string | null;
    active: boolean;
}

interface ZortoutResponse {
    res: {
        resCode: string;
        resDesc: string;
    };
    list: ZortoutProduct[];
    count: number;
}

interface PriceLevel {
    priceId: string;
    priceName: string;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}

// Utility Functions
async function getPriceTemplate(): Promise<PriceLevel[]> {
    const config = await Config.findOne({});
    if (!config?.saleModel?.listPrice) {
        throw new Error('Price configuration not found');
    }

    return config.saleModel.listPrice.map(price => ({
        priceId: price.id,
        priceName: price.name,
        price: 0,
        createdAt: new Date(),
        updatedAt: new Date()
    }));
}

async function fetchProductsFromZortout(page: number, limit: number): Promise<ZortoutResponse> {
    const url = `https://open-api.zortout.com/v4/Product/GetProducts?page=${page}&limit=${limit}`;

    const storename = process.env.ZORTOUT_STORENAME;
    const apikey = process.env.ZORTOUT_APIKEY;
    const apisecret = process.env.ZORTOUT_APISECRET;

    if (!storename || !apikey || !apisecret) {
        throw new Error('Zortout API credentials are not set in environment variables');
    }

    console.log('Requesting Zortout API with URL:', url);

    const response = await axios.get<ZortoutResponse>(url, {
        headers: {
            'storename': storename,
            'apikey': apikey,
            'apisecret': apisecret
        },
        timeout: 30000
    });

    if (!response.data || !response.data.list || !Array.isArray(response.data.list)) {
        throw new Error('Unexpected response structure from Zortout API');
    }

    return response.data;
}

async function ensurePriceDocument(product: ZortoutProduct, priceTemplate: PriceLevel[]) {
    let priceDoc = await Price.findOne({ sku: product.sku });

    if (!priceDoc) {
        // Create new price document
        priceDoc = await Price.create({
            sku: product.sku,
            name: product.name,
            listPrice: priceTemplate
        });
        console.log(`Created new price document for SKU: ${product.sku}`);
    } else {
        // Check and add missing price levels
        const existingPriceIds = priceDoc.listPrice.map(p => p.priceId);
        const missingPrices = priceTemplate.filter(p => !existingPriceIds.includes(p.priceId));

        if (missingPrices.length > 0) {
            priceDoc.listPrice.push(...missingPrices);
            priceDoc.name = product.name; // Update name if changed
            await priceDoc.save();
            console.log(`Added missing prices for SKU: ${product.sku}`, missingPrices);
        }
    }

    return priceDoc;
}

async function saveProductsToMongoDB(products: ZortoutProduct[], priceTemplate: PriceLevel[]): Promise<void> {
    // Process categories
    const categoryOperations = products
        .filter(product => product.categoryid && product.category)
        .map(product => ({
            updateOne: {
                filter: { id: product.categoryid },
                update: { $set: { id: product.categoryid, name: product.category } },
                upsert: true
            }
        }));

    // Process products and prices
    const productOperations = await Promise.all(products.map(async product => {
        // Ensure price document exists with all price levels
        await ensurePriceDocument(product, priceTemplate);

        // Get existing product to preserve active status
        const existingProduct = await Product.findOne({ id: product.id });
        let firebaseImageUrl: string | null = null;

        if (existingProduct && existingProduct.imagepath && existingProduct.imagepath.startsWith('https://firebasestorage.googleapis.com')) {
            firebaseImageUrl = existingProduct.imagepath;
        } else if (product.imagepath) {
            firebaseImageUrl = await uploadImageToFirebase(product.imagepath, product.sku);
        }

        const updateData: any = {
            id: product.id,
            name: product.name,
            sku: product.sku,
            stock: product.stock,
            availablestock: product.availablestock,
            imagepath: firebaseImageUrl || product.imagepath,
            categoryid: product.categoryid,
            category: product.category,
        };

        // Only set active status for new products
        if (!existingProduct) {
            updateData.active = product.active;
        }

        return {
            updateOne: {
                filter: { id: product.id },
                update: { $set: updateData },
                upsert: true
            }
        };
    }));

    // Execute all operations
    if (categoryOperations.length > 0) {
        await Category.bulkWrite(categoryOperations);
    }
    await Product.bulkWrite(productOperations);
}

// Main Import Function
export const importProductsFromZortout = async (req: Request, res: Response): Promise<void> => {
    try {
        // Get price template first
        const priceTemplate = await getPriceTemplate();
        console.log('Using price template:', priceTemplate);

        let page = 1;
        let totalCount = 0;
        let processedCount = 0;
        let isComplete = false;
        const limit = 500;

        // Main import loop
        while (!isComplete) {
            console.log(`Fetching page ${page}`);
            const data = await fetchProductsFromZortout(page, limit);
            totalCount = data.count;

            if (!Array.isArray(data.list) || data.list.length === 0) {
                console.log('No products found or empty list received');
                break;
            }

            const batchSize = 100;
            for (let i = 0; i < data.list.length; i += batchSize) {
                const batch = data.list.slice(i, Math.min(i + batchSize, data.list.length));
                await saveProductsToMongoDB(batch, priceTemplate);
                processedCount += batch.length;
                console.log(`Processed ${processedCount} of ${totalCount} products`);

                if (processedCount >= totalCount) {
                    isComplete = true;
                    break;
                }
            }

            if (data.list.length < limit) {
                isComplete = true;
            }

            if (isComplete) break;
            page++;
        }

        res.status(200).json({ 
            message: 'Import completed successfully', 
            totalImported: processedCount,
            pricesUpdated: true
        });
    } catch (error) {
        console.error('Error during import:', error);
        res.status(500).json({
            message: 'Error during import',
            error: error instanceof Error ? error.message : String(error)
        });
    }
};