import { Request, Response } from 'express';
import { Server as SocketIOServer, Socket } from 'socket.io';
import Product, { IProduct } from '../../models/productModel';
import Price, { IPrice } from '../../models/priceModel';
import Category from '../../models/categoryModel';
import PriceList from '../../models/priceListModel';

// Global map to store clientPriceIds
const globalClientPriceIds = new Map<string, string>();


export const getWholesaleProducts = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, searchTerm = '', selectedCategory = '', priceId = '' } = req.query;
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // Get active categories with new schema
    const activeCategories = await Category.find({ active: true }).select('catId').lean();
    const activeCategoryIds = activeCategories.map(cat => cat.catId);

    // Get valid SKUs
    const validPrices = await Price.find({
      'listPrice': {
        $elemMatch: {
          'priceId': priceId,
          'price': { $gt: 0 }
        }
      }
    }).select('sku').lean();

    const validSkus = validPrices.map(p => p.sku);

    const query: any = { 
      availablestock: { $gt: 0 },
      active: true,
      'categories.catId': { $in: activeCategoryIds }, // Updated to match new schema
      sku: { $in: validSkus }
    };

    if (searchTerm) {
      query.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { sku: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (selectedCategory) {
      query['categories.catId'] = selectedCategory; // Updated to match new schema
    }

    const totalItems = await Product.countDocuments(query);
    const items = await Product.find(query)
      .skip(skip)
      .limit(parseInt(limit as string))
      .lean();

    const skus = items.map(item => item.sku);
    const prices = await Price.find({ 
      sku: { $in: skus },
      'listPrice': {
        $elemMatch: {
          'priceId': priceId,
          'price': { $gt: 0 }
        }
      }
    }).lean();

    const itemsWithPrices = items.map(item => {
      const priceData = prices.find(p => p.sku === item.sku);
      const selectedPrice = priceData?.listPrice?.find(p => p.priceId === priceId);
      return { ...item, price: selectedPrice?.price || 0 };
    });

    res.json({
      items: itemsWithPrices,
      currentPage: parseInt(page as string),
      totalPages: Math.ceil(totalItems / parseInt(limit as string)),
      totalItems
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


export const setupWholesaleProductSocket = (io: SocketIOServer) => {
  const wholesaleNamespace = io.of('/wholesale');
 
  wholesaleNamespace.on('connection', async (socket: Socket) => {
    console.log('Client connected to wholesale products namespace');
 
    const priceId = socket.handshake.query.priceId as string;
    if (priceId) {
      // Verify price list is active
      const activePriceList = await PriceList.findOne({ 
        priceId,
        status: true 
      });
      if (activePriceList) {
        globalClientPriceIds.set(socket.id, priceId);
        console.log(`Client ${socket.id} connected with priceId: ${priceId}`);
      }
    }
 
    socket.on('requestWholesaleProducts', async (data) => {
      const { 
        page = 1, 
        limit = 20, 
        searchTerm = '', 
        selectedCategory = '',
        showAvailableOnly = false
      } = data;
      const clientPriceId = globalClientPriceIds.get(socket.id) || '';
      
      try {
        const skip = (page - 1) * limit;
    
        const activeCategories = await Category.find({ active: true }).select('catId').lean();
        const activeCategoryIds = activeCategories.map(cat => cat.catId);
    
        const products = await Price.aggregate([
          {
            $match: {
              'listPrice': {
                $elemMatch: {
                  'priceId': clientPriceId,
                  'price': { $gt: 0 }
                }
              }
            }
          },
          { $unwind: "$listPrice" },
          { 
            $match: { 
              "listPrice.priceId": clientPriceId,
              "listPrice.price": { $gt: 0 }
            }
          },
          {
            $group: {
              _id: "$sku",
              name: { $first: "$name" },
              sku: { $first: "$sku" },
              price: { $first: "$listPrice.price" }
            }
          },
          {
            $lookup: {
              from: 'tbl_products',
              localField: 'sku',
              foreignField: 'sku',
              as: 'productData'
            }
          },
          { 
            $unwind: {
              path: '$productData',
              preserveNullAndEmptyArrays: true
            }
          },
          {
            $match: {
              'productData.categories.catId': { $in: activeCategoryIds },
              ...(showAvailableOnly && {
                'productData.availablestock': { $gt: 0 },
                'productData.active': true
              }),
              ...(searchTerm && {
                $or: [
                  { 'productData.name': { $regex: searchTerm, $options: 'i' } },
                  { 'productData.sku': { $regex: searchTerm, $options: 'i' } }
                ]
              }),
              ...(selectedCategory && { 'productData.categories.catId': selectedCategory })
            }
          },
          {
            $project: {
              _id: 0,
              name: "$productData.name",
              sku: 1,
              stock: "$productData.stock",
              availablestock: "$productData.availablestock",
              imagepath: "$productData.imagepath",
              categories: "$productData.categories",
              active: "$productData.active",
              price: 1,
              updatedAt: "$productData.updatedAt"
            }
          },
          { 
            $sort: { 
              active: -1,
              updatedAt: -1,
              sku: 1
            }
          }
        ]);
    
        const totalItems = products.length;
        const paginatedResult = products.slice(skip, skip + limit);
    
        socket.emit('wholesaleProductsList', {
          items: paginatedResult,
          currentPage: page,
          totalPages: Math.ceil(totalItems / limit),
          totalItems
        });
    
      } catch (error) {
        console.error('Error fetching products:', error);
        socket.emit('error', { message: 'Error fetching products' });
      }
    });
 
    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
      globalClientPriceIds.delete(socket.id);
    });
  });
 
  return wholesaleNamespace;
 };

// อัพเดท emitWholesaleProductUpdate เพื่อตรวจสอบราคาด้วย
export const emitWholesaleProductUpdate = async (io: SocketIOServer, updatedProduct: IProduct) => {
  try {
    // Check if product's category is active 
    const category = await Category.findOne({ 
      catId: updatedProduct.categories[0]?.catId,
      active: true 
    }).lean();
 
    if (!category) {
      console.log('No active category found for product:', updatedProduct.sku);
      return;
    }
 
    const priceData = await Price.findOne({ 
      sku: updatedProduct.sku,
      'listPrice.price': { $gt: 0 }
    }).lean();
 
   // console.log('Price data found:', priceData);
    
    io.of('/wholesale').sockets.forEach((socket) => {
      const clientPriceId = globalClientPriceIds.get(socket.id);
      if (!clientPriceId) return;
 
      const selectedPrice = priceData?.listPrice?.find(p => p.priceId === clientPriceId);
      if (selectedPrice?.price && selectedPrice.price > 0) {
        const productUpdate = {
          ...updatedProduct,
          price: selectedPrice.price
        };
 
        socket.emit('wholesaleProductUpdate', productUpdate);
      }
    });
  } catch (error) {
    console.error('Error in product update:', error);
  }
 };