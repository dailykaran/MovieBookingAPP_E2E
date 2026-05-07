"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheck = exports.getPaymentStatus = exports.processPayment = void 0;
/**
 * Process a simple local payment
 * No external service required - works 100% locally
 */
const processPayment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, currency = 'inr', cardNumber, cardHolder, expiryDate, cvv, movieId, seats, showtime } = req.body;
        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Invalid amount. Must be greater than 0.'
            });
        }
        // Validate card details
        if (!cardNumber || !cardHolder || !expiryDate || !cvv) {
            return res.status(400).json({
                success: false,
                message: 'All card details are required'
            });
        }
        // Simple validation
        const cardDigits = cardNumber.replace(/\s/g, '');
        if (cardDigits.length < 13 || cardDigits.length > 19) {
            return res.status(400).json({
                success: false,
                message: 'Invalid card number'
            });
        }
        if (cvv.length < 3 || cvv.length > 4) {
            return res.status(400).json({
                success: false,
                message: 'Invalid CVV'
            });
        }
        // Generate unique payment ID
        const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        // Simulate payment processing (in real app, this would charge the card)
        // For testing: Accept any card number that passes basic validation
        const isSuccessful = !cardNumber.startsWith('0'); // Simple rule: reject cards starting with 0
        if (isSuccessful) {
            return res.status(200).json({
                success: true,
                paymentId,
                amount,
                currency,
                status: 'completed',
                message: 'Payment processed successfully!'
            });
        }
        else {
            return res.status(400).json({
                success: false,
                paymentId,
                amount,
                currency,
                status: 'failed',
                message: 'Payment declined. Please use a valid test card.'
            });
        }
    }
    catch (error) {
        console.error('Payment Processing Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Payment processing failed'
        });
    }
});
exports.processPayment = processPayment;
/**
 * Get payment status
 */
const getPaymentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paymentId } = req.params;
        if (!paymentId) {
            return res.status(400).json({
                success: false,
                message: 'Payment ID is required'
            });
        }
        // For local testing, we'll just return success status
        return res.status(200).json({
            success: true,
            paymentId,
            status: 'completed',
            message: 'Payment retrieved successfully'
        });
    }
    catch (error) {
        console.error('Get Payment Status Error:', error);
        return res.status(500).json({
            success: false,
            message: error.message || 'Failed to retrieve payment status'
        });
    }
});
exports.getPaymentStatus = getPaymentStatus;
/**
 * Simple health check for payment service
 */
const healthCheck = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    return res.status(200).json({
        success: true,
        message: 'Payment service is running on localhost',
        timestamp: new Date().toISOString()
    });
});
exports.healthCheck = healthCheck;
