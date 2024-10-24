import { Request, Response } from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Product, { IProduct } from '../../models/productModel';
import Price, { IPrice } from '../../models/priceModel';
import Category from '../../models/categoryModel';

// Global map to store clientPriceIds
const globalClientPriceIds = new Map<string, string>();

export const getWholesaleProducts = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;
    const searchTerm: string = req.query.searchTerm as string || '';
    const selectedCategory: string = req.query.selectedCategory as string || '';
    const priceId: string = req.query.priceId as string || '';

    // Get active categories
    const activeCategories = await Category.find({ active: true }).select('id').lean();
    const activeCategoryIds = activeCategories.map(cat => Number(cat.id));

    const query: any = { 
      availablestock: { $gt: 0 },
      active: true,
      categoryid: { $in: activeCategoryIds }
    };

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { sku: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (selectedCategory) {
      const categoryId = Number(selectedCategory);
      if (!activeCategoryIds.includes(categoryId)) {
        return res.json({
          items: [],
          currentPage: page,
          totalPages: 0,
          totalItems: 0
        });
      }
      query.categoryid = categoryId;
    }

    const items: IProduct[] = await Product.find(query)
      .skip(skip)
      .limit(limit)
      .lean()
      .exec();

    const skus = items.map(item => item.sku);
    const prices: IPrice[] = await Price.find({ sku: { $in: skus } }).lean().exec();

    const itemsWithPrices = items.map(item => {
      const priceData = prices.find(p => p.sku === item.sku);
      let price = 0;
      if (priceData && priceData.listPrice && priceId) {
        const selectedPrice = priceData.listPrice.find(p => p.priceId === priceId);
        price = selectedPrice ? selectedPrice.price : 0;
      }
      return { ...item, price };
    });

    const totalItems: number = await Product.countDocuments(query);

    res.json({
      items: itemsWithPrices,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching wholesale products:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const setupWholesaleProductSocket = (io: SocketIOServer) => {
  const wholesaleNamespace = io.of('/wholesale');

  wholesaleNamespace.on('connection', (socket: Socket) => {
    console.log('Client connected to wholesale products namespace');

    const priceId = socket.handshake.query.priceId as string;
    if (priceId) {
      globalClientPriceIds.set(socket.id, priceId);
      console.log(`Client ${socket.id} connected with priceId: ${priceId}`);
    }

    socket.on('requestWholesaleProducts', async (data) => {
      const { page = 1, limit = 20, searchTerm = '', selectedCategory = '' } = data;
      const clientPriceId = globalClientPriceIds.get(socket.id) || '';
      
      try {
        const skip: number = (page - 1) * limit;
    
        // Get active categories
        const activeCategories = await Category.find({ active: true }).select('id').lean();
        const activeCategoryIds = activeCategories.map(cat => Number(cat.id));
        
        console.log('Active Category IDs:', activeCategoryIds); // เพิ่ม log
        
        const query: any = { 
          availablestock: { $gt: 0 },
          active: true,
          categoryid: { $in: activeCategoryIds }
        };
    
        if (searchTerm) {
          query.$or = [
            { name: { $regex: searchTerm, $options: 'i' } },
            { sku: { $regex: searchTerm, $options: 'i' } }
          ];
        }
    
        if (selectedCategory) {
          const categoryId = Number(selectedCategory);
          console.log('Selected Category ID:', categoryId); // เพิ่ม log
          
          if (!activeCategoryIds.includes(categoryId)) {
            console.log('Category not found in active categories'); // เพิ่ม log
            socket.emit('wholesaleProductsList', {
              items: [],
              currentPage: page,
              totalPages: 0,
              totalItems: 0
            });
            return;
          }
          query.categoryid = categoryId;
        }
    
        console.log('Final Query:', query); // เพิ่ม log
    
        const items: IProduct[] = await Product.find(query)
          .skip(skip)
          .limit(limit)
          .lean()
          .exec();
    
        console.log('Found Items:', items.length); // เพิ่ม log

        const skus = items.map(item => item.sku);
        const prices: IPrice[] = await Price.find({ sku: { $in: skus } }).lean().exec();

        const itemsWithPrices = items.map(item => {
          const priceData = prices.find(p => p.sku === item.sku);
          let price = 0;
          if (priceData && priceData.listPrice && clientPriceId) {
            const selectedPrice = priceData.listPrice.find(p => p.priceId === clientPriceId);
            price = selectedPrice ? selectedPrice.price : 0;
          }
          return { ...item, price };
        });

        const totalItems: number = await Product.countDocuments(query);
    
        socket.emit('wholesaleProductsList', {
          items: itemsWithPrices,
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        });
      } catch (error) {
        console.error('Error fetching wholesale products for socket:', error);
        socket.emit('error', { message: 'Error fetching wholesale products' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
      globalClientPriceIds.delete(socket.id);
    });
  });

  return wholesaleNamespace;
};

export const emitWholesaleProductUpdate = async (io: SocketIOServer, updatedProduct: IProduct) => {
  try {
    // Check if product's category is active using categoryid
    const category = await Category.findOne({ 
      id: String(updatedProduct.categoryid),
      active: true 
    }).lean();

    if (!category) {
      return; // Don't emit update if category is not active
    }

    const priceData: IPrice | null = await Price.findOne({ sku: updatedProduct.sku }).lean().exec();
    
    io.of('/wholesale').sockets.forEach((socket) => {
      const clientPriceId = globalClientPriceIds.get(socket.id);
      let price = 0;
      if (priceData && priceData.listPrice && clientPriceId) {
        const selectedPrice = priceData.listPrice.find(p => p.priceId === clientPriceId);
        price = selectedPrice ? selectedPrice.price : 0;
      }

      const productUpdate = {
        _id: updatedProduct._id,
        id: updatedProduct.id,
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        stock: updatedProduct.stock ?? 0,
        availablestock: updatedProduct.availablestock ?? 0,
        imagepath: updatedProduct.imagepath ?? '',
        categoryid: updatedProduct.categoryid,
        category: updatedProduct.category,
        active: updatedProduct.active,
        price: price
      };

      console.log(`Emitting wholesale productUpdate to client ${socket.id} with priceId ${clientPriceId}:`, productUpdate);
      socket.emit('wholesaleProductUpdate', productUpdate);
    });
  } catch (error) {
    console.error('Error fetching price data for product update:', error);
    io.of('/wholesale').emit('wholesaleProductUpdate', updatedProduct);
  }
};