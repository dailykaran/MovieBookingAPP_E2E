import { Router } from 'express';
import {
  getAllMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
  updateMovieSeats
} from '../controllers/movieController';

const router = Router();

// Get all movies
router.get('/movies', getAllMovies);

// Get a specific movie
router.get('/movies/:id', getMovie);

// Create a new movie
router.post('/movies', createMovie);

// Update a movie
router.put('/movies/:id', updateMovie);

// Delete a movie
router.delete('/movies/:id', deleteMovie);

// Update movie seats
router.patch('/movies/:id/seats', updateMovieSeats);

export default router;