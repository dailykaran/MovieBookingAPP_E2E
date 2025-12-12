import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Divider,
  Fade,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface UserDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  age: string;
}

interface LocationState {
  movieTitle: string;
  selectedSeats: number[];
  showtime: string;
  totalAmount: number;
  movieId: number;
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

const steps = ['Booking Details', 'User Information', 'Payment', 'Confirmation'];

const UserDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const bookingDetails = location.state as LocationState;

  const [userDetails, setUserDetails] = useState<UserDetails>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    age: ''
  });

  const [touched, setTouched] = useState<Record<keyof UserDetails, boolean>>({
    firstName: false,
    lastName: false,
    email: false,
    phone: false,
    age: false
  });

  const handleBlur = (field: keyof UserDetails) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'phone') {
      // Format phone number as (XXX) XXX-XXXX
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length >= 10) {
        formattedValue = `(${digitsOnly.slice(0, 3)}) ${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6, 10)}`;
      }
    }

    if (name === 'age') {
      // Only allow numbers and limit to reasonable age
      const num = parseInt(value);
      if (!isNaN(num) && num >= 0 && num <= 120) {
        formattedValue = num.toString();
      } else if (value === '') {
        formattedValue = '';
      } else {
        return;
      }
    }

    setUserDetails(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const validateField = (name: string, value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
    const nameRegex = /^[A-Za-z\s'-]+$/;

    switch (name) {
      case 'firstName':
        if (!value.trim()) return "First name is required";
        if (value.trim().length < 2) return "First name must be at least 2 characters";
        if (!nameRegex.test(value)) return "First name can only contain letters, spaces, hyphens, and apostrophes";
        return "";

      case 'lastName':
        if (!value.trim()) return "Last name is required";
        if (value.trim().length < 2) return "Last name must be at least 2 characters";
        if (!nameRegex.test(value)) return "Last name can only contain letters, spaces, hyphens, and apostrophes";
        return "";

      case 'email':
        if (!value) return "Email is required";
        if (!emailRegex.test(value)) return "Please enter a valid email address";
        return "";

      case 'phone':
        if (!value) return "Phone number is required";
        if (!phoneRegex.test(value)) return "Please enter a valid phone number in format (123) 456-7890";
        return "";

      case 'age':
        if (!value) return "Age is required";
        const age = parseInt(value);
        if (isNaN(age)) return "Age must be a number";
        if (age < 1) return "Age must be greater than 0";
        if (age > 120) return "Please enter a valid age";
        return "";

      default:
        return "";
    }
  };

  const getFieldError = (fieldName: keyof UserDetails) => {
    if (!touched[fieldName] || !validateField(fieldName, userDetails[fieldName])) {
      return "";
    }
    return validateField(fieldName, userDetails[fieldName]);
  };

  const isFormValid = () => {
    // Mark all fields as touched when attempting to submit
    if (Object.values(touched).some(t => !t)) {
      setTouched({
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        age: true
      });
      return false;
    }
    
    return Object.keys(userDetails).every(
      (field) => userDetails[field as keyof UserDetails].length > 0 && 
      !validateField(field, userDetails[field as keyof UserDetails])
    );
  };

  const handleContinue = () => {
    navigate('/payment', {
      state: {
        ...bookingDetails,
        userDetails
      }
    });
  };

  if (!bookingDetails) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Typography color="error">
          No booking details found. Please select your movie and seats first.
        </Typography>
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
      <Stepper activeStep={1} sx={{ mb: 6 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
        <Fade in timeout={800}>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
              Personal Details
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
                    <Typography variant="h6">Total Amount:</Typography>
                    <Typography variant="h6" fontWeight="bold">
                      ${bookingDetails.totalAmount.toFixed(2)}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>

              <Stack spacing={3}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <StyledTextField
                    label="First Name"
                    name="firstName"
                    value={userDetails.firstName}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    error={!!getFieldError('firstName')}
                    helperText={getFieldError('firstName')}
                    onBlur={() => handleBlur('firstName')}
                    inputProps={{
                      maxLength: 50
                    }}
                  />
                  <StyledTextField
                    label="Last Name"
                    name="lastName"
                    value={userDetails.lastName}
                    onChange={handleInputChange}
                    fullWidth
                    required
                    error={!!getFieldError('lastName')}
                    helperText={getFieldError('lastName')}
                    onBlur={() => handleBlur('lastName')}
                    inputProps={{
                      maxLength: 50
                    }}
                  />
                </Box>
                <StyledTextField
                  label="Email"
                  name="email"
                  type="email"
                  value={userDetails.email}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={!!getFieldError('email')}
                  helperText={getFieldError('email')}
                  onBlur={() => handleBlur('email')}
                  inputProps={{
                    maxLength: 100,
                    autoCapitalize: 'none'
                  }}
                />
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <StyledTextField
                    label="Phone Number"
                    name="phone"
                    value={userDetails.phone}
                    onChange={handleInputChange}
                    required
                    fullWidth
                    placeholder="(123) 456-7890"
                    inputProps={{ 
                      maxLength: 14,
                      inputMode: 'numeric'
                    }}
                    error={!!getFieldError('phone')}
                    helperText={getFieldError('phone')}
                    onBlur={() => handleBlur('phone')}
                  />
                  <StyledTextField
                    label="Age"
                    name="age"
                    value={userDetails.age}
                    onChange={handleInputChange}
                    required
                    sx={{ width: '120px' }}
                    error={!!getFieldError('age')}
                    helperText={getFieldError('age')}
                    onBlur={() => handleBlur('age')}
                    inputProps={{ 
                      maxLength: 3,
                      inputMode: 'numeric',
                      pattern: '[0-9]*'
                    }}
                  />
                </Box>
              </Stack>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={{ px: 4 }}
              >
                Back
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleContinue}
                disabled={!isFormValid()}
                sx={{ 
                  px: 6,
                  py: 1.5,
                  fontSize: '1.1rem'
                }}
              >
                Continue to Payment
              </Button>
            </Box>
          </Box>
        </Fade>
      </Paper>
    </Container>
  );
};

export default UserDetailsPage;