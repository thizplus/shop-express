import express from 'express';

import { importProductsFromZortout } from '../controllers/product/import';
import { getProducts } from '../controllers/product/getProducts';
import { searchProducts } from '../controllers/product/searchProducts';
import { updateProductStatus } from '../controllers/product/updateProducts';
import { updatePrice } from '../controllers/product/updatePrice';

const router = express.Router();

router.post('/import-from-zortout', importProductsFromZortout);
router.get('/all', getProducts);
router.get('/search', searchProducts);
router.patch('/update-status', updateProductStatus);
router.patch('/update-price', updatePrice);

export default router;

