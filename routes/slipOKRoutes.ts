import { verifySlip } from '../controllers/slipOK/verifySlip';
import express from 'express';
import { uploadSlip } from '../controllers/slipOK/uploadSlip';

const router = express.Router();

router.post('/upload-slip', uploadSlip);
router.post('/verify-slip', verifySlip);

export default router;