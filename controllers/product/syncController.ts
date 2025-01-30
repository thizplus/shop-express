import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Product, { IProduct } from '../../models/productModel';
import Category from '../../models/categoryModel';
import Price from '../../models/priceModel';
import PriceList from '../../models/priceListModel';
import { emitMultiPriceProductUpdate } from '../wholesale/getProductsWithMultiPrices';
import { emitWholesaleProductUpdate } from '../wholesale/wholesaleProductController';

interface SyncRequest {
  product: Omit<IProduct, '_id'> & { _id: string };
  action: 'create' | 'update' | 'delete' | 'po_confirm' | 'move_stock'| 'order_create' | 'order_void';
  source: string;
}

const handleStockUpdate = async (product: any, io: SocketIOServer | undefined) => {
  console.log('handleStockUpdate called:', { 
    action: product.action,
    sku: product.sku, 
    stock: product.stock,
    availablestock: product.availablestock 
  });
 
  const { _id, ...updateData } = product;
  const updatedProduct = await Product.findOneAndUpdate(
    { sku: product.sku },
    { 
      stock: updateData.stock,
      availablestock: updateData.availablestock
    },
    { new: true }
  ).lean();
 
  console.log('Product after update:', updatedProduct);
 
  if (updatedProduct && io) {
    console.log('Emitting socket update');
    await emitMultiPriceProductUpdate(io, updatedProduct);
    await emitWholesaleProductUpdate(io, updatedProduct);
    
  }
  
  return updatedProduct;
 };

export const syncProductFromWarehouse = async (req: Request<{}, {}, SyncRequest>, res: Response) => {
  try {
    const { product, action, source } = req.body;
    const io: SocketIOServer = req.app.get('socketio');
    
    if (source !== 'warehouse') {
      return res.status(403).json({ message: 'Invalid source' });
    }
    
    switch (action) {
      case 'create': {
        const { _id, ...productData } = product;
        
        // Check and create categories
        for (const cat of productData.categories) {
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
        
        // Create price list
        const priceLists = await PriceList.find({ status: true });
        const listPrice = priceLists.map(price => ({
          priceId: price.priceId,
          priceName: price.priceName,
          price: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }));
        
        await Price.create({
          sku: productData.sku,
          name: productData.name,
          listPrice
        });
        
        const result = await Product.create(productData);
        console.log('Product created:', result.sku);
        break;
      }

      case 'update': {
        const { _id,categories, ...updateData } = product;
        const result = await Product.findOneAndUpdate(
          { sku: product.sku },
          updateData,
          { new: true }
        );
        console.log('Product updated:', result?.sku);
        break;
      }
      
      case 'delete': {
        const result = await Product.findOneAndDelete({ sku: product.sku });
        await Price.findOneAndDelete({ sku: product.sku });
        console.log('Product deleted:', result?.sku);
        break;
      }

      case 'po_confirm':
      case 'move_stock':
      case 'order_create':
      case 'order_void': {
        await handleStockUpdate(product, io);
        break;
      }
    }

    res.json({ 
      success: true,
      action,
      sku: product.sku
    });

  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};