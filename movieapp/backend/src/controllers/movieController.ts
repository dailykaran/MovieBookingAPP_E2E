import { Request, Response } from 'express';
import { Movie } from '../models/Movie';
import fs from 'fs';
import path from 'path';

const dbPath = path.join(__dirname, '../data/movies.json');

const readMovies = (): { movies: Movie[] } => {
  const data = fs.readFileSync(dbPath, 'utf-8');
  return JSON.parse(data);
};

const writeMovies = (data: { movies: Movie[] }): void => {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
};

export const getAllMovies = (req: Request, res: Response) => {
  try {
    const data = readMovies();
    res.json(data.movies);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching movies' });
  }
};

export const getMovie = (req: Request, res: Response) => {
  try {
    const data = readMovies();
    const movie = data.movies.find(m => m.id === parseInt(req.params.id));
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }
    res.json(movie);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching movie' });
  }
};

export const createMovie = (req: Request, res: Response) => {
  try {
    const data = readMovies();
    const newMovie: Movie = {
      id: data.movies.length > 0 ? Math.max(...data.movies.map(m => m.id)) + 1 : 1,
      ...req.body
    };

    data.movies.push(newMovie);
    writeMovies(data);
    res.status(201).json(newMovie);
  } catch (error) {
    res.status(500).json({ message: 'Error creating movie' });
  }
};

export const updateMovie = (req: Request, res: Response) => {
  try {
    const data = readMovies();
    const movieId = parseInt(req.params.id);
    const movieIndex = data.movies.findIndex(m => m.id === movieId);

    if (movieIndex === -1) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    const updatedMovie = {
      ...data.movies[movieIndex],
      ...req.body,
      id: movieId // Ensure ID doesn't change
    };

    data.movies[movieIndex] = updatedMovie;
    writeMovies(data);
    res.json(updatedMovie);
  } catch (error) {
    res.status(500).json({ message: 'Error updating movie' });
  }
};

export const deleteMovie = (req: Request, res: Response) => {
  try {
    const data = readMovies();
    const movieId = parseInt(req.params.id);
    const movieIndex = data.movies.findIndex(m => m.id === movieId);

    if (movieIndex === -1) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    data.movies.splice(movieIndex, 1);
    writeMovies(data);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Error deleting movie' });
  }
};

export const updateMovieSeats = (req: Request, res: Response) => {
  try {
    const data = readMovies();
    const movieId = parseInt(req.params.id);
    const { seats, showtime } = req.body;
    
    const movieIndex = data.movies.findIndex(m => m.id === movieId);
    if (movieIndex === -1) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Validate that seats array is provided and is an array
    if (!Array.isArray(seats)) {
      return res.status(400).json({ message: 'Seats must be an array' });
    }

    if (!showtime) {
      return res.status(400).json({ message: 'Showtime is required' });
    }

    // Find or create showtimeSeats entry
    if (!data.movies[movieIndex].showtimeSeats) {
      data.movies[movieIndex].showtimeSeats = [];
    }

    let showtimeSeat = data.movies[movieIndex].showtimeSeats.find(
      (s: any) => s.showtime === showtime
    );

    if (!showtimeSeat) {
      // Create new showtime entry
      showtimeSeat = {
        showtime,
        availableSeats: Array.from({ length: 100 }, (_, i) => i + 1),
        bookedSeats: []
      };
      data.movies[movieIndex].showtimeSeats.push(showtimeSeat);
    }

    // Update available seats by removing booked seats
    const bookedSeats = new Set(seats);
    const updatedAvailableSeats = showtimeSeat.availableSeats.filter(
      (seat: number) => !bookedSeats.has(seat)
    );

    // Add newly booked seats to the bookedSeats array
    const newBookedSeats = [...new Set([...showtimeSeat.bookedSeats, ...seats])];

    showtimeSeat.availableSeats = updatedAvailableSeats;
    showtimeSeat.bookedSeats = newBookedSeats;
    
    writeMovies(data);
    res.json(data.movies[movieIndex]);
  } catch (error) {
    res.status(500).json({ message: 'Error updating movie seats' });
  }
};