import express from 'express';
import {
    addOrder, updateOrder, updateOrderTracking, deleteOrder,
    addProduct, updateProduct, updateProductQuantity, deleteProduct
  } from '../controllers/zortout/webhook';
  
import { sendOrderToZortout, updatePaymentToZortout, voidOrderToZortout } from '../controllers/zortout/orders';

const router = express.Router();

// order webhooks
router.post('/webhook/addorder', addOrder);
router.post('/webhook/updateorder', updateOrder);
router.post('/webhook/updateordertracking', updateOrderTracking);
router.post('/webhook/deleteorder', deleteOrder);


// Product webhooks
router.post('/webhook/addproduct', addProduct);
router.post('/webhook/updateproduct', updateProduct);
router.post('/webhook/updateproductquantity', updateProductQuantity);
router.post('/webhook/deleteproduct', deleteProduct);


router.post('/send-order', sendOrderToZortout);
router.post('/void-order', voidOrderToZortout);
router.post('/update-payment', updatePaymentToZortout);



export default router;