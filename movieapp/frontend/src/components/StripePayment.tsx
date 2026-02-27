/**
 * Stripe Payment iFrame Component
 * Securely embeds Stripe payment form
 * Requires Stripe.js loaded in index.html
 */

import React, { useState, useEffect } from 'react';
import { Box, Alert, CircularProgress } from '@mui/material';

interface StripePaymentProps {
  amount: number;
  currency?: string;
  publishableKey: string;
  clientSecret?: string;
  onCreatePaymentIntent?: () => Promise<string>; // Function to get client secret from backend
  onSuccess: (paymentIntentId: string) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    Stripe: any;
    stripe: any;
    elements: any;
  }
}

const StripePayment: React.FC<StripePaymentProps> = ({
  amount,
  currency = 'inr',
  publishableKey,
  clientSecret: initialClientSecret,
  onCreatePaymentIntent,
  onSuccess,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(initialClientSecret || null);
  const stripeRef = React.useRef<any>(null);
  const elementsRef = React.useRef<any>(null);
  const cardElementRef = React.useRef<any>(null);

  // Initialize Stripe and create payment intent
  useEffect(() => {
    const initialize = async () => {
      // Get client secret from backend if function provided
      if (onCreatePaymentIntent && !clientSecret) {
        try {
          setIsLoading(true);
          const secret = await onCreatePaymentIntent();
          setClientSecret(secret);
        } catch (err: any) {
          setError(err.message || 'Failed to create payment intent');
          onError(err.message || 'Failed to create payment intent');
          return;
        } finally {
          setIsLoading(false);
        }
      }

      // Load Stripe.js from CDN
      if (!window.Stripe) {
        const script = document.createElement('script');
        script.src = 'https://js.stripe.com/v3/';
        script.async = true;
        script.onload = initializeStripe;
        document.head.appendChild(script);
      } else {
        initializeStripe();
      }
    };

    initialize();

    return () => {
      // Cleanup
      if (cardElementRef.current) {
        cardElementRef.current.destroy();
      }
    };
  }, []);

  const initializeStripe = async () => {
    try {
      stripeRef.current = window.Stripe(publishableKey);
      elementsRef.current = stripeRef.current.elements();

      // Create Card Element with custom styling
      const cardElement = elementsRef.current.create('card', {
        style: {
          base: {
            color: '#333',
            fontFamily: '"Roboto", sans-serif',
            fontSize: '16px',
            '::placeholder': {
              color: '#999'
            }
          },
          invalid: {
            color: '#fa755a'
          }
        },
        hidePostalCode: false
      });

      // Mount Card Element to DOM
      const cardContainer = document.getElementById('stripe-card-element');
      if (cardContainer) {
        cardElement.mount(cardContainer);
        cardElementRef.current = cardElement;

        // Listen for errors from card element
        cardElement.addEventListener('change', (event: any) => {
          if (event.error) {
            setError(event.error.message);
          } else {
            setError(null);
          }
        });
      }
    } catch (err) {
      console.error('Stripe initialization error:', err);
      setError('Failed to initialize payment system');
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!clientSecret) {
      setError('Payment system not ready. Please refresh and try again.');
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      if (!stripeRef.current || !cardElementRef.current) {
        throw new Error('Stripe not initialized');
      }

      // Confirm payment with Stripe Elements card element
      const { paymentIntent, error: confirmError } =
        await stripeRef.current.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElementRef.current,
            billing_details: {
              // Add cardholder details if available
            }
          }
        });

      if (confirmError) {
        setError(confirmError.message);
        onError(confirmError.message);
      } else if (paymentIntent?.status === 'succeeded') {
        onSuccess(paymentIntent.id);
      } else if (paymentIntent?.status === 'requires_action') {
        // Handle 3D Secure or other authentication
        setError('Payment requires additional authentication');
        onError('Authentication required');
      } else {
        setError('Payment processing failed. Please try again.');
        onError('Payment processing failed');
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'An error occurred during payment';
      setError(errorMsg);
      onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '32px',
        maxWidth: '500px',
        margin: '20px auto',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}
    >
      <h2 style={{ color: '#1976d2', margin: '0 0 24px 0', textAlign: 'center' }}>
        Stripe Secure Payment
      </h2>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <form onSubmit={handlePayment}>
        <Box sx={{ mb: 3 }}>
          <label style={{ fontWeight: 600, marginBottom: '8px', display: 'block' }}>
            Card Information
          </label>
          <div
            id="stripe-card-element"
            style={{
              border: '1px solid #ddd',
              borderRadius: '4px',
              padding: '12px',
              minHeight: '40px'
            }}
          />
        </Box>

        <Box
          sx={{
            background: '#f5f5f5',
            padding: '16px',
            borderRadius: '6px',
            marginBottom: '24px',
            borderLeft: '4px solid #1976d2'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Amount to Pay:</span>
            <strong style={{ color: '#1976d2', fontSize: '1.2em' }}>
              ₹{amount}
            </strong>
          </div>
        </Box>

        <Box
          sx={{
            background: '#e8f5e9',
            color: '#4caf50',
            padding: '12px',
            borderRadius: '4px',
            textAlign: 'center',
            marginBottom: '24px',
            fontSize: '0.9em',
            fontWeight: '500',
            borderLeft: '4px solid #4caf50'
          }}
        >
          🔒 Your payment is secure and encrypted by Stripe
        </Box>

        <button
          type="submit"
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px 24px',
            backgroundColor: isLoading ? '#ccc' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1em',
            fontWeight: 'bold',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'background 0.2s'
          }}
        >
          {isLoading && <CircularProgress size={20} sx={{ color: 'white' }} />}
          {isLoading ? 'Processing...' : `Pay ₹${amount}`}
        </button>
      </form>

      <p
        style={{
          textAlign: 'center',
          marginTop: '16px',
          fontSize: '0.85em',
          color: '#666'
        }}
      >
        Powered by <strong>Stripe</strong>
      </p>
    </Box>
  );
};

export default StripePayment;
