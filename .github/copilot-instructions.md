# Copilot Instructions for ShowGlow Movie Booking - Monorepo

## Workspace Structure & Startup

This is a monorepo with three independent subfolders:
- **`movieapp/`**: Full-stack application (backend + frontend + shared docs)
- **`e2e/`**: Playwright UI automation tests
- **`Movie_WebApp.md`**: Root documentation

### Quick Full-Stack Start (3 terminals required)
```bash
# Terminal 1: Backend (Express, port 5000)
cd movieapp/backend && npm install && npm run dev

# Terminal 2: Frontend (React, port 3000)
cd movieapp/frontend && npm install && npm start

# Terminal 3: E2E Tests (optional, requires backend + frontend running)
cd e2e && npm install && npx playwright install && npx playwright test
```

**Critical**: Backend MUST run before frontend; both hardcode localhost URLs. Verify ports are free.

---

## Architecture: The Data Flow

### Backend (Express + TypeScript, port 5000)
**File**: [movieapp/backend/src](movieapp/backend/src)
- Single-file persistence: `backend/src/data/movies.json` (synchronous I/O, dev-only)
- Data model: `Movie` has `showtimeSeats[]` array—one entry per showtime with separate `availableSeats[]` + `bookedSeats[]` pools
- API: RESTful CRUD on `/api/movies` + `PATCH /movies/:id/seats` for booking
- Hot-reload: nodemon watches `src/` directory

### Frontend (React 19 + Redux Toolkit, port 3000)
**Files**: [movieapp/frontend/src](movieapp/frontend/src)
- Redux store: `movieSlice.ts` manages 3 async thunks (`fetchMovies`, `fetchMovieById`, `updateMovieSeats`)
- Routes: `/ → /movie/:id → /user-details → /payment`
- State threading: `useNavigate(..., { state: { movieId, selectedSeats, showtime } })` carries booking context across pages
- UI: Material-UI (primary color `#1976d2`), styled animations, 100-seat grid per showtime

### Booking Flow (Why It's Complex)
1. **MovieList** → User selects movie → Navigate to `/movie/:id`
2. **MovieDetails** → User selects seats + showtime → `handleBooking()` fetches latest movie state to detect conflicts → Alert if seats taken
3. **UserDetailsPage** → User enters name/email (must preserve `movieId` in location state)
4. **PaymentPage** → Submit booking via `updateMovieSeats({ movieId, bookedSeats, showtime })` → Redux updates store
5. **Result**: Backend appends `bookedSeats` to movie's `showtimeSeats[showtime].bookedSeats`, removes from `availableSeats`

---

## Critical Gotchas (Read These or Debugging Hell Awaits)

### 🔴 Double-Booking Prevention: 3-Layer Defense
**Problem**: Race condition when 2 users book overlapping seats simultaneously.
**Solution**:
1. **Frontend (`MovieDetails.tsx`)**: Before committing booking, re-fetch latest movie → cross-check selected seats against `showtimeSeats[showtime].availableSeats` → if conflict, remove unavailable seats, alert user, abort
2. **Redux (`movieSlice.ts`)**: Send `PATCH /movies/:id/seats` with `{ seats: [1,2,3], showtime: "14:00" }` (seats TO BOOK, not remaining)
3. **Backend (`movieController.ts`)**: Atomically move seats from `availableSeats` to `bookedSeats` for that showtime

**Pattern Example**:
```typescript
// Frontend: Detect conflicts
const latestMovie = await dispatch(fetchMovieById(movieId)).unwrap();
const conflictSeats = selectedSeats.filter(s => !latestMovie.showtimeSeats[showtime]?.availableSeats.includes(s));
if (conflictSeats.length > 0) {
  alert(`Seats ${conflictSeats.join(',')} were just booked. Removing them.`);
  setSelectedSeats(selectedSeats.filter(s => !conflictSeats.includes(s)));
  return;
}
```

### 🔴 MovieId Must Flow Through All Pages
- `MovieDetails` → navigate to `/user-details` with `state: { movieId, ... }`
- `UserDetailsPage` → extract `movieId` from `location.state` → navigate to `/payment` with same state
- `PaymentPage` → **MUST include `movieId`** in `updateMovieSeats({ movieId, bookedSeats, showtime })`
- **Missing = 404 or booking failure**

### 🔴 Showtime is Mandatory
- All seat operations require showtime string (e.g., `"14:00"`)
- Sent in `PATCH /movies/:id/seats` payload: `{ seats: [...], showtime: "14:00" }`
- **Missing = 400 Bad Request**
- Differentiates seat pools for multi-showtime movies

### 🔴 Hardcoded URLs Must Match Ports
- **Frontend API base**: `http://localhost:5000/api` (hardcoded in `movieSlice.ts`)
- **Backend PORT**: `process.env.PORT || 5000` (set in `index.ts`)
- **Frontend**: `http://localhost:3000` (CRA default)
- Mismatch = CORS/connection errors. Verify before debugging network issues.

### 🔴 File Persistence (Not Production-Ready)
- Synchronous reads/writes: `fs.readFileSync()` / `fs.writeFileSync()`
- Structure: `{ movies: Movie[] }` at JSON root
- ID generation: `Math.max(...movies.map(m => m.id)) + 1`
- **Lost on backend crash. Replace with PostgreSQL + Sequelize before deploying.**

### 🔴 Theater Capacity (Fixed)
- 100 seats per showtime (IDs 1–100)
- Auto-initialized on first booking of a showtime
- Frontend generates grid: `Array.from({ length: 100 }, (_, i) => i + 1)`

