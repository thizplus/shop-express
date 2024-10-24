import { Request, Response } from 'express';
import Price from '../../models/priceModel';

export const deletePrice = async (req: Request, res: Response) => {
  try {
    const { priceId } = req.params; // รับ ID ของราคาที่ต้องการลบจาก URL parameter

    if (!priceId) {
      return res.status(400).json({ message: 'Price ID is required' });
    }

    // ใช้ $pull operator เพื่อลบ object ที่มี priceId ตรงกับ priceId ออกจาก listPrice array
    const result = await Price.updateMany(
      { 'listPrice.priceId': priceId },  // เปลี่ยนเป็น 'listPrice.priceId'
      { $pull: { listPrice: { priceId: priceId } } }  // เปลี่ยนเป็น 'priceId'
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: 'Price not found or already deleted' });
    }

    res.status(200).json({
      message: 'Price deleted successfully',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('Error deleting price:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
