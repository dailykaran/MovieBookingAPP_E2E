"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
/**
 * POST /api/payments/create-intent
 * Create a Stripe Payment Intent for checkout
 * Body: { amount: number, currency?: string, description?: string, metadata?: object }
 * Returns: { clientSecret, paymentIntentId, status }
 */
router.post('/create-intent', paymentController_1.createPaymentIntent);
/**
 * GET /api/payments/intent/:paymentIntentId
 * Get the status of a Payment Intent
 * Returns: { id, status, amount, currency }
 */
router.get('/intent/:paymentIntentId', paymentController_1.getPaymentIntentStatus);
/**
 * POST /api/payments/webhook
 * Stripe webhook for payment events
 * Required: stripe-signature header
 */
router.post('/webhook', paymentController_1.handleStripeWebhook);
exports.default = router;
