import { Request, Response } from 'express';
import Category, { ICategory } from '../../models/categoryModel';

export const searchCategory = async (req: Request, res: Response) => {
  try {
    const { query, page = '1', limit = '10' } = req.query;
    const searchRegex = new RegExp(query as string, 'i');
    const currentPage = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    const items: ICategory[] = await Category.find({
      $or: [
        { name: searchRegex }
      ]
    })
      .skip((currentPage - 1) * limitNumber)
      .limit(limitNumber)
      .exec();

    const totalItems = await Category.countDocuments({
      $or: [
        { name: searchRegex },
        { sku: searchRegex }
      ]
    });

    const totalPages = Math.ceil(totalItems / limitNumber);

    res.json({
      items,
      currentPage,
      totalPages,
      totalItems
    });
  } catch (error) {
    console.error('Error searching categories:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};