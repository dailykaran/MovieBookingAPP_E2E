import React from 'react';
import { Box, Paper, Typography, styled } from '@mui/material';
import MovieList from './MovieList';

const IframeContainer = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(4),
  background: 'linear-gradient(135deg, #1976d2 0%, #dc004e 100%)',
  borderRadius: '12px',
  color: 'white',
  boxShadow: '0 8px 16px rgba(0, 0, 0, 0.3)',
  '& h2': {
    marginBottom: theme.spacing(2),
  },
}));

const IframeWrapper = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(2),
  width: '100%',
}));

const IframeBox = styled('iframe')(({ theme }) => ({
  width: '100%',
  height: '600px',
  border: 'none',
  borderRadius: '8px',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
}));

const InfoBox = styled(Box)(({ theme }) => ({
  background: 'rgba(255, 255, 255, 0.1)',
  padding: theme.spacing(2),
  borderRadius: '8px',
  backdropFilter: 'blur(10px)',
  '& p': {
    margin: theme.spacing(1, 0),
    fontSize: '0.95rem',
    lineHeight: 1.6,
  },
  '& strong': {
    fontWeight: 600,
  },
}));

const MovieListWithIframe: React.FC = () => {
  return (
    <Box sx={{ width: '100%' }}>
      {/* Iframe Section */}
      <IframeContainer>
        <Typography variant="h4" sx={{ marginBottom: 2, fontWeight: 'bold' }}>
          🎬 Upcoming Movies List
        </Typography>
        
        <IframeWrapper>
          <InfoBox>
            <Typography variant="body2">
              Watch detailed movie information in an embedded iframe viewer. 
              The iframe demonstrates content isolation and modern web component integration.
            </Typography>
          </InfoBox>

          {/* Movie Details Iframe */}
          <IframeBox
            id="movie-showcase-iframe"
            name="movie-showcase-iframe"
            data-testid="movie-showcase-iframe"
            title="Upcoming Movies List"
            src="/movie-showcase.html"
            loading="lazy"
          />

          <InfoBox>
            <Typography variant="body2">
              <strong>Iframe Source:</strong> /movie-showcase.html (Local Static File)
            </Typography>
            <Typography variant="body2">
              <strong>Features:</strong> Animated movie poster, gradient design, film strip effect
            </Typography>
          </InfoBox>
        </IframeWrapper>
      </IframeContainer>

      {/* Movie Grid Section */}
      <Box>
        <MovieList />
      </Box>
    </Box>
  );
};

export default MovieListWithIframe;
