import { Request, Response } from 'express';
import User from '../../models/userModel';
import bcrypt from 'bcryptjs';

const userRegister = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username, password } = req.body;

        const existingUser = await User.findOne({ $or: [{ username }, { username }] });
        if (existingUser) {
            res.status(200).json(
                {
                    message: "Username or username already exists",
                    status: false
                }
            );
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const newUser = new User({
            username,
            password: hashedPassword
        });

        await newUser.save();

        res.status(201).json(
            {
                message: "User registered successfully",
                status: true
            }
        );
    } catch (error) {
        res.status(500).json({ message: "Error registering user", error: (error as Error).message });
    }
};

export default userRegister