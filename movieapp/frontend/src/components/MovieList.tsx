import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { Movie } from '../types/movie';
import { fetchMovies } from '../store/movieSlice';
import { RootState, AppDispatch } from '../store/store';
import { 
  Container,
  Card, 
  CardContent, 
  CardMedia, 
  Typography, 
  CardActions, 
  Button, 
  Box,
  TextField
} from '@mui/material';
import { styled } from '@mui/material/styles';

const FlexGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(1, 1fr)',
  gap: theme.spacing(3),
  [theme.breakpoints.up('sm')]: {
    gridTemplateColumns: 'repeat(2, 1fr)',
  },
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(4, 1fr)',
  },
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: 'repeat(5, 1fr)',
  },
}));

const MovieList: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { movies, loading, error } = useSelector((state: RootState) => state.movies);
  const [searchTerm, setSearchTerm] = React.useState('');

  useEffect(() => {
    dispatch(fetchMovies());
  }, [dispatch]);

  const filteredMovies = movies.filter((movie: Movie) =>
    movie.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4, lg: 6 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 'bold' }}>
          Now Showing
        </Typography>
        <Box sx={{ width: '300px' }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search movies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{
              backgroundColor: 'white',
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
        </Box>
      </Box>
      <FlexGrid sx={{ width: '100%', margin: 0 }}>
        {filteredMovies.map((movie: Movie) => (
          <Box key={movie.id} sx={{ display: 'flex' }}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardMedia
                component="img"
                height="280"
                image={`https://picsum.photos/seed/${movie.id}/400/280`}
                alt={movie.title}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h5" component="h2">
                  {movie.title}
                </Typography>
                <Typography>
                  {movie.description.substring(0, 100)}...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  Duration: {movie.duration} minutes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Price: ${movie.price}
                </Typography>
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  component={Link} 
                  to={`/movie/${movie.id}`}
                  variant="contained"
                  color="primary"
                  fullWidth
                >
                  Book Now
                </Button>
              </CardActions>
            </Card>
          </Box>
        ))}
      </FlexGrid>
    </Container>
  );
};

export default MovieList;