import express from 'express';
import { searchClients, getBulkClients } from '../controllers/client/clientController';
import { getClient } from '../controllers/client/getClient';
import { searchClient } from '../controllers/client/searchClient';
import { updateClientPrices } from '../controllers/client/updateClientPrices';
import { updateGrabDelivery } from '../controllers/client/updateGrabDelivery';
import { getClientDeliveryStatus } from '../controllers/client/getClientDeliveryStatus';
import { updateCustomPrices } from '../controllers/client/updateCustomPrices';
import { setPinController, verifyPinController } from '../controllers/client/set-pin';
import { getClientByUserId } from '../controllers/client/getClientByUserId';

const router = express.Router();

router.get('/search', searchClients);
router.get('/bulk', getBulkClients);
router.get('/all-client', getClient);
router.get('/search-client', searchClient);
router.put('/update-prices', updateClientPrices);
router.put('/update-grab-delivery', updateGrabDelivery);
router.post('/set-pin', setPinController);
router.post('/verify-pin', verifyPinController);

// Specific routes with parameters ไว้ตรงกลาง
router.post('/custom-prices/:userId', updateCustomPrices);
router.get('/user/:userId', getClientByUserId); // ย้ายขึ้นมาก่อน dynamic routes อื่นๆ

// Generic dynamic routes ไว้ด้านล่างสุด
router.get('/:userId/delivery-status', getClientDeliveryStatus);

export default router;