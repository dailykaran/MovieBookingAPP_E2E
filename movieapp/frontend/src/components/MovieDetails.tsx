import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMovieById } from '../store/movieSlice';
import { RootState, AppDispatch } from '../store/store';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Fade,
  Chip,
  Divider,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const StyledPaper = styled(Paper)(({ theme }) => ({
  animation: `${fadeInUp} 0.6s ease-out`,
  transition: 'transform 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-5px)'
  }
}));

const PageHeading = styled(Typography)(({ theme }) => ({
  position: 'relative',
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: '-8px',
    left: 0,
    width: '60px',
    height: '4px',
    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
    borderRadius: theme.shape.borderRadius
  }
}));

const MovieDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { selectedMovie, loading, error } = useSelector((state: RootState) => state.movies);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  useEffect(() => {
    if (id) {
      dispatch(fetchMovieById(parseInt(id)));
    }
  }, [dispatch, id]);

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ mt: 6, px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
        <PageHeading variant="h4" gutterBottom>
          Loading Movie Details...
        </PageHeading>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2,
          color: 'primary.main',
          animation: 'pulse 1.5s ease-in-out infinite'
        }}>
          <Typography variant="h6">🎬</Typography>
          <Typography variant="h6">Loading amazing content for you...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ mt: 6, px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
        <PageHeading variant="h4" gutterBottom sx={{ color: 'error.main' }}>
          Oops! Something went wrong
        </PageHeading>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mt: 4, 
            borderRadius: 2,
            backgroundColor: 'error.light',
            color: 'error.contrastText'
          }}
        >
          <Typography variant="h6">{error}</Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(-1)}
            sx={{ mt: 2 }}
          >
            Go Back
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!selectedMovie) {
    return (
      <Container maxWidth="xl" sx={{ mt: 6, px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
        <PageHeading variant="h4" gutterBottom>
          Movie Not Found
        </PageHeading>
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mt: 4, 
            borderRadius: 2,
            backgroundColor: 'warning.light'
          }}
        >
          <Typography variant="h6">
            Sorry, we couldn't find the movie you're looking for.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate(-1)}
            sx={{ mt: 2 }}
          >
            Back to Movies
          </Button>
        </Paper>
      </Container>
    );
  }

  const handleTimeChange = (event: React.MouseEvent<HTMLElement>, newTime: string) => {
    setSelectedTime(newTime);
    setSelectedSeats([]);
  };

  const handleSeatClick = (seatNumber: number) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((seat) => seat !== seatNumber);
      }
      return [...prev, seatNumber];
    });
  };

  const handleBooking = async () => {
    if (!selectedMovie || !selectedTime) return;

    // Check if selected seats are still available (prevent double-booking)
    const freshMovie = await dispatch(fetchMovieById(selectedMovie.id)).unwrap();
    const showtimeSeat = freshMovie.showtimeSeats?.find(s => s.showtime === selectedTime);
    
    const unavailableSeats = selectedSeats.filter(
      seat => !showtimeSeat?.availableSeats.includes(seat)
    );

    if (unavailableSeats.length > 0) {
      // Show error if seats are no longer available
      alert(
        `Sorry! Seats ${unavailableSeats.join(', ')} are no longer available. ` +
        `Please select different seats.`
      );
      // Refresh available seats
      setSelectedSeats(prev => prev.filter(seat => !unavailableSeats.includes(seat)));
      return;
    }

    // Proceed with booking if all seats are still available
    navigate('/user-details', {
      state: {
        movieTitle: selectedMovie.title,
        selectedSeats,
        showtime: selectedTime,
        totalAmount: selectedMovie.price * selectedSeats.length,
        movieId: selectedMovie.id
      }
    });
  };

  return (
    <Container maxWidth="xl" sx={{ mt: 6, px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
      <Button 
        onClick={() => navigate(-1)} 
        variant="outlined" 
        sx={{ 
          mb: 4,
          px: 4,
          py: 1,
          borderRadius: 2,
          '&:hover': {
            backgroundColor: 'primary.light',
            color: 'white'
          }
        }}
        startIcon={<Typography>←</Typography>}
      >
        Back to Movies
      </Button>
      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        spacing={6} 
        alignItems="flex-start"
      >
        <Box flex={{ xs: '1', md: '0 0 60%' }}>
          <StyledPaper 
            elevation={6}
            sx={{ 
              p: 3,
              borderRadius: 4,
              overflow: 'hidden',
              backgroundColor: 'background.paper',
            }}
          >
            <Box sx={{ position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
              <img
                src={`https://picsum.photos/seed/${selectedMovie.id}/1200/800`}
                alt={selectedMovie.title}
                style={{ 
                  width: '100%', 
                  height: 'auto',
                  display: 'block',
                  transition: 'transform 0.5s ease'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
                  p: 3,
                  color: 'white'
                }}
              >
                <Chip 
                  label="NOW SHOWING" 
                  color="primary" 
                  sx={{ mb: 2 }}
                />
                <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {selectedMovie.title}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Chip 
                    label={`${selectedMovie.duration} min`}
                    variant="outlined"
                    sx={{ color: 'white', borderColor: 'white' }}
                  />
                  <Chip 
                    label={`$${selectedMovie.price}`}
                    variant="outlined"
                    sx={{ color: 'white', borderColor: 'white' }}
                  />
                </Box>
              </Box>
            </Box>
          </StyledPaper>
        </Box>
        <Box flex={{ xs: '1', md: '0 0 40%' }}>
          <Fade in timeout={800}>
            <Box>
              <Typography 
                variant="h5" 
                gutterBottom 
                sx={{ 
                  fontWeight: 'bold',
                  color: 'text.primary',
                  mb: 3
                }}
              >
                Movie Synopsis
              </Typography>
              <Paper
                elevation={3}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '4px',
                    height: '100%',
                    background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)'
                  }
                }}
              >
                <Typography 
                  sx={{ 
                    fontSize: '1.1rem',
                    lineHeight: 1.8,
                    color: 'text.secondary',
                    pl: 2
                  }}
                >
                  {selectedMovie.description}
                </Typography>
              </Paper>

              <Box sx={{ mt: 4, mb: 2 }}>
                <Divider>
                  <Chip 
                    label="Movie Information" 
                    color="primary" 
                    sx={{ px: 2 }}
                  />
                </Divider>
              </Box>

              <Stack
                direction="row"
                spacing={3}
                sx={{
                  mb: 4,
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    flex: '1 1 auto',
                    minWidth: '150px',
                    textAlign: 'center',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}
                >
                  <Typography variant="overline" display="block" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    {selectedMovie.duration} min
                  </Typography>
                </Paper>

                <Paper
                  elevation={2}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    flex: '1 1 auto',
                    minWidth: '150px',
                    textAlign: 'center',
                    transition: 'transform 0.2s',
                    '&:hover': { transform: 'translateY(-5px)' }
                  }}
                >
                  <Typography variant="overline" display="block" color="text.secondary">
                    Ticket Price
                  </Typography>
                  <Typography variant="h6" color="primary.main">
                    ${selectedMovie.price}
                  </Typography>
                </Paper>
              </Stack>
            </Box>
          </Fade>

          <Box sx={{ mt: 6 }}>
            <Typography 
              variant="h5" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                mb: 3
              }}
            >
              Select Showtime
            </Typography>
            <ToggleButtonGroup
              value={selectedTime}
              exclusive
              onChange={handleTimeChange}
              aria-label="showtimes"
              sx={{
                gap: 2,
                flexWrap: 'wrap',
                '& .MuiToggleButton-root': {
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  border: '2px solid',
                  borderColor: 'primary.light',
                  '&.Mui-selected': {
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    }
                  },
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'white'
                  }
                }
              }}
            >
              {selectedMovie.showtimes.map((time: string) => (
                <ToggleButton key={time} value={time}>
                  {time}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {selectedTime && (
            <Box sx={{ mt: 6 }}>
              <Typography 
                variant="h5" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  mb: 3
                }}
              >
                Select Seats - {selectedTime}
              </Typography>
              
              {/* Seat Legend */}
              <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', fontSize: '0.9rem' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 24, bgcolor: 'success.main', borderRadius: 1 }} />
                  <Typography variant="caption">Available</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 24, bgcolor: 'primary.main', borderRadius: 1 }} />
                  <Typography variant="caption">Selected</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 24, height: 24, bgcolor: '#d32f2f', borderRadius: 1 }} />
                  <Typography variant="caption">Booked</Typography>
                </Box>
              </Box>

              <Paper 
                elevation={3}
                sx={{ 
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: 'background.paper',
                  position: 'relative',
                  overflow: 'auto',
                  maxHeight: '500px',
                  '&::before': {
                    content: '"Screen →"',
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    padding: '4px 20px',
                    backgroundColor: 'primary.main',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    boxShadow: 2,
                    zIndex: 1
                  }
                }}
              >
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(10, 1fr)',
                  gap: 0.8,
                  mt: 2
                }}>
                  {Array.from({ length: 100 }, (_, i) => i + 1).map((seatNumber: number) => {
                    const showtimeSeat = selectedMovie.showtimeSeats?.find(s => s.showtime === selectedTime);
                    const isBooked = showtimeSeat?.bookedSeats?.includes(seatNumber) || false;
                    const isAvailable = showtimeSeat?.availableSeats?.includes(seatNumber) || false;
                    const isSelected = selectedSeats.includes(seatNumber);

                    return (
                      <Button
                        key={seatNumber}
                        disabled={isBooked}
                        variant={isSelected ? 'contained' : 'outlined'}
                        onClick={() => !isBooked && handleSeatClick(seatNumber)}
                        sx={{
                          minWidth: '50px',
                          minHeight: '40px',
                          padding: '4px',
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          transition: 'all 0.2s ease-in-out',
                          animation: isSelected ? 'pulse 0.5s' : 'none',
                          backgroundColor: isBooked ? '#d32f2f' : isSelected ? '#1976d2' : isAvailable ? '#66bb6a' : '#ccc',
                          borderColor: isBooked ? '#d32f2f' : isSelected ? '#1976d2' : '#66bb6a',
                          color: 'white',
                          '&:hover': isBooked ? { cursor: 'not-allowed' } : {
                            backgroundColor: isSelected ? '#1565c0' : '#4caf50',
                            transform: 'scale(1.05)'
                          },
                          '&.Mui-disabled': {
                            opacity: 1,
                            cursor: 'not-allowed',
                            backgroundColor: '#d32f2f',
                            color: 'white'
                          }
                        }}
                      >
                        {seatNumber}
                      </Button>
                    );
                  })}
                </Box>
                <Box sx={{ mt: 2, textAlign: 'center', fontSize: '0.85rem', color: 'text.secondary' }}>
                  Available: {selectedMovie.showtimeSeats?.find(s => s.showtime === selectedTime)?.availableSeats.length || 0} | Booked: {selectedMovie.showtimeSeats?.find(s => s.showtime === selectedTime)?.bookedSeats.length || 0} | Total: 100
                </Box>
              </Paper>
            </Box>
          )}

          {selectedTime && selectedSeats.length > 0 && (
            <Paper
              elevation={3}
              sx={{
                mt: 4,
                p: 3,
                borderRadius: 2,
                backgroundColor: 'success.light'
              }}
            >
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Selected Seats:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {selectedSeats.join(', ')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1">Price per Ticket:</Typography>
                  <Typography variant="subtitle1" fontWeight="bold">
                    ${selectedMovie.price.toFixed(2)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6">Total Amount:</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary.main">
                    ${(selectedMovie.price * selectedSeats.length).toFixed(2)}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  sx={{ 
                    mt: 2,
                    py: 2,
                    borderRadius: 2,
                    fontSize: '1.2rem',
                    fontWeight: 'bold',
                    backgroundColor: 'success.main',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: 4,
                      backgroundColor: 'success.dark'
                    }
                  }}
                  onClick={handleBooking}
                >
                  Confirm Booking
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      </Stack>
    </Container>
  );
};

export default MovieDetails;