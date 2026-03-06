import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import movieRoutes from './routes/movieRoutes';
import paymentRoutes from './routes/paymentRoutes';

dotenv.config();

const app = express();

// 🔒 SECURITY: Restrict CORS to specific origins
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL || ''
].filter((origin): origin is string => !!origin);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// 🔒 SECURITY: Limit request payload size
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));

// 🔒 SECURITY: Add security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Allow iframe embedding for /movie-viewer routes with relaxed CSP
  if (req.path.startsWith('/movie-viewer')) {
    res.setHeader('X-Frame-Options', 'ALLOWALL');
    res.removeHeader('Content-Security-Policy');
  }
  
  next();
});

app.use('/api', movieRoutes);
app.use('/api/payments', paymentRoutes);

// 📺 HTML Movie Viewer for iframe embedding
app.get('/movie-viewer/:id', async (req, res) => {
  try {
    const movieId = parseInt(req.params.id);
    const fs = require('fs');
    const path = require('path');
    const moviesPath = path.join(__dirname, 'data/movies.json');
    const moviesData = JSON.parse(fs.readFileSync(moviesPath, 'utf-8'));
    const movie = moviesData.movies.find((m: any) => m.id === movieId);
    
    if (!movie) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>Movie Not Found</title></head>
        <body style="text-align: center; padding: 50px; font-family: Arial;">
          <h1>Movie Not Found</h1>
          <p>The movie you're looking for doesn't exist.</p>
        </body>
        </html>
      `);
    }
    
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${movie.title} - Movie Details</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%); 
            color: #fff; 
            padding: 20px;
          }
          .container { max-width: 100%; }
          .movie-poster { 
            width: 100%; 
            max-width: 100%;
            height: auto;
            min-height: 300px;
            border-radius: 12px; 
            margin-bottom: 20px; 
            box-shadow: 0 8px 16px rgba(0,0,0,0.6);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #1976d2 0%, #0d47a1 50%, #dc004e 100%);
            position: relative;
            overflow: hidden;
          }
          .poster-content {
            text-align: center;
            z-index: 2;
            position: relative;
          }
          .poster-icon {
            font-size: 120px;
            line-height: 1;
            margin-bottom: 20px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
          }
          .poster-text {
            color: #fff;
            font-size: 28px;
            font-weight: bold;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
            letter-spacing: 2px;
          }
          .movie-title { 
            font-size: 2em; 
            font-weight: bold; 
            color: #1976d2; 
            margin-bottom: 10px; 
          }
          .movie-genre { 
            display: inline-block; 
            background: #dc004e; 
            padding: 5px 12px; 
            border-radius: 4px; 
            font-size: 0.85em; 
            margin-bottom: 15px; 
          }
          .movie-details { 
            background: rgba(26, 31, 58, 0.8); 
            padding: 15px; 
            border-radius: 8px; 
            margin-bottom: 15px; 
          }
          .detail-row { 
            display: flex; 
            justify-content: space-between; 
            padding: 8px 0; 
            border-bottom: 1px solid #333; 
          }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #1976d2; }
          .detail-value { color: #ccc; }
          .showtimes { 
            background: rgba(26, 31, 58, 0.8); 
            padding: 15px; 
            border-radius: 8px; 
          }
          .showtimes h3 { 
            color: #1976d2; 
            margin-bottom: 12px; 
            font-size: 1.1em; 
          }
          .showtime-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)); 
            gap: 8px; 
          }
          .showtime-btn { 
            padding: 8px; 
            background: #2a2f4a; 
            border: 2px solid #1976d2; 
            color: #1976d2; 
            border-radius: 4px; 
            cursor: pointer; 
            font-weight: bold; 
            transition: all 0.3s; 
            font-size: 0.85em;
          }
          .showtime-btn:hover { 
            background: #1976d2; 
            color: white; 
          }
          .description {
            background: rgba(26, 31, 58, 0.8);
            padding: 15px;
            border-radius: 8px;
            line-height: 1.6;
            color: #ccc;
            font-size: 0.95em;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Movie Poster Image -->
          <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Cdefs%3E%3ClinearGradient id='grad' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%231976d2;stop-opacity:1'/%3E%3Cstop offset='50%25' style='stop-color:%230d47a1;stop-opacity:1'/%3E%3Cstop offset='100%25' style='stop-color:%23dc004e;stop-opacity:1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='400' height='300' fill='url(%23grad)'/%3E%3Ctext x='200' y='130' font-size='80' fill='white' text-anchor='middle' dominant-baseline='middle'%3E🎬%3C/text%3E%3Ctext x='200' y='200' font-size='24' fill='white' text-anchor='middle' font-weight='bold' letter-spacing='2'%3EMOVIE SHOWCASE%3C/text%3E%3C/svg%3E" alt="Movie Poster" style="width: 100%; max-width: 100%; height: auto; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 8px 16px rgba(0,0,0,0.6); display: block;" />
          
          <h1 class="movie-title">${movie.title}</h1>
          <span class="movie-genre">${movie.genre}</span>
          
          <div class="movie-details">
            <div class="detail-row">
              <span class="detail-label">Rating:</span>
              <span class="detail-value">⭐ ${movie.rating}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Duration:</span>
              <span class="detail-value">${movie.duration} min</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Language:</span>
              <span class="detail-value">${movie.language}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Price:</span>
              <span class="detail-value">$${movie.price}</span>
            </div>
          </div>
          
          <div class="description">
            <strong>Description:</strong>
            <p style="margin-top: 8px;">${movie.description}</p>
          </div>
          
          <div class="showtimes">
            <h3>🕐 Available Showtimes</h3>
            <div class="showtime-grid">
              ${movie.showtimes.map((time: string) => `<button class="showtime-btn">${time}</button>`).join('')}
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error rendering movie viewer:', error);
    res.status(500).send('<h1>Error Loading Movie</h1>');
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});