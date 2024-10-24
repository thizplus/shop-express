// controllers/category/statusController.ts
import { Request, Response } from 'express';
import Category from '../../models/categoryModel';

export const updateCategoryStatus = async (req: Request, res: Response) => {
  try {
    const { categoryId, active } = req.body;

    const category = await Category.findByIdAndUpdate(
      categoryId,
      { active },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error updating category status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};