import { Request, Response } from 'express';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2023-10-16'
});

interface PaymentIntentRequest {
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a Stripe Payment Intent
 * Used by frontend to get a client secret for card payment processing
 */
export const createPaymentIntent = async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'inr', description, metadata }: PaymentIntentRequest = req.body;

    // Validate amount
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        error: 'Invalid amount. Must be greater than 0.' 
      });
    }

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
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
  } catch (error: any) {
    console.error('Stripe Payment Intent Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to create payment intent' 
    });
  }
};

/**
 * Retrieve a Stripe Payment Intent status
 */
export const getPaymentIntentStatus = async (req: Request, res: Response) => {
  try {
    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return res.status(400).json({ 
        error: 'Payment Intent ID is required' 
      });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return res.status(200).json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency
    });
  } catch (error: any) {
    console.error('Stripe Retrieve Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to retrieve payment intent' 
    });
  }
};

/**
 * Handle Stripe webhook for payment confirmations
 * This would be called by Stripe to confirm payment completion
 */
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !sig) {
      return res.status(400).json({ error: 'Missing webhook signature or secret' });
    }

    const event = stripe.webhooks.constructEvent(
      req.body as string,
      sig,
      webhookSecret
    );

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
  } catch (error: any) {
    console.error('Webhook Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Webhook processing failed' 
    });
  }
};
