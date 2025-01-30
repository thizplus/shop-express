import { Server as SocketIOServer, Socket } from 'socket.io';
import Price from '../../models/priceModel';
import Product, { IProduct } from '../../models/productModel';
import Category from '../../models/categoryModel';
import PriceList from '../../models/priceListModel';
import StoreConfig from '../../models/configStore';

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
 io.on('connection', async (socket: Socket) => {
  const config = await StoreConfig.findOne();
  const priceIds = (socket.handshake.query.priceIds as string || '').split(',');
   
   if (priceIds.length > 0) {
     const activePriceLists = await PriceList.find({ 
       priceId: { $in: priceIds },
       status: true 
     });
     const validPriceIds = activePriceLists
  .sort((a, b) => {
    const priceA = config?.saleModel.listPrice.find(p => p.id === a.priceId);
    const priceB = config?.saleModel.listPrice.find(p => p.id === b.priceId);
    return (priceB?.minPurchase || 0) - (priceA?.minPurchase || 0);
  })
  .map(p => p.priceId);
     globalClientPriceIds.set(socket.id, validPriceIds);
   }

   socket.on('requestMultiPriceProducts', async (data) => {
     const { page = 1, limit = 20, searchTerm = '', selectedCategory = '', showAvailableOnly = false } = data;
     const clientPriceIds = globalClientPriceIds.get(socket.id) || [];
     
     try {
       const pageNumber = parseInt(page as string, 10);
       const limitNumber = parseInt(limit as string, 10);
       const skip = (pageNumber - 1) * limitNumber;

       // Get active categories
       const activeCategories = await Category.find({ active: true }).select('catId name').lean();
       const activeCategoryIds = activeCategories.map(cat => cat.catId);

       const query: any = { 
         'categories.catId': { $in: activeCategoryIds },
         ...(showAvailableOnly && { availablestock: { $gt: 0 } }),
         ...(searchTerm && {
           $or: [
             { name: { $regex: searchTerm, $options: 'i' } },
             { sku: { $regex: searchTerm, $options: 'i' } }
           ]
         }),
         ...(selectedCategory && { 'categories.catId': selectedCategory })
       };

       const products = await Price.aggregate<ProductWithPrices>([
         {
           $lookup: {
             from: 'tbl_store_price_list',
             localField: 'listPrice.priceId',
             foreignField: 'priceId',
             as: 'priceLists'
           }
         },
         { $unwind: "$listPrice" },
         { 
           $match: { 
             "listPrice.priceId": { $in: clientPriceIds },
             "listPrice.price": { $gt: 0 }
           }
         },
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
             },
             validPriceCount: { $sum: 1 }
           }
         },
         {
           $match: {
             validPriceCount: { $eq: clientPriceIds.length }
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
         { $sort: { sku: 1 } }
       ]);

       const productSkus = products.map(p => p.sku);
       const productDetails = await Product.find({ sku: { $in: productSkus }, ...query })
         .select('sku stock availablestock categories imagepath')
         .lean();

       const productMap = new Map(productDetails.map(product => [product.sku, product]));

       const result = products
         .map(product => {
           const additionalDetails = productMap.get(product.sku);
           if (!additionalDetails) return null;

           const sortedPrices = [...product.prices].sort((a, b) => {
            const priceA = config?.saleModel.listPrice.find(p => p.id === a.priceId);
            const priceB = config?.saleModel.listPrice.find(p => p.id === b.priceId); 
            return (priceB?.minPurchase || 0) - (priceA?.minPurchase || 0);
          });

           return {
             ...product,
             ...additionalDetails,
             prices: sortedPrices,
             stock: additionalDetails.stock ?? 0,
             availablestock: additionalDetails.availablestock ?? 0,
             imagepath: additionalDetails.imagepath ?? ''
           };
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
       console.error('Error fetching multi-price products:', error);
       socket.emit('error', { message: 'Error fetching products' });
     }
   });

   socket.on('disconnect', () => {
     globalClientPriceIds.delete(socket.id);
   });
 });
};

export const emitMultiPriceProductUpdate = async (io: SocketIOServer, updatedProduct: IProduct) => {
 try {
   const category = updatedProduct.categories[0];
   if (!category) return;

   const priceData = await Price.findOne({ sku: updatedProduct.sku }).lean();
   const activePriceLists = await PriceList.find({ status: true });
   const activePriceIds = activePriceLists.map(p => p.priceId);
   
   io.sockets.sockets.forEach((socket: Socket) => {
     const clientPriceIds = globalClientPriceIds.get(socket.id) || [];
     
     const prices = (priceData?.listPrice || [])
       .filter(p => clientPriceIds.includes(p.priceId) && activePriceIds.includes(p.priceId))
       .sort((a, b) => clientPriceIds.indexOf(a.priceId) - clientPriceIds.indexOf(b.priceId))
       .map(p => ({
         priceId: p.priceId,
         priceName: p.priceName,
         price: p.price,
         updatedAt: p.updatedAt
       }));

     const productUpdate = {
       _id: updatedProduct._id,
       name: updatedProduct.name,
       sku: updatedProduct.sku,
       stock: updatedProduct.stock,
       availablestock: updatedProduct.availablestock,
       imagepath: updatedProduct.imagepath,
       categories: updatedProduct.categories,
       active: updatedProduct.active,
       prices
     };

     socket.emit('multiPriceProductUpdate', productUpdate);
   });
 } catch (error) {
   console.error('Error in product update:', error);
   io.emit('multiPriceProductUpdate', { ...updatedProduct, prices: [] });
 }
};