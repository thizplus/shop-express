// /api/routes/daily-payment.ts
import express from 'express';
import { uploadSlip, verifyAndUpdatePayment } from '../controllers/dailyPayment/uploadSlip';
const router = express.Router();

router.post('/upload-slip', uploadSlip);
router.post('/verify-payment', verifyAndUpdatePayment);

export default router;