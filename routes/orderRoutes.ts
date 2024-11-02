import express from 'express';
import { createOrder, getOrderById, getOrders, updatePaymentStatus } from '../controllers/order/orderControler';
import { getAdminOrders, searchOrders } from '../controllers/order/getOrders';
import { getLatestPendingOrder, getPendingOrders } from '../controllers/order/getPendingOrders';

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

router.get('/pending', getPendingOrders);  // สำหรับดึงรายการทั้งหมดโดยส่ง query params
router.get('/pending/latest/:userId/:typeId', getLatestPendingOrder);  // แก้ route ให้รับ typeId ด้วย

export default router;