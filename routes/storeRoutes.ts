import express from 'express';
import { getStoreConfig, resetStoreConfig, updateStoreConfig } from '../controllers/store/configStore';
import multer from 'multer';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.get('/config', getStoreConfig);
router.put('/config', updateStoreConfig);
router.post('/config/reset', resetStoreConfig);

export default router;