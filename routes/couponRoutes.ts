// routes/promotionRoutes.ts
import express from 'express';
import { createCoupon, getAllCoupons, searchCoupon, toggleCouponStatus, validateCoupon } from '../controllers/coupon/couponController';
import { applyCoupon, getAvailableCoupons } from '../controllers/coupon/clientCouponController';


const router = express.Router();


router.get('/', getAllCoupons);

router.post('/', createCoupon);
router.get('/search', searchCoupon);

router.post('/validate', validateCoupon);

router.post('/apply', applyCoupon);
router.get('/available', getAvailableCoupons);

router.put('/:id/toggle', toggleCouponStatus); // เพิ่ม route ใหม่

export default router;