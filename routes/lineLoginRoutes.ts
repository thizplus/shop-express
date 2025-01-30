import express from 'express';
import { verifyProfile, updateLineLoginConfig, verifyToken } from '../controllers/client/login';
import { sendLineNotification } from '../controllers/line/lineNotification';
import { sendLineFlexMessage } from '../controllers/line/lineFlexMessage';
import { sendGrabPaymentFlexMessage } from '../controllers/line/sendGrabPaymentFlex';

const router = express.Router();

router.post('/verify', verifyProfile);
router.post('/verify-token', verifyToken);
router.put('/config', updateLineLoginConfig);

router.post('/notification/order', sendLineNotification);
router.post('/flexMessage/order', sendLineFlexMessage);
router.post('/flexMessage/grab-payment', sendGrabPaymentFlexMessage);

export default router;