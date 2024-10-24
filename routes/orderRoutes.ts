import express from 'express';
import { createOrder, getOrderById, getOrders, updatePaymentStatus } from '../controllers/order/orderControler';
import { getAdminOrders, searchOrders } from '../controllers/order/getOrders';

const router = express.Router();

// สร้าง Order ใหม่
router.post('/create', createOrder);

// ดึงข้อมูล Order ตาม ID
router.get('/find/:orderId', getOrderById);

// ดึงรายการ Orders
router.get('/', getOrders);

// อัปเดตสถานะการชำระเงิน
router.put('/:orderId/payment', updatePaymentStatus);


// Routes ใหม่
router.get('/admin', getAdminOrders);  // สำหรับดึงข้อมูลทั้งหมดแบบ pagination
router.get('/search', searchOrders);   // สำหรับค้นหา orders

// สามารถเพิ่ม routes อื่นๆ ตามความต้องการ

export default router;