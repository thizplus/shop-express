// controllers/point/pointTicketController.ts
import { Request, Response } from 'express';
import PointTicket from '../../models/pointTicketModel';

// สร้างตั๋วใหม่
export const createPointTicket = async (req: Request, res: Response) => {
  try {
    const ticket = new PointTicket(req.body);
    await ticket.save();
    res.status(201).json(ticket);
  } catch (error) {
    res.status(400).json({
      message: 'Error creating point ticket',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// ดึงข้อมูลตั๋วทั้งหมด
export const getPointTickets = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;

  try {
    const total = await PointTicket.countDocuments();
    const tickets = await PointTicket.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      items: tickets,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching point tickets' });
  }
};

// อัพเดตสถานะตั๋ว
export const toggleTicketStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ticket = await PointTicket.findById(id);

    if (!ticket) {
      return res.status(404).json({ message: 'Point ticket not found' });
    }

    ticket.isActive = !ticket.isActive;
    await ticket.save();

    res.json(ticket);
  } catch (error) {
    res.status(500).json({ message: 'Error toggling point ticket status' });
  }
};