### 🔴 Redux Error Handling
- All thunks set `state.error` on rejection via `extraReducers`
- `PaymentPage` + `MovieDetails` must check error state and alert user
- **Missing = silent failures**, users think booking succeeded when it didn't

---

## Developer Commands by Task

| Task | Command | Notes |
|------|---------|-------|
| **Backend dev** | `cd movieapp/backend && npm run dev` | Hot-reload via nodemon |
| **Backend build** | `cd movieapp/backend && npm run build` | TypeScript → JS |
| **Frontend dev** | `cd movieapp/frontend && npm start` | CRA dev server, auto-opens browser |
| **Frontend test** | `cd movieapp/frontend && npm test` | Jest interactive mode |
| **E2E setup** (one-time) | `cd e2e && npx playwright install --with-deps` | Downloads Chromium/Firefox/WebKit |
| **E2E run** | `cd e2e && npx playwright test` | Parallel by default; no headed |
| **E2E debug** | `cd e2e && npx playwright test --debug` | Opens Playwright Inspector |
| **E2E report** | `cd e2e && npx playwright show-report` | View HTML report of last run |
| **E2E with healing** | `cd e2e && npm run test:heal` | Auto-fixes test failures (Gemini API) |

---

## Key Files Reference

### Backend
- [movieapp/backend/src/index.ts](movieapp/backend/src/index.ts) — Server startup, CORS, routes
- [movieapp/backend/src/routes/movieRoutes.ts](movieapp/backend/src/routes/movieRoutes.ts) — Route definitions
- [movieapp/backend/src/controllers/movieController.ts](movieapp/backend/src/controllers/movieController.ts) — Booking logic (double-booking prevention)
- [movieapp/backend/src/models/Movie.ts](movieapp/backend/src/models/Movie.ts) — TypeScript interfaces
- [movieapp/backend/src/data/movies.json](movieapp/backend/src/data/movies.json) — Runtime data

### Frontend
- [movieapp/frontend/src/App.tsx](movieapp/frontend/src/App.tsx) — Router & theme setup
- [movieapp/frontend/src/store/movieSlice.ts](movieapp/frontend/src/store/movieSlice.ts) — Redux async thunks + reducers
- [movieapp/frontend/src/components/MovieDetails.tsx](movieapp/frontend/src/components/MovieDetails.tsx) — Conflict detection, seat selection
- [movieapp/frontend/src/components/UserDetailsPage.tsx](movieapp/frontend/src/components/UserDetailsPage.tsx) — User form, state threading
- [movieapp/frontend/src/components/PaymentPage.tsx](movieapp/frontend/src/components/PaymentPage.tsx) — Final checkout, booking submission

### E2E Tests
- [e2e/playwright.config.ts](e2e/playwright.config.ts) — Config; note `baseURL` commented out
- [e2e/tests/HomePage.spec.ts](e2e/tests/HomePage.spec.ts) — Movie list tests
- [e2e/tests/LandingPageMovieList.spec.ts](e2e/tests/LandingPageMovieList.spec.ts) — Movie detail tests
- [e2e/tests/seed.spec.ts](e2e/tests/seed.spec.ts) — Placeholder for data seeding

---

## Conventions & Patterns

### When Adding Tests
- Prefer text selectors: `page.locator('text=ShowGlow')` over Material-UI classes (brittle)
- Tests assume 8 seeded movies; if data changes, update [e2e/tests/seed.spec.ts](e2e/tests/seed.spec.ts)
- No `test.only` in CI; use `--grep` for local test filtering
- Traces auto-captured on first retry (`trace: 'on-first-retry'` in config)

### When Adding Backend Routes
- Follow `GET /api/movies`, `PATCH /api/movies/:id/seats` naming (RESTful)
- Always include `showtime` in seat operation payloads
- Return full updated `Movie` object on success
- Sync to `movies.json` synchronously (current pattern)

### When Adding Frontend Pages
- Extract `movieId` from `location.state` (set by previous page's navigate)
- Use Redux dispatch for async operations (`fetchMovieById`, `updateMovieSeats`)
- Always handle `loading` + `error` states
- Navigate with location state: `navigate('/next-page', { state: { movieId, ... } })`

### UI Styling Convention
- Material-UI with theme primary `#1976d2`, secondary `#dc004e`
- Animations: fade-in, hover effects via `@mui/material/styles` keyframes
- Responsive grid: 100-seat theater shown as rows of 10 (MUI Grid)

---

## Quick Debugging Checklist

**Frontend won't connect to backend?** → Verify backend runs on 5000, frontend sees `http://localhost:5000/api` in console
**Booking fails silently?** → Check Redux `error` state in DevTools; frontend may not be re-fetching before commit
**Seats revert after booking?** → Showtime mismatch or `movieId` not passed through pages
**E2E tests fail with selectors?** → App UI changed; update [e2e/tests/*.spec.ts](e2e/tests/) with text or `data-testid` selectors
**CommonJS warning?** → Backend `package.json` has `"type": "commonjs"`; use `.js` imports if mixing ESM

---

## What This Codebase Is & Isn't

**Is**: A educational full-stack booking example showcasing Redux state threading, conflict detection, file I/O, and E2E testing.  
**Is NOT**: Production-ready (uses JSON files, no auth, no real payments). Scalability & security reviews needed before deploying.

For questions on specific components or workflows, reference the key files listed above—they're the source of truth.
