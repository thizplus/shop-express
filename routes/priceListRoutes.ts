// routes/priceListRoute.ts
import express from 'express';
import { 
 createPriceList,
 getPriceLists,
 searchPriceLists,
 updatePriceList,
 deletePriceList,
 updateNamePriceList
} from '../controllers/priceList/priceListController';

const router = express.Router();

router.post('/create', createPriceList);
router.get('/all', getPriceLists);
router.get('/search', searchPriceLists);
router.put('/update', updatePriceList);

router.patch('/update-name', updateNamePriceList);

router.delete('/delete/:priceId', deletePriceList);

export default router;