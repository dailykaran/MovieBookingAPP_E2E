/**
 * SeatGrid Web Component with Shadow DOM
 * Encapsulates seat selection logic and styling
 * Prevents style leakage from parent React components
 */

interface SeatGridConfig {
  totalSeats: number;
  seatsPerRow: number;
  availableSeats: number[];
  bookedSeats: number[];
  selectedSeats: number[];
  showtime: string;
}

class SeatGridElement extends HTMLElement {
  private shadow: ShadowRoot;
  private config: SeatGridConfig;
  private onSeatSelect: ((seat: number) => void) | null = null;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.config = {
      totalSeats: 100,
      seatsPerRow: 10,
      availableSeats: [],
      bookedSeats: [],
      selectedSeats: [],
      showtime: ''
    };
  }

  // Lifecycle: element inserted into DOM
  connectedCallback() {
    this.loadConfig();
    this.renderSeatGrid();
    this.attachEventListeners();
  }

  // Load config from attributes
  private loadConfig() {
    this.config = {
      totalSeats: parseInt(this.getAttribute('total-seats') || '100'),
      seatsPerRow: parseInt(this.getAttribute('seats-per-row') || '10'),
      availableSeats: JSON.parse(this.getAttribute('available-seats') || '[]'),
      bookedSeats: JSON.parse(this.getAttribute('booked-seats') || '[]'),
      selectedSeats: JSON.parse(this.getAttribute('selected-seats') || '[]'),
      showtime: this.getAttribute('showtime') || ''
    };
  }

  // Render Shadow DOM structure
  private renderSeatGrid() {
    const styles = this.createStyles();
    const gridHTML = this.createGridHTML();

    this.shadow.innerHTML = `
      ${styles}
      <div class="seat-grid-container">
        <h3>Select your seats for ${this.config.showtime}</h3>
        <div class="legend">
          <div class="legend-item">
            <div class="seat available"></div>
            <span>Available</span>
          </div>
          <div class="legend-item">
            <div class="seat booked"></div>
            <span>Booked</span>
          </div>
          <div class="legend-item">
            <div class="seat selected"></div>
            <span>Selected</span>
          </div>
        </div>
        <div class="seat-grid">
          ${gridHTML}
        </div>
        <div class="seat-info">
          <p>Total Selected: <strong>${this.config.selectedSeats.length}</strong> seats</p>
          <p>Price: <strong>₹${this.config.selectedSeats.length * 250}</strong></p>
        </div>
      </div>
    `;
  }

  // Create encapsulated styles
  private createStyles(): string {
    return `
      <style>
        :host {
          --primary-color: #1976d2;
          --available-color: #4caf50;
          --booked-color: #f44336;
          --selected-color: #ff9800;
        }

        .seat-grid-container {
          padding: 20px;
          max-width: 600px;
          margin: 20px auto;
          background: #f5f5f5;
          border-radius: 8px;
          font-family: 'Roboto', sans-serif;
        }

        h3 {
          text-align: center;
          color: var(--primary-color);
          margin-bottom: 20px;
          font-size: 1.3em;
        }

        .legend {
          display: flex;
          justify-content: center;
          gap: 30px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.9em;
          color: #666;
        }

        .legend-item .seat {
          width: 30px;
          height: 30px;
        }

        .seat-grid {
          display: grid;
          grid-template-columns: repeat(10, 1fr);
          gap: 8px;
          margin-bottom: 20px;
          padding: 20px;
          background: white;
          border-radius: 6px;
        }

        .seat {
          width: 100%;
          aspect-ratio: 1/1;
          border: 2px solid #ddd;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75em;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          user-select: none;
        }

        .seat.available {
          background-color: var(--available-color);
          color: white;
          border-color: var(--available-color);
        }

        .seat.available:hover {
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
        }

        .seat.booked {
          background-color: var(--booked-color);
          color: white;
          border-color: var(--booked-color);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .seat.selected {
          background-color: var(--selected-color);
          color: white;
          border-color: var(--selected-color);
          box-shadow: 0 0 12px rgba(255, 152, 0, 0.5);
        }

        .seat-info {
          background: white;
          padding: 15px;
          border-radius: 6px;
          text-align: center;
          font-size: 0.95em;
          border-top: 3px solid var(--primary-color);
        }

        .seat-info p {
          margin: 8px 0;
          color: #333;
        }

        .seat-info strong {
          color: var(--primary-color);
          font-weight: 600;
        }

        /* Responsive */
        @media (max-width: 600px) {
          .seat-grid {
            gap: 6px;
            padding: 12px;
          }

          .seat {
            font-size: 0.65em;
          }

          .legend {
            gap: 15px;
          }

          .seat-grid-container {
            padding: 12px;
          }
        }
      </style>
    `;
  }

  // Create grid HTML
  private createGridHTML(): string {
    let html = '';
    for (let i = 1; i <= this.config.totalSeats; i++) {
      const isAvailable = this.config.availableSeats.includes(i);
      const isBooked = this.config.bookedSeats.includes(i);
      const isSelected = this.config.selectedSeats.includes(i);

      let seatClass = '';
      if (isBooked) seatClass = 'booked';
      else if (isSelected) seatClass = 'selected';
      else if (isAvailable) seatClass = 'available';

      const clickable = isAvailable || isSelected ? 'clickable' : '';

      html += `
        <div 
          class="seat ${seatClass} ${clickable}" 
          data-seat-id="${i}"
          role="button"
          aria-label="Seat ${i}"
          ${!isBooked ? 'tabindex="0"' : 'tabindex="-1"'}
        >
          ${i}
        </div>
      `;
    }
    return html;
  }

  // Attach event listeners
  private attachEventListeners() {
    const seats = this.shadow.querySelectorAll('.seat.clickable');
    seats.forEach(seat => {
      seat.addEventListener('click', (e) => this.handleSeatClick(e));
      seat.addEventListener('keypress', (e) => {
        if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') {
          this.handleSeatClick(e);
        }
      });
    });
  }

  // Handle seat click
  private handleSeatClick(e: Event) {
    const seat = e.currentTarget as HTMLElement;
    const seatId = parseInt(seat.getAttribute('data-seat-id') || '0');

    if (this.onSeatSelect) {
      this.onSeatSelect(seatId);
    }

    // Dispatch custom event
    this.dispatchEvent(new CustomEvent('seat-selected', {
      detail: { seatId, selectedSeats: this.config.selectedSeats },
      bubbles: true,
      composed: true
    }));
  }

  // Public methods: Update selected seats
  updateSelectedSeats(seats: number[]) {
    this.config.selectedSeats = seats;
    this.renderSeatGrid();
    this.attachEventListeners();
  }

  // Public methods: Set seat select handler
  setSeatSelectHandler(handler: (seat: number) => void) {
    this.onSeatSelect = handler;
  }

  // Lifecycle: attributes changed
  static get observedAttributes() {
    return ['selected-seats', 'available-seats', 'booked-seats'];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue !== newValue) {
      this.loadConfig();
      this.renderSeatGrid();
      this.attachEventListeners();
    }
  }
}

// Register custom element
if (!customElements.get('seat-grid')) {
  customElements.define('seat-grid', SeatGridElement);
}

export default SeatGridElement;
