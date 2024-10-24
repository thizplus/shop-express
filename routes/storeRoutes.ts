import express from 'express';
import { getStoreConfig, resetStoreConfig, updateStoreConfig } from '../controllers/store/configStore';

const router = express.Router();

router.get('/config', getStoreConfig);
router.put('/config', updateStoreConfig);
router.post('/config/reset', resetStoreConfig);

export default router;