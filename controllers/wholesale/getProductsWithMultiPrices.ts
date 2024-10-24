// getProductsWithMultiPrices.ts
import { Server as SocketIOServer, Socket } from 'socket.io';
import Price from '../../models/priceModel';
import Product, { IProduct } from '../../models/productModel';
import Category from '../../models/categoryModel';

interface PriceItem {
  priceId: string;
  priceName: string;
  price: number;
  updatedAt: Date;
}

interface ProductWithPrices {
  sku: string;
  name: string;
  prices: PriceItem[];
}

const globalClientPriceIds = new Map<string, string[]>();

export const setupMultiPriceProductSocket = (io: SocketIOServer) => {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected to multi-price products namespace');

    const priceIds = (socket.handshake.query.priceIds as string || '').split(',');
    if (priceIds.length > 0) {
      globalClientPriceIds.set(socket.id, priceIds);
      console.log(`Client ${socket.id} connected with priceIds: ${priceIds.join(', ')}`);
    }

    socket.on('requestMultiPriceProducts', async (data) => {
      const { page = 1, limit = 20, searchTerm = '', selectedCategory = '' } = data;
      const clientPriceIds = globalClientPriceIds.get(socket.id) || [];
      
      try {
        const pageNumber = parseInt(page as string, 10);
        const limitNumber = parseInt(limit as string, 10);
        const skip = (pageNumber - 1) * limitNumber;

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
            socket.emit('multiPriceProductsList', {
              items: [],
              totalItems: 0,
              currentPage: pageNumber,
              totalPages: 0,
              priceIds: clientPriceIds
            });
            return;
          }
          query.categoryid = categoryId;
        }

        const products = await Price.aggregate<ProductWithPrices>([
          { $unwind: "$listPrice" },
          { $match: { "listPrice.priceId": { $in: clientPriceIds } } },
          { 
            $group: {
              _id: "$sku",
              name: { $first: "$name" },
              prices: { 
                $push: {
                  priceId: "$listPrice.priceId",
                  priceName: "$listPrice.priceName",
                  price: "$listPrice.price",
                  updatedAt: "$listPrice.updatedAt"
                }
              }
            }
          },
          {
            $project: {
              _id: 0,
              sku: "$_id",
              name: 1,
              prices: 1
            }
          },
          { $sort: { sku: 1 } },
        ]);

        const productSkus = products.map(p => p.sku);
        const productDetails = await Product.find({ sku: { $in: productSkus }, ...query })
          .select('sku id stock availablestock category categoryid imagepath')
          .lean();
        const productMap = new Map(productDetails.map(product => [product.sku, product]));

        const result = products
          .map(product => {
            const additionalDetails = productMap.get(product.sku);
            if (additionalDetails && 
                typeof additionalDetails.categoryid === 'number' && 
                activeCategoryIds.includes(additionalDetails.categoryid)) {
                
              const sortedPrices = [...product.prices].sort((a: PriceItem, b: PriceItem) => {
                const orderA = clientPriceIds.indexOf(a.priceId);
                const orderB = clientPriceIds.indexOf(b.priceId);
                return orderA - orderB;
              });

              return {
                ...product,
                ...additionalDetails,
                prices: sortedPrices,
                stock: additionalDetails.stock ?? 0,
                availablestock: additionalDetails.availablestock ?? 0,
                id: additionalDetails.id ?? '',
                categoryid: additionalDetails.categoryid,
                category: additionalDetails.category ?? '',
                imagepath: additionalDetails.imagepath ?? ''
              };
            }
            return null;
          })
          .filter((product): product is NonNullable<typeof product> => product !== null);

        const totalItems = result.length;
        const paginatedResult = result.slice(skip, skip + limitNumber);

        socket.emit('multiPriceProductsList', {
          items: paginatedResult,
          totalItems,
          currentPage: pageNumber,
          totalPages: Math.ceil(totalItems / limitNumber),
          priceIds: clientPriceIds
        });
      } catch (error) {
        console.error('Error fetching multi-price products for socket:', error);
        socket.emit('error', { message: 'Error fetching multi-price products' });
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client ${socket.id} disconnected`);
      globalClientPriceIds.delete(socket.id);
    });
  });
};

export const emitMultiPriceProductUpdate = async (io: SocketIOServer, updatedProduct: IProduct) => {
  try {
    // Check if product's category is active using categoryid
    const category = await Category.findOne({ 
      id: String(updatedProduct.categoryid),
      active: true 
    }).lean();

    if (!category) {
      return; // Don't emit update if category is not found or not active
    }

    const priceData = await Price.findOne({ sku: updatedProduct.sku }).lean().exec();
    
    io.sockets.sockets.forEach((socket: Socket) => {
      const clientPriceIds = globalClientPriceIds.get(socket.id) || [];
      
      // Filter and sort prices based on clientPriceIds order
      const prices = (priceData?.listPrice || [])
        .filter(p => clientPriceIds.includes(p.priceId))
        .sort((a, b) => {
          const orderA = clientPriceIds.indexOf(a.priceId);
          const orderB = clientPriceIds.indexOf(b.priceId);
          return orderA - orderB;
        });

      const productUpdate = {
        _id: updatedProduct._id,
        id: updatedProduct.id ?? '',
        name: updatedProduct.name,
        sku: updatedProduct.sku,
        stock: updatedProduct.stock ?? 0,
        availablestock: updatedProduct.availablestock ?? 0,
        imagepath: updatedProduct.imagepath ?? '',
        categoryid: updatedProduct.categoryid,
        category: updatedProduct.category ?? '',
        active: updatedProduct.active,
        prices: prices.map(p => ({
          priceId: p.priceId,
          priceName: p.priceName,
          price: p.price,
          updatedAt: p.updatedAt
        }))
      };

      socket.emit('multiPriceProductUpdate', productUpdate);
    });
  } catch (error) {
    console.error('Error fetching price data for product update:', error);
    io.emit('multiPriceProductUpdate', {
      ...updatedProduct,
      prices: []
    });
  }
};