// routes/priceListRoute.ts
import express from 'express';
import { 
 createPriceList,
 getPriceLists,
 searchPriceLists,
 updatePriceList,
 deletePriceList,
 updateNamePriceList,
 updateAllowedUsers,
 getPriceListsWithAccess,
 getPriceById
} from '../controllers/priceList/priceListController';

const router = express.Router();

router.post('/create', createPriceList);
router.get('/all', getPriceLists);
router.get('/search', searchPriceLists);
router.put('/update', updatePriceList);

router.patch('/update-name', updateNamePriceList);

// New routes for allowedUsers
router.put('/update-access', updateAllowedUsers);
router.get('/with-access', getPriceListsWithAccess);

router.get('/:priceId', getPriceById);
router.delete('/delete/:priceId', deletePriceList);

export default router;