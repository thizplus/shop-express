import { Request, Response } from 'express';
import User from '../../models/userModel';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        // ตรวจสอบว่ามีผู้ใช้ที่มี username นี้หรือไม่
        const user = await User.findOne({ username });
        if (!user) {
            res.status(200).json({
                message: "Username not found",
                status: false
            });
            return;
        }

        // ตรวจสอบรหัสผ่าน
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(200).json({
                message: "Invalid username or password",
                status: false
            });
            return;
        }

        // สร้าง JWT token
        const token = jwt.sign(
            { userId: user._id },
            `${process.env.JWT_SECRET}`,
            { expiresIn: '12h' }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user._id,
                username: user.username
            },
            status: true
        });
    } catch (error) {
        res.status(500).json({ 
            message: "Error logging in", 
            error: (error as Error).message,
            status: false 
        });
    }
};

export default userLogin