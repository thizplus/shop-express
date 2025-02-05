import { Request, Response } from 'express';
import { Server as SocketIOServer } from 'socket.io';
import Product, { IProduct } from '../../models/productModel';
import Category from '../../models/categoryModel';
import Price from '../../models/priceModel';
import PriceList from '../../models/priceListModel';
import { emitMultiPriceProductUpdate } from '../wholesale/getProductsWithMultiPrices';
import { emitWholesaleProductUpdate } from '../wholesale/wholesaleProductController';

interface SyncRequest {
  product: Omit<IProduct, '_id'> & { _id: string } | Array<Omit<IProduct, '_id'> & { _id: string }>;
  action: 'create' | 'update' | 'delete' | 'po_confirm' | 'move_stock' | 'order_create' | 'order_void' | 'status_update' | 'stock_adjust_bulk';
  source: string;
}

const handleBulkStockUpdate = async (products: any[], io: SocketIOServer | undefined) => {
  try {
    console.log('📦 รายการที่จะอัพเดท:', products.map(p => ({
      sku: p.sku,
      stock: p.stock,
      availablestock: p.availablestock
    })));

    const bulkOps = products.map(prod => ({
      updateOne: {
        filter: { sku: prod.sku },
        update: { 
          $set: {
            stock: prod.stock,
            availablestock: prod.availablestock
          }
        }
      }
    }));

    await Product.bulkWrite(bulkOps, { ordered: false });

    const updatedProducts = await Product.find({
      sku: { $in: products.map(p => p.sku) }
    })
    .select('_id sku name stock availablestock categories')
    .lean();

    console.log('📊 สถานะล่าสุด:', updatedProducts.map(p => ({
      sku: p.sku,
      stock: p.stock,
      availablestock: p.availablestock
    })));

    if (io && updatedProducts.length > 0) {
      try {
        await Promise.all(
          updatedProducts.map(async (prod) => {
            await Promise.all([
              emitMultiPriceProductUpdate(io, prod),
              emitWholesaleProductUpdate(io, prod)
            ]);
          })
        );
        console.log('📢 อัพเดท socket เรียบร้อย');
      } catch (socketError) {
        console.error('❌ Socket error:', socketError);
      }
    }

    return updatedProducts;
  } catch (error) {
    console.error('❌ Bulk update error:', error);
    throw error;
  }
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
        const { _id, ...productData } = product as any;
        
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
        const { _id, categories, ...updateData } = product as any;
        const result = await Product.findOneAndUpdate(
          { sku: updateData.sku },
          updateData,
          { new: true }
        );
        console.log('Product updated:', result?.sku);
        break;
      }

      case 'status_update': {
        const prod = product as any;
        const result = await Product.findOneAndUpdate(
          { sku: prod.sku },
          { active: prod.active },
          { new: true }
        ).lean();
        console.log('Product status updated:', result?.sku);
        break;
      }
      
      case 'delete': {
        const result = await Product.findOneAndDelete({ sku: (product as any).sku });
        await Price.findOneAndDelete({ sku: (product as any).sku });
        console.log('Product deleted:', result?.sku);
        break;
      }


      case 'po_confirm':
      case 'move_stock':
      case 'order_create':
      case 'order_void':
      case 'stock_adjust_bulk': {
        const products = Array.isArray(product) ? product : [product];
        await handleBulkStockUpdate(products, io);
        break;
      }

     
    }

    res.json({ 
      success: true,
      action,
      sku: (product as any).sku
    });

  } catch (error) {
    console.error('Sync failed:', error);
    res.status(500).json({ 
      error: 'Sync failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};