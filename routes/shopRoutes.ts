import express from 'express';
import { registerShop } from '../controllers/shop/shopController';


const router = express.Router();

router.post('/register', registerShop);
export default router;