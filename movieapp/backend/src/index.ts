import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import movieRoutes from './routes/movieRoutes';
import paymentRoutes from './routes/paymentRoutes';

dotenv.config();

const app = express();

// 🔒 SECURITY: Restrict CORS to specific origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL || ''
].filter((origin): origin is string => !!origin);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// 🔒 SECURITY: Limit request payload size
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));

// 🔒 SECURITY: Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

app.use('/api', movieRoutes);
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});