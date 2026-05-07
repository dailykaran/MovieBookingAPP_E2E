export interface ShowtimeSeats {
  showtime: string;
  availableSeats: number[];
  bookedSeats: number[];
}

export interface Movie {
  id: number;
  title: string;
  description: string;
  duration: number;
  price: number;
  trailerUrl: string;
  showtimes: string[];
  showtimeSeats: ShowtimeSeats[];
}

export interface MovieState {
  movies: Movie[];
  selectedMovie: Movie | null;
  loading: boolean;
  error: string | null;
}