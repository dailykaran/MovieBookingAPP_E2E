# Copilot Instructions for UI Automation (Playwright)

Summary:
- Purpose: This repository contains Playwright UI tests that exercise a running instance of the Movie Booking frontend (expected at http://localhost:3000).
- Scope: Tests live in `tests/` and are authored using Playwright Test in TypeScript.

Key files and patterns:
- `playwright.config.ts`: Playwright configuration. Note `baseURL` is commented out; tests use absolute URLs. `trace: 'on-first-retry'` is enabled.
- `package.json`: Contains `scripts` → `test` uses `playwright test`.
- `tests/*.spec.ts`: Playwright test files; rely on Material-UI CSS selectors (e.g., `.MuiBox-root .MuiPaper-root`) and text selectors (`text=ShowGlow`).
- `playwright-report/`: CI and local test reports are written here.
- `.github/workflows/playwright.yml`: CI workflow that installs dependencies and runs `npx playwright test`.

Architecture & Intent:
- This folder is a UI test harness, not the frontend backend code repositories.
- Tests assume the app is available at http://localhost:3000; they do not auto-start the application because `webServer` is commented out in `playwright.config.ts`.
- There is an implicit expectation the app uses a deterministic dataset (e.g., tests expect 8 movies and link `/3` to exist).

Developer workflows (how to run & debug):
- Install dependencies: `npm ci` in this folder.
- Install browsers (local and CI): `npx playwright install --with-deps`.
- Run tests (headed): `npx playwright test --headed` or a single file: `npx playwright test tests/localhost-3000.spec.ts --headed`.
- Run tests (debug): Add `--debug` to run tests in headful mode and open the Playwright inspector.
- View report: `npx playwright show-report` or open `playwright-report/index.html`.
- **Automatic Healing on Failure** (new): `npm run test:heal` runs tests and invokes Gemini-powered healer on failures.
- **Manual Healing**: `npm run heal` to analyze failures; `npm run heal:auto` to auto-apply fixes.
- CI: The GitHub Action (`.github/workflows/playwright.yml`) does `npm ci`, `npx playwright install --with-deps`, and `npx playwright test`.

Patterns & Conventions to follow in tests:
- Tests are TypeScript-based; keep type-safety but avoid complex type-only code.
- Use Playwright's `test` and `expect` fixtures; tests must not use `test.only` (CI prevents `test.only`).
- Prefer textual selectors where available: `page.locator('text=ShowGlow')` is resilient.
- Current tests use Material UI classes for DOM selection; if you add tests, prefer stable `data-testid` attributes when possible to avoid fragility.
- Tests assume a deterministic dataset. If adding tests that depend on seeded data, add a dedicated `seed.spec.ts` or augment CI to run a seeding step.

Integration points & external dependencies:
- The repo expects a running frontend at `http://localhost:3000`. Add or enable `webServer` in `playwright.config.ts` if you want Playwright to start the frontend automatically. Example:
  webServer: { command: 'npm run start', url: 'http://localhost:3000', reuseExistingServer: true }
- If the frontend depends on a backend, confirm the backend is running and seeded with consistent data.
- The CI workflow does not start the application server — the team may provide a separate deployment or mock during CI runs; check with maintainers.

Testing tips & advanced commands:
- Run a single test with: `npx playwright test tests/localhost-3000.spec.ts`.
- Retry a failed test locally with: `npx playwright test --retries=2`.
- Capture a trace for a failing test: `npx playwright test --trace on` or enable `trace: 'on-first-retry'` in config (already enabled).
- Use `--project=chromium` to test a specific browser.

Local dev notes & common pitfalls:
- If tests fail with 404, verify the frontend server is running on port 3000 and returns the expected content.
- If tests start failing intermittently, prefer using robust test selectors (text or data-testid) rather than Material-UI classes which can change on UI library upgrades.
- If CI is failing due to no server running, either enable `webServer` or add a step to the workflow to start the app or API.

Where to look next:
- Tests that show `page.locator('.MuiBox-root .MuiPaper-root')` and `expect(...).toHaveCount(8)` indicate assumptions about the movie dataset; if you need new test data, add seeding logic or fixtures.
- `seed.spec.ts` is a placeholder for seeding or setup logic — consider moving or using it for data setup if needed.
- **Healer Integration**: See `HEALER_README.md` for automated test fixing with Gemini API. Key files: `run-healer.js`, `healer.js`, `.env.example`.

Healer Workflow (Gemini API):
- **Purpose**: Automatically analyze and fix failing tests using AI.
- **Setup**: Install `@google/generative-ai` and set `GEMINI_API_KEY` in `.env`.
- **Commands**: 
  - `npm run test:heal` — run tests; auto-invoke healer on failure.
  - `npm run heal` — manual analysis of failed tests.
  - `npm run heal:auto` — auto-apply Gemini-recommended fixes.
- **How it works**: Captures test errors, extracts code/selectors, sends to Gemini API for analysis, applies fixes, re-runs tests.
- **MCP Integration**: Uses Playwright Test MCP tools (from `.vscode/mcp.json`) for debugging; healer chatmode in `.github/chatmodes/🎭 healer.chatmode.md` provides AI context.

If anything in this document is unclear or you'd like me to add more examples (e.g., recommended `webServer` entries for a monorepo), tell me which part to expand.