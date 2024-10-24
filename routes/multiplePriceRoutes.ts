import express from 'express';


import { getProductsWithMultiPrices } from '../controllers/price/multiple/getProductsWithMultiPrices';
import { searchProductsWithMultiPrices } from '../controllers/price/multiple/searchProductsWithMultiPrices';


const router = express.Router();
router.get('/all', getProductsWithMultiPrices);
router.get('/search', searchProductsWithMultiPrices);

export default router;

