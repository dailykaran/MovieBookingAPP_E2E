# Copilot Instructions for ShowGlow Movie Booking - Monorepo

## 🎯 Workspace Overview

This is a **monorepo with 3 independent folders** + comprehensive E2E automation with AI-powered test healing:
- **`movieapp/`**: Full-stack (Express backend + React frontend + shared docs)
- **`e2e/`**: Playwright UI tests + TypeScript OOP self-heal mechanism with Gemini/Claude support
- **`Movie_WebApp.md`**: Root architecture documentation

---

## 🚀 Quick Start (3 Terminals)

### Terminal 1: Backend (Express, port 5000)
```bash
cd movieapp/backend && npm install && npm run dev
```

### Terminal 2: Frontend (React, port 3000)
```bash
cd movieapp/frontend && npm install && npm start
```

### Terminal 3: E2E Tests (optional)
```bash
cd e2e && npm install && npx playwright install && npx playwright test
```

**Critical**: Backend MUST run first; both services hardcode localhost URLs. Verify ports 5000 & 3000 are free.

---

## 🏗️ Architecture: The Data Flow

### Backend (Express + TypeScript, port 5000)
**Key File**: [movieapp/backend/src/index.ts](movieapp/backend/src/index.ts)

- **Data**: Single-file JSON at `src/data/movies.json` (synchronous I/O, dev-only)
- **Data Model**: `Movie` has `showtimeSeats[]` array—one entry per showtime with separate `availableSeats[]` + `bookedSeats[]` pools
- **API**: RESTful CRUD on `/api/movies` + `PATCH /movies/:id/seats` for booking
- **Hot-Reload**: nodemon watches `src/` directory for changes

**Key Data Structure**:
```typescript
interface Movie {
  id: number;
  title: string;
  showtimeSeats: Array<{
    showtime: string;        // e.g., "14:00"
    availableSeats: number[]; // [1,2,3,...,100]
    bookedSeats: number[];    // [5,6,7]
  }>;
}
```

### Frontend (React 19 + Redux Toolkit, port 3000)
**Key Files**: [movieapp/frontend/src/](movieapp/frontend/src/)

- **Redux Store**: `movieSlice.ts` manages 3 async thunks (`fetchMovies`, `fetchMovieById`, `updateMovieSeats`)
- **Routes**: `/ → /movie/:id → /user-details → /payment`
- **State Threading**: Uses React Router location state to carry `{ movieId, selectedSeats, showtime }` across pages
- **UI**: Material-UI with primary color `#1976d2`, animated 100-seat grid per showtime

### Booking Flow (Multi-Step State Threading)
1. **MovieList** → User selects movie → Navigate to `/movie/:id`
2. **MovieDetails** → User selects seats + showtime → `handleBooking()` fetches fresh movie state → Detects conflicts → Alert if seats taken
3. **UserDetailsPage** → User enters name/email → **Must preserve `movieId` in location.state**
4. **PaymentPage** → Submit booking via `updateMovieSeats()` → Redux updates store + backend persists
5. **Backend**: Atomically moves seats from `availableSeats` to `bookedSeats` for that showtime

---

## ⚠️ Critical Gotchas (Read or Debugging Hell)

### 🔴 Double-Booking Prevention: 3-Layer Defense
**Problem**: Race condition when 2+ users book same seats simultaneously.

**Solution**:
1. **Frontend** (`MovieDetails.tsx`): Before confirming, re-fetch latest movie → cross-check selected seats against `showtimeSeats[showtime].availableSeats` → if conflict, remove unavailable seats, alert user, abort
2. **Redux** (`movieSlice.ts`): Send `PATCH /movies/:id/seats` with `{ seats: [1,2,3], showtime: "14:00" }` (IDs to BOOK, not remaining)
3. **Backend** (`movieController.ts`): Atomically move seats from available → booked for that showtime

**Code Pattern**:
```typescript
// Frontend conflict detection
const freshMovie = await dispatch(fetchMovieById(movieId)).unwrap();
const conflicts = selectedSeats.filter(s => 
  !freshMovie.showtimeSeats[showtime]?.availableSeats.includes(s)
);
if (conflicts.length > 0) {
  alert(`Seats ${conflicts.join(',')} were just booked.`);
  setSelectedSeats(selectedSeats.filter(s => !conflicts.includes(s)));
  return; // Abort booking
}
```

### 🔴 movieId Must Flow Through ALL Pages
- `MovieDetails` → navigate to `/user-details` with **`state: { movieId, selectedSeats, showtime }`**
- `UserDetailsPage` → extract `movieId` from `location.state` → navigate to `/payment` with **same state**
- `PaymentPage` → **MUST include `movieId`** in `updateMovieSeats({ movieId, bookedSeats, showtime })`
- **Missing = 404 error or booking failure**

