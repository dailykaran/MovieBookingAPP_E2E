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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleStripeWebhook = exports.getPaymentIntentStatus = exports.createPaymentIntent = void 0;
const stripe_1 = __importDefault(require("stripe"));
// Initialize Stripe
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
    apiVersion: '2023-10-16'
});
/**
 * Create a Stripe Payment Intent
 * Used by frontend to get a client secret for card payment processing
 */
const createPaymentIntent = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { amount, currency = 'inr', description, metadata } = req.body;
        // Validate amount
        if (!amount || amount <= 0) {
            return res.status(400).json({
                error: 'Invalid amount. Must be greater than 0.'
            });
        }
        // Create payment intent with Stripe
        const paymentIntent = yield stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency,
            description: description || 'Movie Ticket Booking',
            metadata: metadata || {}
        });
        // Return client secret to frontend
        return res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            status: paymentIntent.status
        });
    }
    catch (error) {
        console.error('Stripe Payment Intent Error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to create payment intent'
        });
    }
});
exports.createPaymentIntent = createPaymentIntent;
/**
 * Retrieve a Stripe Payment Intent status
 */
const getPaymentIntentStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { paymentIntentId } = req.params;
        if (!paymentIntentId) {
            return res.status(400).json({
                error: 'Payment Intent ID is required'
            });
        }
        const paymentIntent = yield stripe.paymentIntents.retrieve(paymentIntentId);
        return res.status(200).json({
            id: paymentIntent.id,
            status: paymentIntent.status,
            amount: paymentIntent.amount,
            currency: paymentIntent.currency
        });
    }
    catch (error) {
        console.error('Stripe Retrieve Error:', error);
        return res.status(500).json({
            error: error.message || 'Failed to retrieve payment intent'
        });
    }
});
exports.getPaymentIntentStatus = getPaymentIntentStatus;
/**
 * Handle Stripe webhook for payment confirmations
 * This would be called by Stripe to confirm payment completion
 */
const handleStripeWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sig = req.headers['stripe-signature'];
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret || !sig) {
            return res.status(400).json({ error: 'Missing webhook signature or secret' });
        }
        const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        // Handle different event types
        switch (event.type) {
            case 'payment_intent.succeeded':
                console.log('✅ Payment succeeded:', event.data.object);
                // TODO: Update booking as confirmed in database
                break;
            case 'payment_intent.payment_failed':
                console.log('❌ Payment failed:', event.data.object);
                // TODO: Update booking as failed in database
                break;
            case 'charge.refunded':
                console.log('💰 Charge refunded:', event.data.object);
                // TODO: Handle refund in database
                break;
            default:
                console.log(`Unhandled event type: ${event.type}`);
        }
        return res.status(200).json({ received: true });
    }
    catch (error) {
        console.error('Webhook Error:', error);
        return res.status(500).json({
            error: error.message || 'Webhook processing failed'
        });
    }
});
exports.handleStripeWebhook = handleStripeWebhook;
