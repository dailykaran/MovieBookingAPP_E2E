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
  CircularProgress
} from '@mui/material';
import { styled } from '@mui/material/styles';

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
    setIsProcessing(true);
    try {
      // Sync booked seats to backend with showtime
      if (bookingDetails.movieId && bookingDetails.showtime) {
        await dispatch(updateMovieSeats({
          movieId: bookingDetails.movieId,
          bookedSeats: bookingDetails.selectedSeats,
          showtime: bookingDetails.showtime
        })).unwrap();
      }

      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      setActiveStep(2);
    } catch (error) {
      alert(`Failed to process booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsProcessing(false);
      return;
    }
    setIsProcessing(false);
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
                        ${bookingDetails.totalAmount.toFixed(2)}
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
                      pattern: '[0-9]*'
                    }}
                    error={paymentInfo.cardNumber.length > 0 && paymentInfo.cardNumber.replace(/\s/g, '').length !== 16}
                    helperText={
                      paymentInfo.cardNumber.length > 0 && paymentInfo.cardNumber.replace(/\s/g, '').length !== 16
                        ? "Please enter a valid 16-digit card number"
                        : "Enter your 16-digit card number"
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
                  position: 'relative'
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
                  `Pay $${bookingDetails.totalAmount.toFixed(2)}`
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
                    Amount Paid: ${bookingDetails.totalAmount.toFixed(2)}
                  </Typography>
                </Stack>
              </Paper>
              <Button
                variant="contained"
                color="primary"
                onClick={() => navigate('/')}
                sx={{ mt: 2 }}
              >
                Back to Home
              </Button>
            </Box>
          </Fade>
        )}
      </Paper>
    </Container>
  );
};

export default PaymentPage;