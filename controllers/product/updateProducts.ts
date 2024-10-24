// controllers/product/updateStatus.ts
import { Request, Response } from 'express';
import Product from '../../models/productModel';

export const updateProductStatus = async (req: Request, res: Response) => {
  try {
    const { productId, active } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    if (typeof active !== 'boolean') {
      return res.status(400).json({ message: 'Active status must be a boolean' });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { active },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      message: 'Product status updated successfully',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};