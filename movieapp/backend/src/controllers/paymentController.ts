import { Request, Response } from 'express';

/**
 * Simple Local Payment Processing
 * Mock payment system for testing without external services
 */

interface PaymentRequest {
  amount: number;
  currency?: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
  movieId: number;
  seats: number[];
  showtime: string;
}

interface PaymentResponse {
  success: boolean;
  paymentId: string;
  amount: number;
  currency: string;
  status: string;
  message: string;
}

/**
 * Process a simple local payment
 * No external service required - works 100% locally
 */
export const processPayment = async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'inr', cardNumber, cardHolder, expiryDate, cvv, movieId, seats, showtime }: PaymentRequest = req.body;

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
      } as PaymentResponse);
    } else {
      return res.status(400).json({
        success: false,
        paymentId,
        amount,
        currency,
        status: 'failed',
        message: 'Payment declined. Please use a valid test card.'
      });
    }
  } catch (error: any) {
    console.error('Payment Processing Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment processing failed'
    });
  }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
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
  } catch (error: any) {
    console.error('Get Payment Status Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retrieve payment status'
    });
  }
};

/**
 * Simple health check for payment service
 */
export const healthCheck = async (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    message: 'Payment service is running on localhost',
    timestamp: new Date().toISOString()
  });
};

