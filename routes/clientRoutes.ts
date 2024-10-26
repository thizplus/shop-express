import express from 'express';
import { searchClients, getBulkClients } from '../controllers/client/clientController';
import { getClient } from '../controllers/client/getClient';
import { searchClient } from '../controllers/client/searchClient';
import { updateClientPrices } from '../controllers/client/updateClientPrices';

const router = express.Router();

router.get('/search', searchClients);
router.get('/bulk', getBulkClients);

// for admin dashboard
router.get('/all-client', getClient);
router.get('/search-client', searchClient);
router.put('/update-prices', updateClientPrices);

export default router;