### 🔴 Showtime is Mandatory
- All seat operations require showtime string (e.g., `"14:00"`)
- Sent in `PATCH /movies/:id/seats` payload: `{ seats: [...], showtime: "14:00" }`
- **Missing = 400 Bad Request**
- Differentiates seat pools for multi-showtime movies

### 🔴 Hardcoded URLs Must Match Ports
- **Frontend API**: `http://localhost:5000/api` (hardcoded in `movieSlice.ts`)
- **Backend**: `process.env.PORT || 5000` (set in `index.ts`)
- **Frontend**: `http://localhost:3000` (CRA default)
- **Mismatch = CORS/connection errors**. Verify before debugging network issues.

### 🔴 File Persistence (Dev-Only)
- Synchronous I/O: `fs.readFileSync()` / `fs.writeFileSync()`
- Structure: `{ movies: Movie[] }` at JSON root
- ID generation: `Math.max(...movies.map(m => m.id)) + 1`
- **Not production-ready**. Replace with PostgreSQL before deploying.

### 🔴 Theater Capacity (Fixed)
- 100 seats per showtime (IDs 1–100)
- Auto-initialized on first booking of showtime
- Frontend generates grid: `Array.from({ length: 100 }, (_, i) => i + 1)`

### 🔴 Redux Error Handling
- All thunks set `state.error` on rejection via `extraReducers`
- `PaymentPage` + `MovieDetails` must check error state and alert user
- **Missing = silent failures** (users think booking succeeded when it didn't)

---

## 📋 Developer Commands

| Task | Command | Notes |
|------|---------|-------|
| **Backend dev** | `cd movieapp/backend && npm run dev` | Hot-reload via nodemon |
| **Backend build** | `cd movieapp/backend && npm run build` | TypeScript → JavaScript |
| **Frontend dev** | `cd movieapp/frontend && npm start` | CRA dev server, opens browser |
| **Frontend test** | `cd movieapp/frontend && npm test` | Jest interactive mode |
| **E2E setup** | `cd e2e && npx playwright install --with-deps` | One-time: download browsers |
| **E2E run** | `cd e2e && npx playwright test` | Parallel by default |
| **E2E debug** | `cd e2e && npx playwright test --debug` | Step through UI with Inspector |
| **E2E report** | `cd e2e && npx playwright show-report` | View HTML test report |
| **E2E compile TS** | `cd e2e && npm run build` | Compile OOP healer TypeScript |
| **E2E heal (Gemini)** | `cd e2e && npm run heal:ts tests/test.ts` | AI-fix failing tests |
| **E2E heal (Claude)** | `HEALER_PROVIDER=claude npm run heal:ts tests/test.ts` | Use Claude instead |

---

## 📁 Key Files Reference

### Backend
- [movieapp/backend/src/index.ts](movieapp/backend/src/index.ts) — Server startup, CORS, routes
- [movieapp/backend/src/controllers/movieController.ts](movieapp/backend/src/controllers/movieController.ts) — Booking logic with double-booking prevention
- [movieapp/backend/src/models/Movie.ts](movieapp/backend/src/models/Movie.ts) — TypeScript interfaces
- [movieapp/backend/src/data/movies.json](movieapp/backend/src/data/movies.json) — Runtime data

### Frontend
- [movieapp/frontend/src/App.tsx](movieapp/frontend/src/App.tsx) — Router, Redux provider, theme
- [movieapp/frontend/src/store/movieSlice.ts](movieapp/frontend/src/store/movieSlice.ts) — Redux thunks + reducers
- [movieapp/frontend/src/components/MovieDetails.tsx](movieapp/frontend/src/components/MovieDetails.tsx) — Seat selection, conflict detection
- [movieapp/frontend/src/components/PaymentPage.tsx](movieapp/frontend/src/components/PaymentPage.tsx) — Final booking submission

### E2E Tests
- [e2e/playwright.config.ts](e2e/playwright.config.ts) — Playwright config, trace settings
- [e2e/tests/HomePage.spec.ts](e2e/tests/HomePage.spec.ts) — App load tests
- [e2e/tests/LandingPageMovieList.spec.ts](e2e/tests/LandingPageMovieList.spec.ts) — Movie detail navigation

### E2E Self-Heal (TypeScript OOP)
- [e2e/src/healers/BaseHealer.ts](e2e/src/healers/BaseHealer.ts) — Abstract template method pattern
- [e2e/src/healers/GeminiHealer.ts](e2e/src/healers/GeminiHealer.ts) — Google Generative AI implementation
- [e2e/src/types/index.ts](e2e/src/types/index.ts) — All TypeScript interfaces
- [e2e/src/ARCHITECTURE.md](e2e/src/ARCHITECTURE.md) — Full OOP architecture guide

---

## 🎨 Conventions & Patterns

### When Adding Tests
- ✅ Prefer text selectors: `page.locator('text=ShowGlow')` (resilient to UI changes)
- ❌ Avoid Material-UI classes: `.MuiBox-root` (brittle, changes on library upgrade)
- Tests assume 8 seeded movies; update [e2e/tests/seed.spec.ts](e2e/tests/seed.spec.ts) if data changes
- No `test.only` in CI; use `--grep` for local test filtering
- Traces auto-captured on first retry (`trace: 'on-first-retry'` in config)

### When Adding Backend Routes
- Follow RESTful naming: `GET /api/movies`, `PATCH /api/movies/:id/seats`
- **Always include `showtime`** in seat operation payloads
- Return full updated `Movie` object on success
- Sync to `movies.json` synchronously (current pattern)

### When Adding Frontend Pages
- Extract `movieId` from `location.state` (set by previous page's navigate)
- Use Redux dispatch for async operations: `fetchMovieById()`, `updateMovieSeats()`
- Always handle both `loading` and `error` states
- Navigate with location state: `navigate('/next', { state: { movieId, selectedSeats, showtime } })`

### UI Styling
- Material-UI theme: primary `#1976d2`, secondary `#dc004e`
- Animations: fade-in, hover effects via `@mui/material/styles` keyframes
- Responsive grid: 100-seat theater displayed as rows of 10 (MUI Grid)

---

## 🔧 E2E Self-Heal Mechanism (TypeScript OOP)

### Architecture: Factory + Template Method Patterns
The `e2e/src/` folder contains a **production-grade self-heal mechanism** that:
- ✅ Uses OOP design patterns (Factory, Template Method, Strategy)
- ✅ Supports multiple AI providers (Gemini, Claude, extensible)
- ✅ Provides full type safety (TypeScript strict mode)
- ✅ Includes security validation (sanitization, injection detection, code analysis)
- ✅ Implements rate limiting and audit logging

**Key Classes**:
- `BaseHealer` (abstract) — Template method for 10-step healing algorithm
- `GeminiHealer` (concrete) — Google Generative AI implementation
- `HealerFactory` — Creates healer instances without coupling
- `SecurityValidator` — Input sanitization, prompt injection detection
- `RateLimiter`, `AuditLogger` — Utilities for production quality

### Running the Healer
```bash
# Compile TypeScript to JavaScript
cd e2e && npm run build

# Run healing with Gemini (default)
npm run heal:ts e2e/tests/HomePage.spec.ts

# Run with Claude
HEALER_PROVIDER=claude npm run heal:ts tests/test.ts

# Automatic healing on test failure
npm run test:heal   # Runs tests, auto-invokes healer on failure
```

### How It Works
1. Test fails with error message
2. Healer analyzes error using AI (Gemini/Claude)
3. AI generates fixed test code
4. Original file backed up (rollback capability)
5. Fix applied atomically
6. Test re-run to verify fix works
7. Backup cleaned up if successful
8. Audit log updated with all operations

### Security Features
- ✅ Sanitizes inputs (redacts paths, emails, IPs)
- ✅ Detects prompt injection attempts
- ✅ Validates generated code for dangerous patterns (fs.rm, execSync, eval)
- ✅ Rate limits API calls (prevent quota exhaustion)
- ✅ Complete audit trail of all operations

See [e2e/src/ARCHITECTURE.md](e2e/src/ARCHITECTURE.md) for comprehensive guide.

---

## 🐛 Quick Debugging Checklist

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| Frontend won't connect to backend | Check console network tab | Verify backend on 5000, frontend API URL correct |
| Booking fails silently | Check Redux DevTools error state | Frontend not re-fetching latest movie state |
| Seats revert after booking | Check backend response | Showtime mismatch or movieId missing from payload |
| E2E tests fail with 404 selectors | App UI changed | Update tests with text selectors (resilient) |
| CommonJS warnings | Mixing ESM/CommonJS | Backend has `"type": "commonjs"` in package.json |
| Port already in use | Another service on port | Kill process: `lsof -ti:5000 \| xargs kill` (Mac/Linux) |

---

## 📚 What This Codebase Is & Isn't

**✅ Is**: Educational example showcasing:
- Redux state threading across React Router pages
- Race condition handling (double-booking prevention)
- 3-layer data integrity validation
- E2E automation with AI-powered test healing
- OOP design patterns in TypeScript

**❌ Is NOT**: Production-ready without:
- Real database (PostgreSQL/MongoDB)
- Authentication (JWT/OAuth)
- Payment processing (Stripe/Razorpay)
- Environment isolation (.env management)
- Security hardening (HTTPS, CORS policies)

For detailed architecture, see [Movie_WebApp.md](Movie_WebApp.md) and [e2e/src/ARCHITECTURE.md](e2e/src/ARCHITECTURE.md).
