/**
 * React Wrapper for SeatGrid Web Component
 * Bridges React props to Web Component attributes
 */

import React, { useEffect, useRef } from 'react';

interface SeatGridWrapperProps {
  totalSeats?: number;
  seatsPerRow?: number;
  availableSeats: number[];
  bookedSeats: number[];
  selectedSeats: number[];
  showtime: string;
  moviePrice?: number;
  onSeatSelect: (seatId: number) => void;
}

const SeatGridWrapper: React.FC<SeatGridWrapperProps> = ({
  totalSeats = 100,
  seatsPerRow = 10,
  availableSeats,
  bookedSeats,
  selectedSeats,
  showtime,
  moviePrice = 0,
  onSeatSelect
}) => {
  const seatGridRef = useRef<any>(null);

  useEffect(() => {
    const element = seatGridRef.current;
    if (element) {
      // Set attributes
      element.setAttribute('total-seats', totalSeats.toString());
      element.setAttribute('seats-per-row', seatsPerRow.toString());
      element.setAttribute('available-seats', JSON.stringify(availableSeats));
      element.setAttribute('booked-seats', JSON.stringify(bookedSeats));
      element.setAttribute('selected-seats', JSON.stringify(selectedSeats));
      element.setAttribute('showtime', showtime);
      element.setAttribute('movie-price', moviePrice.toString());

      // Listen for custom events from Web Component
      const handleSeatSelected = (event: any) => {
        onSeatSelect(event.detail.seatId);
      };

      element.addEventListener('seat-selected', handleSeatSelected);

      return () => {
        element.removeEventListener('seat-selected', handleSeatSelected);
      };
    }
  }, [totalSeats, seatsPerRow, availableSeats, bookedSeats, selectedSeats, showtime, moviePrice, onSeatSelect]);

  // Require Web Component to be registered
  useEffect(() => {
    // Import the Web Component to ensure it's registered
    import('./SeatGridWebComponent').catch(console.error);
  }, []);

  return React.createElement('seat-grid', { ref: seatGridRef });
};

export default SeatGridWrapper;
