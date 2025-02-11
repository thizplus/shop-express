import express from 'express';
import { downloadQR, downloadQRLine } from '../controllers/qr/qrController';

const router = express.Router();

router.get('/download', downloadQR);
router.get('/download-line', downloadQRLine); // เพิ่ม route ใหม่สำหรับ LINE

export default router;