import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../store/store';
import { updateMovieSeats } from '../store/movieSlice';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Alert,
  Fade,
  Divider,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { Download as DownloadIcon, FileCopy as CopyIcon } from '@mui/icons-material';

interface PaymentInfo {
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cvv: string;
}

interface LocationState {
  movieTitle: string;
  selectedSeats: number[];
  showtime: string;
  totalAmount: number;
  movieId: number;
  userDetails: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    age: string;
  };
}

const StyledTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: theme.palette.primary.main,
    },
    '&.Mui-focused fieldset': {
      borderColor: theme.palette.primary.main,
    }
  }
}));

const steps = ['Booking Details', 'Payment Information', 'Confirmation'];

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch<AppDispatch>();
  const bookingDetails = location.state as LocationState;

  const [activeStep, setActiveStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    cardHolder: '',
    expiryDate: '',
    cvv: ''
  });

  // Feature 1.2: Success toast notification state
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingCode, setBookingCode] = useState('');

  // Feature 1.4: Loading progress states
  const [loadingStep, setLoadingStep] = useState(0);

  // Feature 1.5: Network error retry dialog state
  const [showNetworkError, setShowNetworkError] = useState(false);

  // Feature 2.4: Copy to clipboard feedback state
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Feature 1.3: Payment validation warning dialog state
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [showValidationDialog, setShowValidationDialog] = useState(false);

  // Feature 1.3: Payment confirmation dialog state
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');
  const [showPaymentErrorDialog, setShowPaymentErrorDialog] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Format card number with spaces
    if (name === 'cardNumber') {
      // Remove any non-digit characters
      const digitsOnly = value.replace(/\D/g, '');
      
      // Only keep the first 16 digits
      const truncated = digitsOnly.slice(0, 16);
      
      // Add spaces after every 4 digits
      const parts = truncated.match(/.{1,4}/g);
      formattedValue = parts ? parts.join(' ') : truncated;
    }

    // Format expiry date
    if (name === 'expiryDate') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length >= 2) {
        formattedValue = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}`;
      } else {
        formattedValue = digitsOnly;
      }
    }

    setPaymentInfo(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handlePayment = async () => {
    // Feature 1.3: Check for validation warnings first
    const warnings: string[] = [];
    
    if (paymentInfo.cardNumber.replace(/\s/g, '').length !== 16) {
      warnings.push('Card number must be exactly 16 digits');
    }
    if (paymentInfo.cardHolder.trim().length < 3) {
      warnings.push('Card holder name must be at least 3 characters');
    }
    if (!/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(paymentInfo.expiryDate)) {
      warnings.push('Expiry date must be in MM/YY format');
    }
    if (!/^[0-9]{3}$/.test(paymentInfo.cvv)) {
      warnings.push('CVV must be exactly 3 digits');
    }

    // If there are validation warnings, show dialog
    if (warnings.length > 0) {
      setValidationWarnings(warnings);
      setShowValidationDialog(true);
      return;
    }

    // Feature 1.3: Show confirmation dialog before payment
    setShowConfirmationDialog(true);
  };

  // Feature 1.3: Handle confirmed payment
  const handleConfirmedPayment = async () => {
    setShowConfirmationDialog(false);
    await processPayment();
  };

  // Feature 1.3: Process the actual payment
  const processPayment = async () => {
    setIsProcessing(true);
    setLoadingStep(0);
    setPaymentError('');

    try {
      // Feature 1.4: Update progress - Step 1: Validating
      setLoadingStep(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Feature 1.4: Update progress - Step 2: Processing Payment
      setLoadingStep(2);
      
      // Call local payment processing endpoint
      const cardDigits = paymentInfo.cardNumber.replace(/\s/g, '');
      const paymentResponse = await fetch('http://localhost:5000/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: bookingDetails.totalAmount,
          currency: 'inr',
          cardNumber: cardDigits,
          cardHolder: paymentInfo.cardHolder,
          expiryDate: paymentInfo.expiryDate,
          cvv: paymentInfo.cvv,
          movieId: bookingDetails.movieId,
          seats: bookingDetails.selectedSeats.join(','),
          showtime: bookingDetails.showtime,
          userEmail: bookingDetails.userDetails.email
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const paymentData = await paymentResponse.json();

      if (!paymentData.success) {
        throw new Error(paymentData.message || 'Payment was declined');
      }

      // Sync booked seats to backend with showtime
      if (bookingDetails.movieId && bookingDetails.showtime) {
        try {
          await dispatch(updateMovieSeats({
            movieId: bookingDetails.movieId,
            bookedSeats: bookingDetails.selectedSeats,
            showtime: bookingDetails.showtime
          })).unwrap();
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Failed to process booking';
          setPaymentError(errorMsg);
          setShowPaymentErrorDialog(true);
          setIsProcessing(false);
          return;
        }
      }

      // Feature 1.4: Update progress - Step 3: Confirming
      setLoadingStep(3);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Feature 1.2: Generate booking code
      const code = `BK${Date.now().toString().slice(-8)}`;
      setBookingCode(code);
      setBookingSuccess(true);
      setActiveStep(2);
      setIsProcessing(false);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Payment processing failed';
      setPaymentError(errorMsg);
      setShowPaymentErrorDialog(true);
      setIsProcessing(false);
    }
  };

  // Feature 1.5: Retry payment handler
  const handleRetryPayment = async () => {
    setShowNetworkError(false);
    await processPayment();
  };

  const isFormValid = () => {
    const cardNumberValid = paymentInfo.cardNumber.replace(/\s/g, '').length === 16;
    const cardHolderValid = paymentInfo.cardHolder.trim().length >= 3;
    const expiryDateValid = /^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(paymentInfo.expiryDate);
    const cvvValid = /^[0-9]{3}$/.test(paymentInfo.cvv);

    return cardNumberValid && cardHolderValid && expiryDateValid && cvvValid;
  };

  if (!bookingDetails) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Alert severity="error">No booking details found. Please select your movie and seats first.</Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{ mt: 2 }}
        >
          Return to Home
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 8 }}>
      <Stepper activeStep={activeStep} sx={{ mb: 6 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        {activeStep === 1 ? (
          <Fade in timeout={800}>
            <Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                Payment Details
              </Typography>

              <Box sx={{ mb: 4 }}>
                <Paper 
                  elevation={2} 
                  sx={{ 
                    p: 3, 
                    mb: 4, 
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText'
                  }}
                >
                  <Typography variant="h6" gutterBottom>Booking Summary</Typography>
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Movie:</Typography>
                      <Typography fontWeight="bold">{bookingDetails.movieTitle}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Seats:</Typography>
                      <Typography fontWeight="bold">{bookingDetails.selectedSeats.join(', ')}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Showtime:</Typography>
                      <Typography fontWeight="bold">{bookingDetails.showtime}</Typography>
                    </Box>
                    <Divider sx={{ my: 1, borderColor: 'primary.contrastText' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Name:</Typography>
                      <Typography fontWeight="bold">{`${bookingDetails.userDetails.firstName} ${bookingDetails.userDetails.lastName}`}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Email:</Typography>
                      <Typography fontWeight="bold">{bookingDetails.userDetails.email}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography>Phone:</Typography>
                      <Typography fontWeight="bold">{bookingDetails.userDetails.phone}</Typography>
                    </Box>
                    <Divider sx={{ my: 1, borderColor: 'primary.contrastText' }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">Total Amount:</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        ₹{bookingDetails.totalAmount.toFixed(2)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Stack spacing={3}>
                  <StyledTextField
                    label="Card Number"
                    name="cardNumber"
                    value={paymentInfo.cardNumber}
                    onChange={handleInputChange}
                    fullWidth
                    placeholder="1234 5678 9012 3456"
                    inputProps={{ 
                      maxLength: 19,
                      inputMode: 'numeric',
                      pattern: '[0-9 ]*'
                    }}
                    error={paymentInfo.cardNumber.length > 0 && paymentInfo.cardNumber.replace(/\s/g, '').length !== 16}
                    helperText={
                      paymentInfo.cardNumber.length > 0 && paymentInfo.cardNumber.replace(/\s/g, '').length !== 16
                        ? `Please enter exactly 16 digits (you entered ${paymentInfo.cardNumber.replace(/\s/g, '').length} digits)`
                        : "Enter 16-digit card number (e.g., 4111 1111 1111 1111)"
                    }
                  />
                  <StyledTextField
                    label="Card Holder Name"
                    name="cardHolder"
                    value={paymentInfo.cardHolder}
                    onChange={handleInputChange}
                    fullWidth
                    placeholder="JOHN DOE"
                    error={paymentInfo.cardHolder.length > 0 && paymentInfo.cardHolder.trim().length < 3}
                    helperText={
                      paymentInfo.cardHolder.length > 0 && paymentInfo.cardHolder.trim().length < 3
                        ? "Card holder name must be at least 3 characters"
                        : "Enter the name as it appears on your card"
                    }
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <StyledTextField
                      label="Expiry Date"
                      name="expiryDate"
                      value={paymentInfo.expiryDate}
                      onChange={handleInputChange}
                      placeholder="MM/YY"
                      inputProps={{ maxLength: 5 }}
                      error={paymentInfo.expiryDate.length > 0 && !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(paymentInfo.expiryDate)}
                      helperText={
                        paymentInfo.expiryDate.length > 0 && !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(paymentInfo.expiryDate)
                          ? "Use MM/YY format"
                          : "MM/YY"
                      }
                    />
                    <StyledTextField
                      label="CVV"
                      name="cvv"
                      value={paymentInfo.cvv}
                      onChange={handleInputChange}
                      type="password"
                      inputProps={{ maxLength: 3 }}
                      error={paymentInfo.cvv.length > 0 && !/^[0-9]{3}$/.test(paymentInfo.cvv)}
                      helperText={
                        paymentInfo.cvv.length > 0 && !/^[0-9]{3}$/.test(paymentInfo.cvv)
                          ? "Enter 3-digit CVV"
                          : "3-digit code"
                      }
                    />
                  </Box>
                </Stack>
              </Box>

                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={handlePayment}
                  disabled={!isFormValid() || isProcessing}
                  sx={{ 
                    py: 2,
                    fontSize: '1.1rem',
                    position: 'relative',
                    mt: 3
                  }}
                >
                  {isProcessing ? (
                    <>
                      <CircularProgress
                        size={24}
                        sx={{
                          position: 'absolute',
                          left: '50%',
                          marginLeft: '-12px'
                        }}
                      />
                      Processing...
                    </>
                  ) : (
                    `Pay ₹${bookingDetails.totalAmount.toFixed(2)}`
                  )}
                </Button>
            </Box>
          </Fade>
        ) : (
          <Fade in timeout={800}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" gutterBottom sx={{ color: 'success.main', fontWeight: 'bold' }}>
                Payment Successful!
              </Typography>
              <Typography variant="h6" sx={{ mb: 4 }}>
                Your booking has been confirmed.
              </Typography>
              <Paper 
                elevation={2} 
                sx={{ 
                  p: 3, 
                  mb: 4, 
                  maxWidth: 400, 
                  mx: 'auto',
                  backgroundColor: 'success.light'
                }}
              >
                <Stack spacing={2}>
                  <Typography>Movie: {bookingDetails.movieTitle}</Typography>
                  <Typography>Seats: {bookingDetails.selectedSeats.join(', ')}</Typography>
                  <Typography>Showtime: {bookingDetails.showtime}</Typography>
                  <Typography>Name: {`${bookingDetails.userDetails.firstName} ${bookingDetails.userDetails.lastName}`}</Typography>
                  <Typography>Email: {bookingDetails.userDetails.email}</Typography>
                  <Typography>Phone: {bookingDetails.userDetails.phone}</Typography>
                  <Typography variant="h6">
                    Amount Paid: ₹{bookingDetails.totalAmount.toFixed(2)}
                  </Typography>

                  {/* Feature 2.4: Booking code display and copy */}
                  <Box sx={{ 
                    backgroundColor: 'primary.main', 
                    color: 'white', 
                    p: 2, 
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Box>
                      <Typography variant="caption">Booking Code</Typography>
                      <Typography variant="h6" fontWeight="bold">{bookingCode}</Typography>
                    </Box>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CopyIcon />}
                      onClick={() => {
                        navigator.clipboard.writeText(bookingCode);
                        setCopyFeedback(true);
                      }}
                      sx={{ backgroundColor: 'rgba(255,255,255,0.2)', '&:hover': { backgroundColor: 'rgba(255,255,255,0.3)' } }}
                    >
                      Copy
                    </Button>
                  </Box>
                </Stack>
              </Paper>

              {/* Feature 2.3: Receipt Download Button */}
              <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} justifyContent="center" sx={{ mb: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => {
                    const receiptText = `
