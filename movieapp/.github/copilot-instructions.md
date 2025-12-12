# Copilot Instructions for ShowGlow Movie Booking Application

## Project Overview

**ShowGlow** is a full-stack movie booking application with a monorepo structure containing `backend/` (Express.js API), `frontend/` (React Redux UI), `shared/` (documentation), and `Automation_booking/` (Playwright E2E tests). The application demonstrates cinema seat selection, availability synchronization, and double-booking prevention patterns.

## Quick Start

```bash
# Terminal 1: Backend (port 5000)
cd backend && npm install && npm run dev

# Terminal 2: Frontend (port 3000)  
cd frontend && npm install && npm start

# Terminal 3: E2E Tests (optional)
cd e2e && npx playwright install && npx playwright test
```

**Key**: Backend must run before frontend; both use hardcoded URLs (`http://localhost:5000/api`, `http://localhost:3000`).

## Architecture at a Glance

### Backend (Express + TypeScript, port 5000)
- Controllers read/write `backend/src/data/movies.json` (file-based, synchronous, dev-only)
- RESTful API: `/api/movies` with CRUD + `PATCH /movies/:id/seats` (seat booking)
- Data model: Movie with `showtimeSeats[]` array (per-showtime availability pools)
- Endpoints: GET (all, by ID), POST (create), PUT (update), DELETE, PATCH (seat management)

### Frontend (React 19 + Redux Toolkit, port 3000)
- Redux `movieSlice.ts`: 3 async thunks (`fetchMovies`, `fetchMovieById`, `updateMovieSeats`)
- Routes: `/` (list) → `/movie/:id` (details) → `/user-details` (form) → `/payment` (checkout)
- Material-UI with primary `#1976d2`, styled components with animations
- State flow: LocationState carries `movieId`, `selectedSeats`, `showtime` through booking pages

## Developer Workflows

### Full Stack Startup (3 terminals)
```bash
cd backend && npm run dev      # Port 5000, hot-reload via nodemon
cd frontend && npm start       # Port 3000, CRA dev server
cd e2e && npx playwright test  # After npx playwright install (one-time)
```

### Key Commands
| Task | Command | Notes |
|------|---------|-------|
| Backend dev | `npm run dev` in backend/ | Hot-reload via nodemon |
| Backend build | `npm run build` in backend/ | TypeScript → JS |
| Frontend dev | `npm start` in frontend/ | CRA dev server |
| Frontend test | `npm test` in frontend/ | Jest, interactive mode |
| E2E setup | `npx playwright install` in e2e/ | One-time, downloads browsers |
| E2E run | `npx playwright test` in e2e/ | Parallel by default |
| E2E debug | `npx playwright test --debug` | Step through UI |

**Note**: Backend must run first; frontend won't work without it. CommonJS backend (`"type": "commonjs"` in package.json).

## Critical Patterns & Gotchas

### The Double-Booking Prevention Architecture (3-Layer Defense)
**Problem**: Race condition when multiple users select same seats simultaneously.

1. **Frontend** (`MovieDetails.tsx`): `handleBooking()` → fetch fresh movie → cross-check selected seats against latest `showtimeSeats[showtime].availableSeats` → if conflict, remove unavailable seats & alert user → only proceed if all seats available
2. **Redux** (`movieSlice.ts`): `updateMovieSeats({ movieId, bookedSeats, showtime })` → send `PATCH /movies/:id/seats` → on success, update store (`selectedMovie` + `movies[]`) → on error, alert user  
3. **Backend** (`movieController.ts`): Find/create showtimeSeats entry → filter booked seats from availableSeats → append to bookedSeats → persist JSON

**API Contract**: `PATCH /movies/:id/seats` expects `{ seats: [1,2,3], showtime: "14:00" }` (IDs to book, not remaining)

### CRITICAL: movieId Must Flow Through All Pages
- MovieDetails → pass `movieId` in navigate state to UserDetailsPage
- UserDetailsPage → pass `movieId` to PaymentPage
- PaymentPage → **must include movieId** in `updateMovieSeats({ movieId, bookedSeats, showtime })`
- **Missing movieId = PaymentPage crash or booking failure**

### CRITICAL: Showtime is Mandatory
- All seat operations require `showtime` string (e.g., "14:00")
- Missing showtime → **400 Bad Request**
- Differentiates seat pools for multi-showtime movies

