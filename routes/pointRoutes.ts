// routes/pointRoutes.ts
import express from 'express';
import {
  createPointTicket,
  getPointTickets,
  toggleTicketStatus
} from '../controllers/point/pointTicketController';
import { 
  getPointSetting, 
  updatePointSetting 
} from '../controllers/point/pointSettingController';
import {
  getPointTransactions,
  getCustomerPoints,
  usePointsForTicket
} from '../controllers/point/pointTransactionController';

const router = express.Router();

// Point Tickets routes
router.post('/tickets', createPointTicket);
router.get('/tickets', getPointTickets);
router.put('/tickets/:id/toggle', toggleTicketStatus);

// Point Settings routes
router.get('/settings', getPointSetting);
router.put('/settings', updatePointSetting);

// Point Transactions routes
router.get('/transactions/:userId', getPointTransactions);
router.get('/customer/:userId', getCustomerPoints);
router.post('/redeem', usePointsForTicket);

export default router;