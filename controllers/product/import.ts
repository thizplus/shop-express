// controllers/product/import.ts
import { Request, Response } from 'express';
import Product from '../../models/productModel';
import Category from '../../models/categoryModel';
import Price from '../../models/priceModel';
import PriceList from '../../models/priceListModel';


interface CategoryObj {
  catId: string;
  name: string; 
 }
 interface ImportedProduct {
    name: string;
    sku: string;
    stock: number;
    availablestock: number;
    imagepath: string | null;
    categories: CategoryObj[];
    active: boolean;
   }
   
   interface ResponseData {
    items: ImportedProduct[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
   }
   
   async function createCategoriesIfNotExist(products: ImportedProduct[]): Promise<void> {
    const uniqueCategories = new Map<string, CategoryObj>();
    products.forEach(product => {
      product.categories.forEach(cat => {
        uniqueCategories.set(cat.catId, cat);
      });
    });
   
    for (const cat of uniqueCategories.values()) {
      const existingCategory = await Category.findOne({ catId: cat.catId });
      if (!existingCategory) {
        await Category.create({
          catId: cat.catId,
          name: cat.name,
          description: '',
          active: true
        });
      }
    }
   }
   
   async function importProductBatch(
    products: ImportedProduct[], 
    nextId: number, 
    priceLists: any[]
   ): Promise<number> {
    for (const item of products) {
      const existingProduct = await Product.findOne({ sku: item.sku });
      
      // Handle price document
      const existingPrice = await Price.findOne({ sku: item.sku });
      if (!existingPrice) {
        const listPrice = priceLists.map(price => ({
          priceId: price.priceId,
          priceName: price.priceName,
          price: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
   
        await Price.create({
          sku: item.sku,
          name: item.name,
          listPrice
        });
      } else {
        await Price.updateOne(
          { sku: item.sku },
          { $set: { name: item.name } }
        );
      }
   
      // Handle product document
      if (existingProduct) {
        await Product.updateOne(
          { sku: item.sku },
          {
            $set: {
              name: item.name,
              stock: item.stock,
              availablestock: item.availablestock,
              imagepath: item.imagepath,
              categories: item.categories,
              active: item.active
            }
          }
        );
      } else {
        await Product.create({
          id: nextId++,
          name: item.name,
          sku: item.sku,
          stock: item.stock,
          availablestock: item.availablestock,
          imagepath: item.imagepath,
          categories: item.categories,
          active: item.active
        });
      }
    }
    
    return nextId;
   }
   
   export const importProductsFromStore = async (req: Request, res: Response) => {
    try {
      let page = 1;
      let totalImported = 0;
      let isComplete = false;
      const batchSize = 100;
      
      // Get price lists
      const priceLists = await PriceList.find({ status: true });
      
      // Get last product ID
      const lastProduct = await Product.findOne().sort({id: -1});
      let nextId = lastProduct ? lastProduct.id + 1 : 1;
   
      // Main import loop
      while (!isComplete) {
        const response = await fetch(
          `${process.env.STORE_API_URL}/api/products/all-import?page=${page}&limit=${batchSize}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json() as ResponseData;
   
        // Create categories for this batch
        await createCategoriesIfNotExist(data.items);
   
        // Process products in batch
        nextId = await importProductBatch(data.items, nextId, priceLists);
        totalImported += data.items.length;
   
        if (page >= data.totalPages) {
          isComplete = true;
        } else {
          page++;
        }
      }
   
      res.status(200).json({
        message: 'นำเข้าข้อมูลสำเร็จ',
        totalImported
      });
   
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({
        message: error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการนำเข้า'
      });
    }
   };