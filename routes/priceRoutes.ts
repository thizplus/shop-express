import express from 'express';
import multer from 'multer';

import { createOrUpdateStorePrice } from '../controllers/price/createPrice';
import { getPriceTiers } from '../controllers/price/getPrice';
import { searchPrice } from '../controllers/price/searchPrice';
import { deletePrice } from '../controllers/price/deletePrice';
import { getProductsByPriceId } from '../controllers/price/inner/getProductsByPriceId';
import { searchProductsByPriceId } from '../controllers/price/inner/searchProductsByPriceId';
import { getProductsByPriceIdCSV } from '../controllers/price/inner/getProductsByPriceIdCSV';
import { updatePriceFromCSV } from '../controllers/price/inner/updatePriceFromCSV';
import { updatePrice } from '../controllers/price/inner/updatePrice';
import { updatePriceUsers } from '../controllers/price/priceUsersController';
import { getPriceAccess } from '../controllers/price/priceAccessController';
import { getCartPrices } from '../controllers/price/getCartPriceWholesale';
import { getPriceLiffId, updatePriceLiffId } from '../controllers/price/updatePriceLiffId';
import { getMultiCartPrices } from '../controllers/price/getMultiCartPrices';


const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/create', createOrUpdateStorePrice);
router.get('/all', getPriceTiers);
router.delete('/delete/:priceId', deletePrice);
router.get('/search', searchPrice);
router.put('/update', updatePrice);

// update cart price when click for whosale
router.post('/cart-prices', getCartPrices);
// update cart price when click for store
router.post('/multi-cart-prices', getMultiCartPrices);


router.patch('/price-users', updatePriceUsers);
router.get('/price-access/:priceId', getPriceAccess);

// update liff id
router.get('/liff/:priceId', getPriceLiffId);
router.patch('/liff-update', updatePriceLiffId);



router.get('/products/:priceId', getProductsByPriceId);
router.get('/products/:priceId/search', searchProductsByPriceId);
router.get('/products/:priceId/csv', getProductsByPriceIdCSV);



router.post('/upload', upload.single('file'), updatePriceFromCSV);

export default router;

