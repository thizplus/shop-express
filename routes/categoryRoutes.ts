
import express from 'express';

import { getAdminCategories, getCategory, getClientCategories } from './../controllers/category/getCategory';
import { searchCategory } from '../controllers/category/searchCategory';
import { updateCategoryStatus } from '../controllers/category/statusController';
import { createCategory, updateCategory } from '../controllers/category/categoryController';

const router = express.Router();

//router.post('/import-from-zortout', importProductsFromZortout);

router.post('/create', createCategory);
router.put('/update', updateCategory);

router.get('/all', getCategory);
router.get('/admin', getAdminCategories); // สำหรับ admin เห็นทั้งหมด
router.get('/client', getClientCategories);      // สำหรับ client เห็นแค่ active

router.get('/search', searchCategory);
router.patch('/update-status', updateCategoryStatus);



export default router;

