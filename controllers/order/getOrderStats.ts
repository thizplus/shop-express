// controllers/orders/getOrderStats.ts
import { Request, Response } from 'express';
import Order from '../../models/orderModel';
import Product from '../../models/productModel';
import Client from '../../models/clientModel';
import Category from '../../models/categoryModel';
import { startOfDay, endOfDay } from 'date-fns';

export const getOrderStats = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    const parsedStartDate = startOfDay(new Date(startDate as string));
    const parsedEndDate = endOfDay(new Date(endDate as string));

    // 1. ดึงข้อมูล Orders ในช่วงเวลาที่กำหนด
    const orders = await Order.find({
      createdAt: {
        $gte: parsedStartDate,
        $lte: parsedEndDate
      },
      'payment.status': 'success'
    }).sort({ createdAt: 1 });

    // 2. รวบรวม SKUs และ userIds
    const skus = new Set<string>();
    const userIds = new Set<string>();
    orders.forEach(order => {
      order.listProducts.forEach(product => skus.add(product.sku));
      userIds.add(order.userId);
    });

    // 3. ดึงข้อมูลสินค้าพร้อมหมวดหมู่
    const products = await Product.find({ sku: { $in: Array.from(skus) } });
    const productMap = new Map(products.map(p => [p.sku, p]));

    // 4. ดึงข้อมูลหมวดหมู่ทั้งหมด
    const categories = await Category.find({ active: true });
    const categoryMap = new Map(categories.map(c => [c.catId, c]));

    // 5. ดึงข้อมูลลูกค้า
    const clients = await Client.find({ userId: { $in: Array.from(userIds) } });
    const clientMap = new Map(clients.map(c => [c.userId, c]));

    // 6. สร้าง Maps สำหรับเก็บข้อมูลสถิติ
    const productStats = new Map();
    const customerStats = new Map();
    const categoryStats = new Map();

    // 7. วนลูปคำนวณสถิติ
    orders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      const formattedDate = orderDate.toLocaleString('th-TH', {
        timeZone: 'Asia/Bangkok',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // คำนวณข้อมูลสินค้าและหมวดหมู่
      order.listProducts.forEach(product => {
        const productInfo = productMap.get(product.sku);
        if (!productInfo) return;

        // อัพเดทสถิติสินค้า
        const productStat = productStats.get(product.sku) || {
          sku: product.sku,
          name: product.name,
          totalQty: 0,
          totalAmount: 0,
          imagePath: productInfo.imagepath,
          categories: productInfo.categories
        };
        
        productStat.totalQty += product.qty;
        productStat.totalAmount += product.total;
        productStats.set(product.sku, productStat);

        // อัพเดทสถิติหมวดหมู่
        productInfo.categories.forEach(cat => {
          const categoryStat = categoryStats.get(cat.catId) || {
            catId: cat.catId,
            name: categoryMap.get(cat.catId)?.name || cat.name,
            totalAmount: 0,
            totalOrders: 0,
            totalItems: 0
          };

          categoryStat.totalAmount += product.total;
          categoryStat.totalItems += product.qty;
          categoryStat.totalOrders += 1;
          categoryStats.set(cat.catId, categoryStat);
        });
      });

      // คำนวณข้อมูลลูกค้า
      const client = clientMap.get(order.userId);
      if (!client) return;

      const defaultAddress = client.shippingAddresses.find(addr => addr.isDefault);
      const customerStat = customerStats.get(order.userId) || {
        userId: order.userId,
        name: client.displayName,
        phone: defaultAddress?.cusTel || '',
        userType: client.userType,
        pictureUrl: client.pictureUrl,
        orderCount: 0,
        totalAmount: 0,
        avgOrderValue: 0,
        lastOrderDate: formattedDate
      };

      customerStat.orderCount += 1;
      customerStat.totalAmount += order.netTotal;
      customerStat.avgOrderValue = customerStat.totalAmount / customerStat.orderCount;

      // เปรียบเทียบและอัพเดทวันที่ล่าสุด
      const currentDate = new Date(order.createdAt);
      const lastDate = new Date(customerStat.lastOrderDate.replace(/[^\d\s:]/g, ''));
      if (currentDate > lastDate) {
        customerStat.lastOrderDate = formattedDate;
      }

      customerStats.set(order.userId, customerStat);
    });

    // 8. แปลงข้อมูลและจัดเรียง
    const topProducts = Array.from(productStats.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)
      .map(p => ({
        ...p,
        totalAmount: Math.round(p.totalAmount * 100) / 100
      }));

    const topCategories = Array.from(categoryStats.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)
      .map(c => ({
        ...c,
        totalAmount: Math.round(c.totalAmount * 100) / 100
      }));

    const topCustomers = Array.from(customerStats.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 10)
      .map(c => ({
        ...c,
        totalAmount: Math.round(c.totalAmount * 100) / 100,
        avgOrderValue: Math.round(c.avgOrderValue * 100) / 100
      }));

    // 9. คำนวณสรุปรวม
    const summary = {
      totalProducts: productStats.size,
      totalCategories: categoryStats.size,
      totalCustomers: customerStats.size,
      totalAmount: Math.round(orders.reduce((sum, order) => sum + order.netTotal, 0) * 100) / 100,
      totalOrders: orders.length,
      avgOrderValue: orders.length > 0 
        ? Math.round((orders.reduce((sum, order) => sum + order.netTotal, 0) / orders.length) * 100) / 100 
        : 0
    };

    // ฟอร์แมตวันที่สำหรับ response
    const startDateStr = parsedStartDate.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const endDateStr = parsedEndDate.toLocaleString('th-TH', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    res.json({
      topProducts,
      topCategories,
      topCustomers,
      summary,
      dateRange: {
        start: startDateStr,
        end: endDateStr
      }
    });

  } catch (error) {
    console.error('Error generating order statistics:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};