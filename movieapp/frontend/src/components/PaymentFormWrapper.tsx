/**
 * React Wrapper for PaymentForm Web Component
 * Bridges React props to Web Component
 */

import React, { useEffect, useRef } from 'react';

interface PaymentFormWrapperProps {
  amount: number;
  currency?: string;
  onPaymentSubmit: (paymentData: any) => void;
  onPaymentCancel: () => void;
}

const PaymentFormWrapper: React.FC<PaymentFormWrapperProps> = ({
  amount,
  currency = 'INR',
  onPaymentSubmit,
  onPaymentCancel
}) => {
  const paymentFormRef = useRef<any>(null);

  useEffect(() => {
    const element = paymentFormRef.current;
    if (element) {
      // Set attributes
      element.setAttribute('amount', amount.toString());
      element.setAttribute('currency', currency);

      // Listen for custom events
      const handlePaymentSubmitted = (event: any) => {
        onPaymentSubmit(event.detail);
      };

      const handlePaymentCancelled = () => {
        onPaymentCancel();
      };

      element.addEventListener('payment-submitted', handlePaymentSubmitted);
      element.addEventListener('payment-cancelled', handlePaymentCancelled);

      return () => {
        element.removeEventListener('payment-submitted', handlePaymentSubmitted);
        element.removeEventListener('payment-cancelled', handlePaymentCancelled);
      };
    }
  }, [amount, currency, onPaymentSubmit, onPaymentCancel]);

  // Require Web Component to be registered
  useEffect(() => {
    import('./PaymentFormWebComponent').catch(console.error);
  }, []);

  return React.createElement('payment-form', { ref: paymentFormRef });
};

export default PaymentFormWrapper;
