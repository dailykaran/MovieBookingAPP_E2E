"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentController_1 = require("../controllers/paymentController");
const router = (0, express_1.Router)();
/**
 * POST /api/payments/process
 * Process a payment locally (no external service required)
 * Body: { amount, currency, cardNumber, cardHolder, expiryDate, cvv, movieId, seats, showtime }
 * Returns: { success, paymentId, amount, currency, status, message }
 */
router.post('/process', paymentController_1.processPayment);
/**
 * GET /api/payments/status/:paymentId
 * Get the status of a payment
 * Returns: { success, paymentId, status, message }
 */
router.get('/status/:paymentId', paymentController_1.getPaymentStatus);
/**
 * GET /api/payments/health
 * Health check for payment service
 */
router.get('/health', paymentController_1.healthCheck);
exports.default = router;
