// controllers/point/pointTransactionController.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import CustomerPoint from '../../models/customerPointModel';
import PointTransaction, { PointTransactionType } from '../../models/pointTransactionModel';
import PointSetting from '../../models/pointSettingModel';
import Order from '../../models/orderModel';

// เพิ่มพอยต์จากการสั่งซื้อ
export const addPointFromOrder = async (orderId: string, userId: string, totalAmount: number) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // ดึงการตั้งค่าพอยต์
    const pointSetting = await PointSetting.findOne().session(session);
    
    if (!pointSetting || !pointSetting.isActive) {
      await session.abortTransaction();
      return null;
    }

    // คำนวณพอยต์ที่จะได้รับ
    const points = Math.floor(totalAmount * pointSetting.pointsPerBaht);

    // ดึงหรือสร้างข้อมูล CustomerPoint
    let customerPoint = await CustomerPoint.findOne({ customerId: userId }).session(session);
    if (!customerPoint) {
      customerPoint = new CustomerPoint({
        customerId: userId,
        points: 0,
        totalEarnedPoints: 0,
        totalUsedPoints: 0
      });
    }

    // อัพเดตพอยต์
    customerPoint.points += points;
    customerPoint.totalEarnedPoints += points;
    await customerPoint.save({ session });

    // บันทึกประวัติการได้รับพอยต์
    const transaction = new PointTransaction({
      customerId: userId,
      type: PointTransactionType.EARNED,
      points: points,
      orderId: orderId,
      description: `ได้รับพอยต์จากการสั่งซื้อ #${orderId}`
    });
    await transaction.save({ session });

    await session.commitTransaction();
    return { success: true, points };

  } catch (error) {
    await session.abortTransaction();
    console.error('Error adding points from order:', error);
    throw error;
  } finally {
    session.endSession();
  }
};

// ดึงประวัติการทำรายการพอยต์
export const getPointTransactions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const transactions = await PointTransaction.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderId', 'orderId')
      .populate('couponId', 'code');

    const totalItems = await PointTransaction.countDocuments({ customerId: userId });

    res.json({
      items: transactions,
      totalItems,
      currentPage: page,
      totalPages: Math.ceil(totalItems / limit)
    });

  } catch (error) {
    console.error('Error fetching point transactions:', error);
    res.status(500).json({
      message: 'Error fetching point transactions',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ดึงข้อมูลพอยต์ของลูกค้า
export const getCustomerPoints = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const customerPoint = await CustomerPoint.findOne({ customerId: userId });
    
    if (!customerPoint) {
      return res.json({
        points: 0,
        totalEarnedPoints: 0,
        totalUsedPoints: 0
      });
    }

    res.json(customerPoint);

  } catch (error) {
    console.error('Error fetching customer points:', error);
    res.status(500).json({
      message: 'Error fetching customer points',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ใช้พอยต์แลกตั๋ว
export const usePointsForTicket = async (req: Request, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { userId, ticketId } = req.body;

    // ตรวจสอบพอยต์คงเหลือ
    const customerPoint = await CustomerPoint.findOne({ customerId: userId }).session(session);
    if (!customerPoint) {
      throw new Error('Customer point record not found');
    }

    // ดึงข้อมูลตั๋ว
    const ticket = await mongoose.model('PointTicket').findById(ticketId).session(session);
    if (!ticket || !ticket.isActive) {
      throw new Error('Ticket not found or inactive');
    }

    // ตรวจสอบพอยต์เพียงพอ
    if (customerPoint.points < ticket.pointCost) {
      throw new Error('Insufficient points');
    }

    // หักพอยต์
    customerPoint.points -= ticket.pointCost;
    customerPoint.totalUsedPoints += ticket.pointCost;
    await customerPoint.save({ session });

    // บันทึกประวัติการใช้พอยต์
    const transaction = new PointTransaction({
      customerId: userId,
      type: PointTransactionType.USED,
      points: ticket.pointCost,
      couponId: ticketId,
      description: `ใช้พอยต์แลกตั๋ว ${ticket.name}`
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json({ 
      success: true, 
      remainingPoints: customerPoint.points,
      ticket 
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Error using points for ticket:', error);
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Error using points for ticket'
    });
  } finally {
    session.endSession();
  }
};