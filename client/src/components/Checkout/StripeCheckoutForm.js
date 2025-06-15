import React, { useState } from 'react';
import {
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import axios from '../../api/axios';

const StripeCheckoutForm = ({ onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js hasn't yet loaded.
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders`,
      },
      redirect: 'if_required'
    });

    if (error) {
      console.error("Payment error:", error);
      setMessage(error.message);
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      try {
        // Confirm payment on the backend
        await axios.post('/payments/confirm', {
          paymentIntentId: paymentIntent.id
        });
        setMessage('Payment successful!');
        onSuccess();
      } catch (confirmError) {
        console.error("Payment confirmation error:", confirmError);
        setMessage('Payment processed but confirmation failed. Please contact support.');
      }
      setIsProcessing(false);
    } else {
      setMessage('An unexpected error occurred.');
      setIsProcessing(false);
    }
  };

  return (
    <form id="payment-form" onSubmit={handleSubmit}>
      <PaymentElement />
      
      <button 
        disabled={isProcessing || !stripe || !elements} 
        id="submit"
        className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>
      
      {message && (
        <div className={`mt-4 text-center ${message.includes('successful') ? 'text-green-600' : 'text-red-600'}`}>
          {message}
        </div>
      )}
    </form>
  );
};

export default StripeCheckoutForm; 