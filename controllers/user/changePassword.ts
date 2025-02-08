// controllers/users/changePassword.ts
import { Request, Response } from 'express';
import User from '../../models/userModel';
import bcrypt from 'bcryptjs';

export const changePassword = async (req: Request, res: Response) => {
  try {
    const { userName, oldPassword, newPassword } = req.body;

    const user = await User.findOne({ username: userName });
    if (!user) {
      return res.status(200).json({
        message: 'ไม่พบผู้ใช้งาน',
        status: false
      });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(200).json({
        message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง',
        status: false
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({
      message: 'เปลี่ยนรหัสผ่านสำเร็จ',
      status: true
    });

  } catch (error) {
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน', 
      error: (error as Error).message,
      status: false 
    });
  }
};