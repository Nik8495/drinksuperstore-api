import './utils/loadEnv.js';

import express from 'express';
import cors from 'cors';
import productRoutes from './routes/ProductRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import brandRoutes from './routes/brandRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import addressRoutes from './routes/addressRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import authRoutes from './routes/authRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import configRoutes from './routes/configRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:4200',
    'https://drinksuperstore.co.uk',
    'https://www.drinksuperstore.co.uk',
  ],
  credentials: true,
}));
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/brands', brandRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/config', configRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
  res.send('DrinkStore Backend is running!');
});

export default app;
