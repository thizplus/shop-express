import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import dotenv from 'dotenv';
import { Server } from 'socket.io';

import userRoutes from './routes/userRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import priceRoutes from './routes/priceRoutes';
import multiplePriceRoutes from './routes/multiplePriceRoutes';
import zortoutRoutes from './routes/zortoutRoutes';
import wholesaleRoutes from './routes/wholesaleRoutes';
import storeRoutes from './routes/storeRoutes';
import lineLoginRoutes from './routes/lineLoginRoutes';

import shippingRoutes from './routes/shippingRoutes';

import orderRoutes from './routes/orderRoutes';

import slipOKRoutes from './routes/slipOKRoutes'

import { setupWholesaleProductSocket } from './controllers/wholesale/wholesaleProductController';
import { setupMultiPriceProductSocket } from './controllers/wholesale/getProductsWithMultiPrices';
import clientRoutes from './routes/clientRoutes';

dotenv.config();

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

// Database connection
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB', err));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/category', categoryRoutes);

app.use('/api/store/prices', priceRoutes);
app.use('/api/store/prices/multiple', multiplePriceRoutes);

app.use('/api/store', storeRoutes);

app.use('/api/zort', zortoutRoutes);

app.use('/api/wholesale', wholesaleRoutes);

app.use('/api/shipping', shippingRoutes);

app.use('/api/orders', orderRoutes);

app.use('/api/line', lineLoginRoutes);

app.use('/api/slipOK', slipOKRoutes);

app.use('/api/clients', clientRoutes);

// Setup Socket.IO for wholesale
setupWholesaleProductSocket(io);
setupMultiPriceProductSocket(io);

const PORT = process.env.PORT || 8000;

server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

export default app;