### Hardcoded URLs Must Match Ports
- Frontend API: `http://localhost:5000/api` in `movieSlice.ts`
- Backend PORT: 5000 (set via `process.env.PORT || 5000`)
- Frontend: `http://localhost:3000` (CRA default)
- **Mismatch = CORS/connection errors**

### File Persistence (Dev Only)
- Synchronous I/O: `fs.readFileSync()` / `fs.writeFileSync()`
- Structure: `{ movies: Movie[] }` at root in movies.json
- ID generation: `Math.max(...movies.map(m => m.id)) + 1`
- **Not production-ready**: Replace with real database before deploying

### Theater Configuration (Fixed)
- Capacity: 100 seats per showtime (IDs 1-100)
- Frontend: `Array.from({ length: 100 }, (_, i) => i + 1)`
- Backend: Auto-initializes new showtimes with 100 available seats

### Redux Error Handling
- All thunks set `state.error` on rejection via `extraReducers`
- PaymentPage & MovieDetails must check error state and alert user
- Missing error handling → silent failures



## Component-Specific Patterns

### MovieDetails.tsx (~600 lines)
- Styled MUI components with keyframe animations (`fadeInUp`)
- Seat grid: ToggleButtonGroup with 100 buttons; tracks selected seats in local state
- `handleBooking()`: Calls `fetchMovieById()` for fresh data → validates selected seats against `availableSeats` → if conflict detected, removes unavailable seats + alerts user → navigates to `/user-details` with state
- **State passed**: `{ movieTitle, selectedSeats, showtime, totalAmount, movieId }`

### MovieList.tsx
- Displays `state.movies.movies[]` from Redux store
- Click movie → navigate to `/movie/:id`

### UserDetailsPage.tsx
- Form: name, email, phone
- Reads `movieId`, `selectedSeats`, `showtime` from location.state
- Submits → navigate to `/payment` with accumulated state

### PaymentPage.tsx
- **Final step**: Dispatches `updateMovieSeats({ movieId, bookedSeats: selectedSeats, showtime })`
- Reads `movieId` from location.state (required!)
- On success: Show confirmation; on error: Alert user + allow retry
- Must handle Redux `loading` and `error` states

## Key Files & Responsibilities

| File | Responsibility |
|------|-----------------|
| `backend/src/controllers/movieController.ts` | CRUD operations; `updateMovieSeats` logic (showtimeSeats management) |
| `backend/src/models/Movie.ts` | TypeScript interfaces (Movie, ShowtimeSeats) |
| `backend/src/data/movies.json` | Source of truth for all data |
| `frontend/src/store/movieSlice.ts` | Redux state + 3 async thunks |
| `frontend/src/App.tsx` | Router setup, Redux + MUI providers |
| `frontend/src/components/MovieDetails.tsx` | Seat selection + double-booking prevention |
| `frontend/src/components/PaymentPage.tsx` | Final booking sync via `updateMovieSeats` |
| `e2e/tests/app.spec.ts` | Example Playwright test |
| `shared/SEAT_BOOKING_ENHANCEMENTS.md` | Detailed workflow documentation |

## Debugging Checklist

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| CORS errors | Wrong API URL in movieSlice.ts | Verify `http://localhost:5000/api` |
| PaymentPage crashes | `movieId` missing from location.state | Add `movieId` to all navigate() calls |
| Seat booking returns 400 | `showtime` missing from request | Include `{ movieId, bookedSeats, showtime }` in thunk call |
| Backend returns 500 | Invalid movies.json structure | Verify `{ movies: [...] }` format |
| Booked seats show as available | Frontend didn't fetch fresh data | Ensure `handleBooking()` calls `fetchMovieById()` first |
| Tests fail with 404 | Frontend not running | Start `npm start` in frontend/ before tests |
| ERR_MODULE_TYPE | CommonJS/ESM mismatch | Check backend `package.json` has `"type": "commonjs"` |

## Dependencies & Conventions

**Tech Stack**: Express 5, TypeScript 5.9, React 19, Redux Toolkit 2.9, Material-UI 7.3, React Router 7.9, Playwright 1.x

**Conventions**:
- Naming: verb-noun functions (`getAllMovies`, `updateMovieSeats`), PascalCase components
- Error handling: HTTP status codes (201 create, 400 bad request, 404 not found, 500 server error)
- Styling: MUI `sx` prop for components (emotion/styled-components)
- State: Redux Toolkit `createSlice` + `createAsyncThunk` for async operations
- Responses: JSON with `{ message: string }` error format

```
