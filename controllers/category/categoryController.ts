// controllers/category/categoryController.ts
import { Request, Response } from 'express';
import Category from '../../models/categoryModel';


// controllers/category/categoryController.ts
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name, description = '' } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'ชื่อหมวดหมู่ไม่ถูกต้อง' });
    }

    const lastCategory = await Category.findOne().sort({ catId: -1 });
    const newCatId = lastCategory ? `MAN${String(Number(lastCategory.catId.slice(3)) + 1).padStart(4, '0')}` : 'MAN0001';

    const category = await Category.create({
      catId: newCatId,
      name: name.trim(),
      description,
      active: true
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { _id, name, description } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ message: 'ชื่อหมวดหมู่ไม่ถูกต้อง' });
    }

    const category = await Category.findByIdAndUpdate(
      _id,
      { 
        name: name.trim(),
        description: description || ''
      },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่' });
    }

    res.json(category);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};