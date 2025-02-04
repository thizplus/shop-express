import express from 'express';
import userRegister  from '../controllers/user/register';
import userLogin  from '../controllers/user/login';
import { changePassword } from '../controllers/user/changePassword';

const router = express.Router();

router.post('/register', userRegister);
router.post('/login', userLogin);
router.post('/change-password', changePassword);


export default router;