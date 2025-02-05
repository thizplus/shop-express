import express from 'express';
import { bulkVoidFromWarehouse, createOrder, getOrderById, getOrders, updatePaymentStatus, voidFromWarehouse } from '../controllers/order/orderControler';
import { getAdminOrders, searchOrders } from '../controllers/order/getOrders';
import { getLatestPendingOrder, getPendingOrders } from '../controllers/order/getPendingOrders';
import { getOrderReport } from '../controllers/order/getOrderReport';
import { updateGrabPayment } from '../controllers/order/updateGrabPayment';
import { syncOrderFromWarehouse } from '../controllers/order/syncOrderController';

const router = express.Router();

router.post('/sync', syncOrderFromWarehouse);
router.post('/voidFromWarehouse', voidFromWarehouse);
router.post('/bulkVoidFromWarehouse', bulkVoidFromWarehouse);

// สร้าง Order ใหม่
router.post('/create', createOrder);

// ดึงข้อมูล Order ตาม ID
router.get('/find/:orderId', getOrderById);

// ดึงรายการ Orders
router.get('/', getOrders);

// อัปเดตสถานะการชำระเงิน
router.put('/:orderId/payment', updatePaymentStatus);

// อัปเดตการเรียกเก็บเงิน grab
router.put('/:orderId/grab-payment', updateGrabPayment);


// Routes ใหม่
router.get('/admin', getAdminOrders);  // สำหรับดึงข้อมูลทั้งหมดแบบ pagination
router.get('/search', searchOrders);   // สำหรับค้นหา orders

router.get('/report', getOrderReport);  // สำหรับดึงข้อมูลทั้งหมดแบบ pagination

// สามารถเพิ่ม routes อื่นๆ ตามความต้องการ

router.get('/pending', getPendingOrders);  // สำหรับดึงรายการทั้งหมดโดยส่ง query params
router.get('/pending/latest/:userId/:typeId', getLatestPendingOrder);  // แก้ route ให้รับ typeId ด้วย

export default router;