import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

// Existing route imports
import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import priceRoutes from './routes/priceRoutes';
import multiplePriceRoutes from './routes/multiplePriceRoutes';
import wholesaleRoutes from './routes/wholesaleRoutes';
import storeRoutes from './routes/storeRoutes';
import lineLoginRoutes from './routes/lineLoginRoutes';
import shippingRoutes from './routes/shippingRoutes';
import orderRoutes from './routes/orderRoutes';
import slipOKRoutes from './routes/slipOKRoutes';
import clientRoutes from './routes/clientRoutes';
import couponRoutes from './routes/couponRoutes';
import pointRoutes from './routes/pointRoutes';

// Socket controller imports
import { setupWholesaleProductSocket } from './controllers/wholesale/wholesaleProductController';
import { setupMultiPriceProductSocket } from './controllers/wholesale/getProductsWithMultiPrices';

// Order Scheduler imports
import { OrderScheduler } from './service/orderScheduler';
import { schedulerLogger } from './service/logger';
import priceListRoutes from './routes/priceListRoutes';
import shopRoutes from './routes/shopRoutes';
import warehouseRoutes from './routes/warehouseRoutes';

import dailyPaymentRoutes from './routes/dailyPaymentRoutes';

import migrationRoutes from './routes/migrationRoutes';

dotenv.config();
process.env.TZ = 'Asia/Bangkok';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Set Socket.IO instance on app
app.set('socketio', io);

// Initialize Order Scheduler
try {
  OrderScheduler.getInstance();
  schedulerLogger.info('Order expiration scheduler initialized successfully');
} catch (error) {
  schedulerLogger.error('Failed to initialize order scheduler', { error });
  // ไม่ exit process เพื่อให้แอพยังทำงานต่อได้แม้ scheduler จะมีปัญหา
  console.error('Order scheduler initialization failed, but application continues');
}

// Database connection
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => {
    console.log('Connected to MongoDB');
    schedulerLogger.info('MongoDB connection established');
  })
  .catch(err => {
    console.error('Could not connect to MongoDB', err);
    schedulerLogger.error('MongoDB connection failed', { error: err });
  });

// Routes



app.use('/api/users', userRoutes);
app.use('/api/shops', shopRoutes);

app.use('/api/products', productRoutes);
app.use('/api/category', categoryRoutes);

app.use('/api/price-list/', priceListRoutes);
app.use('/api/store/prices', priceRoutes);


app.use('/api/store/prices/multiple', multiplePriceRoutes);
app.use('/api/store', storeRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/wholesale', wholesaleRoutes);
app.use('/api/shipping', shippingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/line', lineLoginRoutes);
app.use('/api/slipOK', slipOKRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/points', pointRoutes);

app.use('/api/daily-payment', dailyPaymentRoutes);

app.use('/api/migration', migrationRoutes);

// Setup Socket.IO for wholesale
setupWholesaleProductSocket(io);
setupMultiPriceProductSocket(io);

// Graceful shutdown
const gracefulShutdown = () => {
  schedulerLogger.info('Application shutdown initiated');
  const scheduler = OrderScheduler.getInstance();
  scheduler.stopScheduler();
  
  // Close MongoDB connection
  mongoose.connection.close()
    .then(() => {
      schedulerLogger.info('MongoDB connection closed');
      process.exit(0);
    })
    .catch(err => {
      schedulerLogger.error('Error closing MongoDB connection', { error: err });
      process.exit(1);
    });
};

// Shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  schedulerLogger.info(`Server started on port ${PORT}`);
});

export default app;