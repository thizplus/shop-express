import express from 'express';

import { sendOrderToWarehouse, voidOrderToWarehouse } from '../controllers/warehouse/orders';

const router = express.Router();


router.post('/send-order', sendOrderToWarehouse);
router.post('/void-order', voidOrderToWarehouse);




export default router;