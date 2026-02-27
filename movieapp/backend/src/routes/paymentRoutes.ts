import { Router } from 'express';
import {
  createPaymentIntent,
  getPaymentIntentStatus,
  handleStripeWebhook
} from '../controllers/paymentController';

const router = Router();

/**
 * POST /api/payments/create-intent
 * Create a Stripe Payment Intent for checkout
 * Body: { amount: number, currency?: string, description?: string, metadata?: object }
 * Returns: { clientSecret, paymentIntentId, status }
 */
router.post('/create-intent', createPaymentIntent);

/**
 * GET /api/payments/intent/:paymentIntentId
 * Get the status of a Payment Intent
 * Returns: { id, status, amount, currency }
 */
router.get('/intent/:paymentIntentId', getPaymentIntentStatus);

/**
 * POST /api/payments/webhook
 * Stripe webhook for payment events
 * Required: stripe-signature header
 */
router.post('/webhook', handleStripeWebhook);

export default router;
