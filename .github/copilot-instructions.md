# Copilot Instructions for ShowGlow Movie Booking - Monorepo

**ShowGlow** is an educational full-stack cinema seat booking application demonstrating Redux state threading, race condition prevention, file-based persistence, and E2E testing patterns. **Not production-ready**: uses JSON files instead of databases, no authentication, no payment processing.

## Workspace Structure & Startup

Monorepo with three independent folders:
- **`movieapp/`**: Full-stack app (Express backend on 5000 + React frontend on 3000 + shared docs)
- **`e2e/`**: Playwright UI automation tests with Gemini-powered auto-healing
- **`Movie_WebApp.md`**: Aspirational root doc; ignore outdated sections

### Quick Full-Stack Startup (3 terminals)
```bash
# Terminal 1: Backend (Express + TypeScript, port 5000)
cd movieapp/backend && npm install && npm run dev

# Terminal 2: Frontend (React 19 + Redux, port 3000)
cd movieapp/frontend && npm install && npm start

# Terminal 3: E2E Tests (one-time setup, optional)
cd e2e && npm install && npx playwright install --with-deps && npx playwright test
```

**Critical**: Backend MUST start first; frontend hardcodes `http://localhost:5000/api`. Verify ports 5000 & 3000 are free.

---

## Architecture: The Data Flow

### Backend (Express + TypeScript, port 5000)
- **Persistence**: `backend/src/data/movies.json` (synchronous I/O, dev-only)
- **Data Model**: `Movie` has `showtimeSeats[]` array—one entry per showtime with separate `availableSeats[]` + `bookedSeats[]` pools
- **API**: RESTful CRUD on `/api/movies` + `PATCH /movies/:id/seats` for seat booking
- **Hot-reload**: nodemon watches `src/` directory

### Frontend (React 19 + Redux Toolkit, port 3000)
- **Redux Store** (`movieSlice.ts`): 3 async thunks—`fetchMovies`, `fetchMovieById`, `updateMovieSeats`
- **Routes**: `/ (list) → /movie/:id (details) → /user-details (form) → /payment (checkout)`
- **State Threading**: `useNavigate(..., { state: { movieId, selectedSeats, showtime } })` carries booking context across pages
- **UI**: Material-UI (primary `#1976d2`), styled animations, 100-seat grid (10×10)

### The Booking Flow (Why It's Complex)
1. **MovieList** → User clicks movie → Navigate to `/movie/:id`
2. **MovieDetails** → User selects seats + showtime → `handleBooking()` fetches fresh movie state → Detects conflicts → If seats taken, alerts user & removes them; otherwise proceeds
3. **UserDetailsPage** → User enters name/email/phone → Navigate to `/payment` with movieId preserved
4. **PaymentPage** → Submit booking via `updateMovieSeats({ movieId, bookedSeats, showtime })`
5. **Backend**: Removes booked seats from `showtimeSeats[showtime].availableSeats`, appends to `bookedSeats`

---

## Critical Patterns (High-Priority Gotchas)

### 🔴 Double-Booking Prevention: 3-Layer Defense
**Problem**: Race condition when multiple users book overlapping seats simultaneously.

**Solution**:
1. **Frontend** (`MovieDetails.tsx`): `handleBooking()` → fetch fresh movie → cross-check selected seats against `showtimeSeats[showtime].availableSeats` → if conflict, remove unavailable seats + alert user → only proceed if all seats still available
2. **Redux** (`movieSlice.ts`): Send `PATCH /movies/:id/seats` with `{ seats: [1,2,3], showtime: "14:00" }` (booked seat IDs, not remaining)
3. **Backend** (`movieController.ts`): Find/create showtimeSeats entry → atomically filter booked seats from availableSeats → append to bookedSeats → persist JSON

**Code Pattern**:
```typescript
// MovieDetails.tsx
const latestMovie = await dispatch(fetchMovieById(movieId)).unwrap();
const unavailable = selectedSeats.filter(s => !latestMovie.showtimeSeats[showtime]?.availableSeats.includes(s));
if (unavailable.length > 0) {
  alert(`Seats ${unavailable.join(',')} were just booked. Removing them.`);
  setSelectedSeats(prev => prev.filter(s => !unavailable.includes(s)));
  return;
}
// Proceed to user details only if all seats confirmed available
navigate('/user-details', { state: { movieId, selectedSeats, showtime, ... } });
```

### 🔴 movieId Must Flow Through All Pages
- **MovieDetails** → pass `movieId` in navigate state
- **UserDetailsPage** → extract `movieId` from `location.state` → pass to PaymentPage
- **PaymentPage** → **MUST include `movieId`** in `updateMovieSeats({ movieId, bookedSeats, showtime })`
- **Missing movieId = PaymentPage crash or 404 booking failure**

### 🔴 Showtime is Mandatory
- All seat operations require showtime string (e.g., `"14:00"`)
- `PATCH /movies/:id/seats` expects: `{ seats: [...], showtime: "14:00" }`
- **Missing showtime = 400 Bad Request**
- Differentiates seat pools for multi-showtime movies

