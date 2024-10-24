import express from 'express';
import userRegister  from '../controllers/user/register';
import userLogin  from '../controllers/user/login';

const router = express.Router();

router.post('/register', userRegister);
router.post('/login', userLogin);

export default router;