SHOWGLOW CINEMA - BOOKING RECEIPT
===================================

Booking Code: ${bookingCode}
Date: ${new Date().toLocaleDateString()}

BOOKING DETAILS
===============
Movie: ${bookingDetails.movieTitle}
Seats: ${bookingDetails.selectedSeats.join(', ')}
Showtime: ${bookingDetails.showtime}

CUSTOMER DETAILS
================
Name: ${bookingDetails.userDetails.firstName} ${bookingDetails.userDetails.lastName}
Email: ${bookingDetails.userDetails.email}
Phone: ${bookingDetails.userDetails.phone}
Age: ${bookingDetails.userDetails.age}

PAYMENT SUMMARY
===============
Movie Price (per seat): ₹${bookingDetails.totalAmount / bookingDetails.selectedSeats.length}
Number of Seats: ${bookingDetails.selectedSeats.length}
Total Amount: ₹${bookingDetails.totalAmount.toFixed(2)}

===================================
Thank you for your booking!
===================================`;

                    const element = document.createElement('a');
                    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(receiptText));
                    element.setAttribute('download', `ShowGlow_Receipt_${bookingCode}.txt`);
                    element.style.display = 'none';
                    document.body.appendChild(element);
                    element.click();
                    document.body.removeChild(element);
                  }}
                >
                  Download Receipt
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/')}
                >
                  Back to Home
                </Button>
              </Stack>
            </Box>
          </Fade>
        )}
      </Paper>

      {/* Feature 1.3: Payment Validation Warning Dialog */}
      <Dialog open={showValidationDialog} onClose={() => setShowValidationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'warning.main' }}>
          Payment Validation Warning
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Please fix the following payment details:
          </Alert>
          <Stack spacing={1}>
            {validationWarnings.map((warning, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <Typography sx={{ color: 'warning.main', fontWeight: 'bold' }}>•</Typography>
                <Typography variant="body2">{warning}</Typography>
              </Box>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowValidationDialog(false)} 
            variant="contained"
            color="primary"
          >
            Understood, Let me Fix
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature 1.3: Payment Confirmation Dialog */}
      <Dialog open={showConfirmationDialog} onClose={() => setShowConfirmationDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          Confirm Payment
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            You are about to process a payment. Please confirm the details below:
          </Alert>
          <Stack spacing={2}>
            <Box sx={{ backgroundColor: '#f5f5f5', p: 2, borderRadius: 1 }}>
              <Typography variant="body2"><strong>Card Number:</strong> ****{paymentInfo.cardNumber.slice(-4)}</Typography>
              <Typography variant="body2"><strong>Card Holder:</strong> {paymentInfo.cardHolder}</Typography>
              <Typography variant="body2"><strong>Amount:</strong> ${bookingDetails?.totalAmount.toFixed(2) || '0.00'}</Typography>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              By clicking 'Confirm Payment', you authorize this transaction.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowConfirmationDialog(false)} 
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmedPayment} 
            variant="contained"
            color="success"
            autoFocus
          >
            Confirm Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature 1.3: Payment Error Dialog */}
      <Dialog open={showPaymentErrorDialog} onClose={() => setShowPaymentErrorDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'error.main' }}>
          Payment Error
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Payment processing failed. Please try again.
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Error Details: {paymentError || 'Unknown error occurred'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Your card has not been charged. Please review the error and try again with valid payment information.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowPaymentErrorDialog(false)} 
            variant="contained"
            color="error"
            autoFocus
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature 1.4: Loading Progress Dialog with Stepper */}
      <Dialog open={isProcessing} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Processing Your Payment</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 3 }}>
            <Stepper activeStep={loadingStep} orientation="vertical">
              <Step completed={loadingStep > 1}>
                <StepLabel>Validating Payment Information</StepLabel>
              </Step>
              <Step completed={loadingStep > 2}>
                <StepLabel>Processing Booking</StepLabel>
              </Step>
              <Step completed={loadingStep > 3}>
                <StepLabel>Confirming Reservation</StepLabel>
              </Step>
            </Stepper>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <CircularProgress />
            </Box>
            <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', mt: 2, color: 'text.secondary' }}>
              Please do not close this window...
            </Typography>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Feature 1.5: Network Error Retry Dialog */}
      <Dialog open={showNetworkError} onClose={() => setShowNetworkError(false)}>
        <DialogTitle sx={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'error.main' }}>
          Payment Failed
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            We couldn't process your payment. Please check your connection and try again.
          </Alert>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Error Details: Network connection error or server unavailable.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setShowNetworkError(false)} 
            variant="outlined"
            color="primary"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleRetryPayment} 
            variant="contained"
            color="error"
            autoFocus
          >
            Retry Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feature 1.2: Success Toast Notification */}
      <Snackbar
        open={bookingSuccess}
        autoHideDuration={4000}
        onClose={() => setBookingSuccess(false)}
        message="Booking confirmed successfully!"
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />

      {/* Feature 2.4: Copy Feedback Toast */}
      <Snackbar
        open={copyFeedback}
        autoHideDuration={2000}
        onClose={() => setCopyFeedback(false)}
        message="Booking code copied to clipboard!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Container>
  );
};

export default PaymentPage;