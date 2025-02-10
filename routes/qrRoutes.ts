import express from 'express';
import { downloadQR } from '../controllers/qr/qrController';


const router = express.Router();

// Route สำหรับดาวน์โหลด QR
router.get('/download', downloadQR);

export default router;