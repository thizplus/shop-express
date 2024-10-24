import { Request, Response } from 'express';
import Category, { ICategory } from '../../models/categoryModel';

export const getCategory = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    const items: ICategory[] = await Category.find({})
      .skip(skip)
      .limit(limit)
      .exec();
    
    const totalItems: number = await Category.countDocuments();
    
    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};


// สำหรับ admin - เห็นทั้งหมด
export const getAdminCategories = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    const items: ICategory[] = await Category.find({})
      .skip(skip)
      .limit(limit)
      .exec();
    
    const totalItems: number = await Category.countDocuments();
    
    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// สำหรับ client - เห็นเฉพาะ active
export const getClientCategories = async (req: Request, res: Response) => {
  try {
    const page: number = parseInt(req.query.page as string) || 1;
    const limit: number = parseInt(req.query.limit as string) || 20;
    const skip: number = (page - 1) * limit;

    const items: ICategory[] = await Category.find({ active: true })
      .skip(skip)
      .limit(limit)
      .exec();
    
    const totalItems: number = await Category.countDocuments({ active: true });
    
    res.json({
      items,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit),
      totalItems
    });
  } catch (error) {
    console.error('Error fetching client categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};