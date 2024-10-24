import express from 'express';
import {
    getShippingAddresses,
    addShippingAddress,
    updateShippingAddress,
    deleteShippingAddress,
    setDefaultAddress
  } from '../controllers/shipping/shippingController';

const router = express.Router();

router.get('/', getShippingAddresses);
router.post('/', addShippingAddress);
router.put('/:userId/:addressId/default', setDefaultAddress);
router.put('/:userId/:addressId', updateShippingAddress);
router.delete('/:userId/:addressId', deleteShippingAddress);
export default router;