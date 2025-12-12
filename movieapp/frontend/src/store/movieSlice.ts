import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import { Movie, MovieState } from '../types/movie';

const API_URL = 'http://localhost:5000/api';

export const fetchMovies = createAsyncThunk<Movie[]>(
  'movies/fetchMovies',
  async () => {
    const response = await axios.get(`${API_URL}/movies`);
    return response.data;
  }
);

export const fetchMovieById = createAsyncThunk<Movie, number>(
  'movies/fetchMovieById',
  async (id) => {
    const response = await axios.get(`${API_URL}/movies/${id}`);
    return response.data;
  }
);

export const updateMovieSeats = createAsyncThunk<Movie, { movieId: number; bookedSeats: number[]; showtime: string }>(
  'movies/updateMovieSeats',
  async ({ movieId, bookedSeats, showtime }) => {
    const response = await axios.patch(`${API_URL}/movies/${movieId}/seats`, {
      seats: bookedSeats,
      showtime
    });
    return response.data;
  }
);

const initialState: MovieState = {
  movies: [],
  selectedMovie: null,
  loading: false,
  error: null,
};

const movieSlice = createSlice({
  name: 'movies',
  initialState,
  reducers: {
    clearSelectedMovie: (state) => {
      state.selectedMovie = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMovies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMovies.fulfilled, (state, action: PayloadAction<Movie[]>) => {
        state.loading = false;
        state.movies = action.payload;
      })
      .addCase(fetchMovies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch movies';
      })
      .addCase(fetchMovieById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMovieById.fulfilled, (state, action: PayloadAction<Movie>) => {
        state.loading = false;
        state.selectedMovie = action.payload;
      })
      .addCase(fetchMovieById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch movie';
      })
      .addCase(updateMovieSeats.pending, (state) => {
        state.error = null;
      })
      .addCase(updateMovieSeats.fulfilled, (state, action: PayloadAction<Movie>) => {
        // Update both selectedMovie and movies list with new seat availability
        if (state.selectedMovie && state.selectedMovie.id === action.payload.id) {
          state.selectedMovie = action.payload;
        }
        const movieIndex = state.movies.findIndex(m => m.id === action.payload.id);
        if (movieIndex !== -1) {
          state.movies[movieIndex] = action.payload;
        }
      })
      .addCase(updateMovieSeats.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to update seats';
      });
  },
});

export const { clearSelectedMovie } = movieSlice.actions;
export default movieSlice.reducer;