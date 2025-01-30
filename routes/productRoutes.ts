import express from 'express';


import { getProducts } from '../controllers/product/getProducts';
import { clientSearchProducts, searchProducts } from '../controllers/product/searchProducts';
import { updateProductStatus } from '../controllers/product/updateProducts';
import { updatePrice } from '../controllers/product/updatePrice';
import { importProductsFromStore } from '../controllers/product/import';
import { syncProductFromWarehouse } from '../controllers/product/syncController';
import { updateProduct } from '../controllers/product/productController';

const router = express.Router();

//router.post('/import-from-zortout', importProductsFromZortout);
router.post('/import', importProductsFromStore);


router.get('/all', getProducts);

router.get('/search', searchProducts);
router.get('/client-search', clientSearchProducts); 
router.patch('/update-status', updateProductStatus);
router.patch('/update-price', updatePrice);

router.post('/sync', syncProductFromWarehouse);

router.put('/update/:id', updateProduct);

export default router;

