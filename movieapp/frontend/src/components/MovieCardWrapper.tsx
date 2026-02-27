/**
 * React Wrapper for MovieCard Web Component
 * Bridges React props to Web Component attributes
 */

import React, { useEffect, useRef } from 'react';

interface MovieCardWrapperProps {
  id: number;
  title: string;
  releaseDate: string;
  rating?: number;
  reviews?: number;
  poster?: string;
  trailerUrl?: string;
  showtimes: string[];
  onBookClick: (movieId: number) => void;
  onTrailerClick?: (trailerUrl: string) => void;
}

const MovieCardWrapper: React.FC<MovieCardWrapperProps> = ({
  id,
  title,
  releaseDate,
  rating = 0,
  reviews = 0,
  poster,
  trailerUrl,
  showtimes,
  onBookClick,
  onTrailerClick
}) => {
  const movieCardRef = useRef<any>(null);

  useEffect(() => {
    const element = movieCardRef.current;
    if (element) {
      // Set attributes
      element.setAttribute('movie-id', id.toString());
      element.setAttribute('title', title);
      element.setAttribute('release-date', releaseDate);
      element.setAttribute('rating', rating.toString());
      element.setAttribute('reviews', reviews.toString());
      if (poster) element.setAttribute('poster', poster);
      if (trailerUrl) element.setAttribute('trailer-url', trailerUrl);
      element.setAttribute('showtimes', JSON.stringify(showtimes));

      // Listen for custom events
      const handleBookClick = (event: any) => {
        onBookClick(event.detail.movieId);
      };

      const handleTrailerClick = (event: any) => {
        if (onTrailerClick) {
          onTrailerClick(event.detail.trailerUrl);
        }
      };

      element.addEventListener('book-clicked', handleBookClick);
      element.addEventListener('trailer-clicked', handleTrailerClick);

      return () => {
        element.removeEventListener('book-clicked', handleBookClick);
        element.removeEventListener('trailer-clicked', handleTrailerClick);
      };
    }
  }, [id, title, releaseDate, rating, reviews, poster, trailerUrl, showtimes, onBookClick, onTrailerClick]);

  // Require Web Component to be registered
  useEffect(() => {
    import('./MovieCardWebComponent').catch(console.error);
  }, []);

  return React.createElement('movie-card', { ref: movieCardRef });
};

export default MovieCardWrapper;
