import express from 'express';
import { searchClients, getBulkClients } from '../controllers/client/clientController';

const router = express.Router();

router.get('/search', searchClients);
router.get('/bulk', getBulkClients);

export default router;