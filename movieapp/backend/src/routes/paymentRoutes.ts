import { Router } from 'express';
import {
  processPayment,
  getPaymentStatus,
  healthCheck
} from '../controllers/paymentController';

const router = Router();

/**
 * POST /api/payments/process
 * Process a payment locally (no external service required)
 * Body: { amount, currency, cardNumber, cardHolder, expiryDate, cvv, movieId, seats, showtime }
 * Returns: { success, paymentId, amount, currency, status, message }
 */
router.post('/process', processPayment);

/**
 * GET /api/payments/status/:paymentId
 * Get the status of a payment
 * Returns: { success, paymentId, status, message }
 */
router.get('/status/:paymentId', getPaymentStatus);

/**
 * GET /api/payments/health
 * Health check for payment service
 */
router.get('/health', healthCheck);

export default router;
