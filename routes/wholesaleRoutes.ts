import express from 'express';
import { getWholesaleProducts } from '../controllers/wholesale/wholesaleProductController';

const router = express.Router();

router.get('/products', getWholesaleProducts);

export default router;