### 🔴 Hardcoded URLs Must Match Ports
- **Frontend API**: `http://localhost:5000/api` (hardcoded in `movieSlice.ts`)
- **Backend PORT**: 5000 (set via `process.env.PORT || 5000`)
- **Frontend**: `http://localhost:3000` (CRA default)
- **Mismatch = CORS/connection errors**; verify before debugging network issues

### 🔴 File Persistence (Dev-Only, Not Production-Ready)
- Synchronous I/O: `fs.readFileSync()` / `fs.writeFileSync()`
- Structure: `{ movies: Movie[] }` at root in `movies.json`
- ID generation: `Math.max(...movies.map(m => m.id)) + 1`
- **Lost on backend crash; replace with PostgreSQL + Sequelize before deploying**

### 🔴 Theater Capacity (Fixed)
- 100 seats per showtime (IDs 1–100)
- Auto-initialized on first booking of a showtime
- Frontend generates grid: `Array.from({ length: 100 }, (_, i) => i + 1)`

### 🔴 Redux Error Handling
- All async thunks set `state.error` on rejection via `extraReducers`
- **PaymentPage** + **MovieDetails** must check error state and alert user
- **Missing = silent failures**; users think booking succeeded when it didn't

---

## Developer Workflows & Commands

### Full-Stack Development (3 terminals)
```bash
cd movieapp/backend && npm run dev         # Hot-reload via nodemon
cd movieapp/frontend && npm start          # CRA dev server, auto-opens browser
cd e2e && npm run test                     # After one-time setup
```

### Command Reference

| Task | Command | Notes |
|------|---------|-------|
| Backend dev | `npm run dev` in `movieapp/backend/` | Hot-reload via nodemon |
| Backend build | `npm run build` in `movieapp/backend/` | TypeScript → JS |
| Backend start (prod) | `npm start` in `movieapp/backend/` | Runs compiled JS |
| Frontend dev | `npm start` in `movieapp/frontend/` | CRA dev server (port 3000) |
| Frontend build | `npm run build` in `movieapp/frontend/` | Production bundle |
| Frontend test | `npm test` in `movieapp/frontend/` | Jest interactive mode |
| E2E setup (one-time) | `npx playwright install --with-deps` in `e2e/` | Downloads Chromium/Firefox/WebKit |
| E2E run (headless) | `npm test` in `e2e/` | Default: parallel, no UI |
| E2E run (headed) | `npx playwright test --headed` in `e2e/` | See browser interact in real-time |
| E2E debug | `npx playwright test --debug` in `e2e/` | Opens Playwright Inspector |
| E2E report | `npx playwright show-report` in `e2e/` | View HTML report of last run |
| E2E auto-heal | `npm run heal:gemini:auto` in `e2e/` | Gemini API auto-fixes failures |
| E2E manual analysis | `npm run heal:gemini` in `e2e/` | Analyze failures without applying fixes |

---

## Key Files & Responsibilities

### Backend
- [movieapp/backend/src/index.ts](movieapp/backend/src/index.ts) — Server startup, CORS config, route mounting
- [movieapp/backend/src/routes/movieRoutes.ts](movieapp/backend/src/routes/movieRoutes.ts) — Route definitions (GET, POST, PATCH, DELETE)
- [movieapp/backend/src/controllers/movieController.ts](movieapp/backend/src/controllers/movieController.ts) — CRUD + seat booking logic (double-booking prevention)
- [movieapp/backend/src/models/Movie.ts](movieapp/backend/src/models/Movie.ts) — TypeScript `Movie` interface with `showtimeSeats[]` structure
- [movieapp/backend/src/data/movies.json](movieapp/backend/src/data/movies.json) — Runtime data source

### Frontend
- [movieapp/frontend/src/App.tsx](movieapp/frontend/src/App.tsx) — React Router setup, Redux + MUI providers, theme config
- [movieapp/frontend/src/store/movieSlice.ts](movieapp/frontend/src/store/movieSlice.ts) — Redux `createSlice` + 3 `createAsyncThunk` (fetchMovies, fetchMovieById, updateMovieSeats)
- [movieapp/frontend/src/components/MovieDetails.tsx](movieapp/frontend/src/components/MovieDetails.tsx) — Seat grid, conflict detection, booking initiation (~600 lines)
- [movieapp/frontend/src/components/UserDetailsPage.tsx](movieapp/frontend/src/components/UserDetailsPage.tsx) — Form (name, email, phone), state threading, navigation to PaymentPage
- [movieapp/frontend/src/components/PaymentPage.tsx](movieapp/frontend/src/components/PaymentPage.tsx) — Final checkout, `updateMovieSeats` dispatch, error/loading handling
- [movieapp/frontend/src/components/MovieList.tsx](movieapp/frontend/src/components/MovieList.tsx) — Displays Redux `state.movies.movies[]`, route to details

