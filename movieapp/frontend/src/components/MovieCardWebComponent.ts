/**
 * MovieCard Web Component with Shadow DOM
 * Encapsulated card for displaying movie information
 * Prevents style leakage from parent components
 */

interface MovieCardData {
  id: number;
  title: string;
  releaseDate: string;
  price?: number;
  trailerUrl?: string;
  rating?: number;
  reviews?: number;
  poster?: string;
  showtimes: string[];
}

class MovieCardElement extends HTMLElement {
  private shadow: ShadowRoot;
  private movieData: MovieCardData;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.movieData = {
      id: 0,
      title: '',
      releaseDate: '',
      price: 0,
      rating: 0,
      reviews: 0,
      poster: '',
      trailerUrl: '',
      showtimes: []
    };
  }

  connectedCallback() {
    this.loadMovieData();
    this.renderCard();
  }

  private loadMovieData() {
    this.movieData = {
      id: parseInt(this.getAttribute('movie-id') || '0'),
      title: this.getAttribute('title') || 'Untitled',
      releaseDate: this.getAttribute('release-date') || '',
      price: parseFloat(this.getAttribute('price') || '0'),
      rating: parseFloat(this.getAttribute('rating') || '0'),
      reviews: parseInt(this.getAttribute('reviews') || '0'),
      poster: this.getAttribute('poster') || 'https://via.placeholder.com/200x300?text=No+Poster',
      trailerUrl: this.getAttribute('trailer-url') || '',
      showtimes: JSON.parse(this.getAttribute('showtimes') || '[]')
    };
  }

  private renderCard() {
    const styles = this.createStyles();
    const movieData = this.movieData;
    const reviewsHTML = (movieData?.rating ?? 0) > 0 ? `
      <div class="rating">
        <span class="stars">${this.renderStars(movieData.rating!)}</span>
        <span class="rating-value">${movieData.rating!.toFixed(1)}</span>
        <span class="reviews-count">(${movieData.reviews} reviews)</span>
      </div>
    ` : '';

    const priceHTML = movieData.price ? `
      <div class="price">
        <span class="price-label">Price:</span>
        <span class="price-value">₹${movieData.price}</span>
      </div>
    ` : '';

    const trailerButton = movieData.trailerUrl ? `
      <button class="trailer-btn" data-video-url="${movieData.trailerUrl}">
        ▶ Watch Trailer
      </button>
    ` : '';

    const showtimesHTML = movieData.showtimes.length > 0 ? `
      <div class="showtimes">
        <strong>Showtimes:</strong>
        <div class="showtime-list">
          ${movieData.showtimes.map(time => `
            <span class="showtime-badge">${time}</span>
          `).join('')}
        </div>
      </div>
    ` : '';

    this.shadow.innerHTML = `
      ${styles}
      <div class="movie-card">
        <div class="poster-container">
          <img src="${movieData.poster}" alt="${movieData.title}" class="poster">
          <div class="overlay">
            <button class="book-btn">Book Now</button>
          </div>
        </div>
        <div class="card-content">
          <h3 class="title">${this.escapeHTML(movieData.title)}</h3>
          <p class="release-date">${this.formatDate(movieData.releaseDate)}</p>
          ${reviewsHTML}
          ${priceHTML}
          ${trailerButton}
          ${showtimesHTML}
        </div>
      </div>
    `;

    this.attachCardEventListeners();
  }

  private createStyles(): string {
    return `
      <style>
        :host {
          --primary-color: #1976d2;
          --hover-color: #dc004e;
          --text-primary: #333;
          --text-secondary: #666;
        }

        .movie-card {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease-in-out;
          cursor: pointer;
          max-width: 250px;
          font-family: 'Roboto', sans-serif;
        }

        .movie-card:hover {
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-4px);
        }

        .poster-container {
          position: relative;
          overflow: hidden;
          aspect-ratio: 2/3;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }

        .poster {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease-in-out;
        }

        .movie-card:hover .poster {
          transform: scale(1.05);
        }

        .overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease-in-out;
        }

        .movie-card:hover .overlay {
          opacity: 1;
        }

        .book-btn {
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 4px;
          font-size: 1em;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }

        .book-btn:hover {
          background: var(--hover-color);
        }

        .card-content {
          padding: 16px;
        }

        .title {
          margin: 0 0 8px 0;
          font-size: 1.2em;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .release-date {
          margin: 0 0 12px 0;
          font-size: 0.9em;
          color: var(--text-secondary);
        }

        .rating {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 0.9em;
        }

        .stars {
          color: #ffc107;
          letter-spacing: 2px;
        }

        .rating-value {
          font-weight: bold;
          color: var(--primary-color);
        }

        .reviews-count {
          color: var(--text-secondary);
          font-size: 0.85em;
        }

        .price {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 12px 0;
          padding: 8px 0;
          border-top: 1px solid #eee;
          border-bottom: 1px solid #eee;
          font-size: 1em;
        }

        .price-label {
          font-weight: 500;
          color: var(--text-primary);
        }

        .price-value {
          font-weight: bold;
          font-size: 1.2em;
          color: var(--hover-color);
        }

        .trailer-btn {
          width: 100%;
          background: var(--primary-color);
          color: white;
          border: none;
          padding: 8px;
          border-radius: 4px;
          font-size: 0.9em;
          cursor: pointer;
          margin-bottom: 12px;
          transition: background 0.2s;
        }

        .trailer-btn:hover {
          background: var(--hover-color);
        }

        .showtimes {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid #eee;
        }

        .showtimes strong {
          display: block;
          margin-bottom: 8px;
          font-size: 0.9em;
          color: var(--text-primary);
        }

        .showtime-list {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .showtime-badge {
          background: #f0f0f0;
          color: var(--primary-color);
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 0.8em;
          font-weight: bold;
        }

        @media (max-width: 480px) {
          .movie-card {
            max-width: 100%;
          }

          .title {
            font-size: 1.1em;
          }
        }
      </style>
    `;
  }

  private renderStars(rating: number): string {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '★'.repeat(fullStars);
    if (hasHalfStar) stars += '☆';
    return stars;
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return 'Release date unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  private escapeHTML(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }

  private attachCardEventListeners() {
    const bookBtn = this.shadow?.querySelector('.book-btn');
    const trailerBtn = this.shadow?.querySelector('.trailer-btn');

    if (bookBtn) {
      bookBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('book-clicked', {
          detail: { movieId: this.movieData.id },
          bubbles: true,
          composed: true
        }));
      });
    }

    if (trailerBtn) {
      trailerBtn.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('trailer-clicked', {
          detail: { trailerUrl: this.movieData.trailerUrl },
          bubbles: true,
          composed: true
        }));
      });
    }
  }

  static get observedAttributes() {
    return ['title', 'release-date', 'rating', 'poster', 'price', 'showtimes'];
  }

  attributeChangedCallback() {
    this.loadMovieData();
    this.renderCard();
  }

  get shadowRoot(): ShadowRoot | null {
    return this.shadow;
  }
}

if (!customElements.get('movie-card')) {
  customElements.define('movie-card', MovieCardElement);
}

export default MovieCardElement;