### E2E Tests
- [e2e/playwright.config.ts](e2e/playwright.config.ts) — Playwright config (baseURL commented out, `trace: 'on-first-retry'` enabled)
- [e2e/tests/HomePage.spec.ts](e2e/tests/HomePage.spec.ts) — MovieList page tests
- [e2e/tests/LandingPageMovieList.spec.ts](e2e/tests/LandingPageMovieList.spec.ts) — MovieDetails + booking flow tests
- [e2e/tests/seed.spec.ts](e2e/tests/seed.spec.ts) — Placeholder for data seeding logic
- [e2e/gemini-healer.js](e2e/gemini-healer.js) — Gemini-powered test failure analyzer & auto-fixer
- [e2e/.env](e2e/.env) — Must contain `GEMINI_API_KEY` for auto-healing

---

## Conventions & Implementation Patterns

### When Adding Backend Routes
- RESTful naming: `GET /api/movies`, `POST /api/movies`, `PATCH /api/movies/:id/seats`
- **Always include `showtime` in seat operation payloads** to differentiate showtime pools
- Return full updated `Movie` object on success (not just status message)
- Sync to `movies.json` synchronously via `writeMovies(data)` after every write

### When Adding Frontend Pages
- Extract `movieId` from `location.state` (set by previous page's navigate)
- Use Redux dispatch for async operations: `fetchMovieById()`, `updateMovieSeats()`
- **Always check + handle `loading` and `error` states** before rendering; alert user on error
- Navigate with state: `navigate('/next-page', { state: { movieId, selectedSeats, showtime, ... } })`
- Use Redux selectors (not direct state access) for consistency

### When Adding E2E Tests
- **Prefer text selectors** over Material-UI classes (brittle): `page.locator('text=ShowGlow')` is more resilient
- Tests assume 8 seeded movies; if dataset changes, update [e2e/tests/seed.spec.ts](e2e/tests/seed.spec.ts)
- **No `test.only` in CI** (will fail CI); use `--grep` for local filtering
- Traces auto-captured on first retry (`trace: 'on-first-retry'` in config)

### UI Styling Convention
- Material-UI with theme primary `#1976d2`, secondary `#dc004e`
- Animations: fade-in/slide-up via `@mui/material/styles` keyframes
- Responsive grid: 100-seat theater shown as rows of 10 (MUI `Grid`)
- Styled components: Use MUI `sx` prop for inline styles (emotion/styled-components)

---

## Common Debugging Checklist

| Symptom | Root Cause | Fix |
|---------|-----------|-----|
| CORS/connection errors | Backend not running on 5000 or frontend URL mismatch | Verify `npm run dev` in backend/; check `movieSlice.ts` hardcodes `http://localhost:5000/api` |
| Frontend won't load | Backend API unavailable | Backend must start first; check port 5000 is free |
| PaymentPage crashes | `movieId` missing from location.state | Add `movieId` to all `navigate()` state objects |
| Seat booking returns 400 | `showtime` missing from `updateMovieSeats` payload | Always send `{ movieId, bookedSeats, showtime }` |
| Backend returns 500 | Invalid `movies.json` structure | Verify file has `{ movies: [...] }` format; restart backend |
| Booked seats show as available after refresh | Frontend didn't fetch fresh data before commit | Ensure `handleBooking()` calls `fetchMovieById()` before validating seats |
| E2E tests fail with 404 | Frontend not running on port 3000 | Start `npm start` in `movieapp/frontend/` before running tests |
| E2E tests fail with selector errors | App UI changed; Material-UI classes shifted | Update [e2e/tests/*.spec.ts](e2e/tests/) with text selectors or add `data-testid` attributes |
| CommonJS/ESM mismatch errors | Module type conflict | Backend `package.json` has `"type": "commonjs"`; e2e has `"type": "module"` |
| E2E auto-heal fails | Gemini API key missing or invalid | Set `GEMINI_API_KEY` in `e2e/.env`; run `npm run heal:gemini:auto` |

---

## E2E Testing & Healing Workflow

The `e2e/` folder includes **Gemini-powered auto-healing** for test failures:

### Manual E2E Workflow
```bash
cd e2e
npm install
npx playwright install --with-deps  # One-time browser download
npm test                            # Run all tests (headless)
npx playwright show-report          # View HTML report
```

### E2E Auto-Healing (Requires Gemini API Key)
```bash
cd e2e
# Set GEMINI_API_KEY in .env
npm run heal:gemini:auto            # Run tests + auto-fix failures
npm run heal:gemini                 # Analyze failures without applying fixes
```

**How it works**: Captures test errors + screenshots → sends to Gemini API → analyzes selectors/logic → suggests/applies fixes → re-runs tests.

---

## Tech Stack Summary

- **Backend**: Express 5, TypeScript 5.9, nodemon (hot-reload)
- **Frontend**: React 19, Redux Toolkit 2.9, Material-UI 7.3, React Router 7.9
- **E2E**: Playwright 1.x, Gemini AI API
- **Data**: JSON (dev-only), no real database or auth

---

## What This Codebase Is & Isn't

**Is**: Educational full-stack booking example showcasing Redux state threading, race condition prevention, file I/O patterns, and E2E testing with AI healing.

**Is NOT**: Production-ready. Lacks database persistence, authentication, real payment processing, and security hardening.

---

## For Questions on Specific Workflows

Reference the key files listed above—they're the source of truth for implementation patterns and current state.
