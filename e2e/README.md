# E2E Test Automation with Gemini-Powered Self-Healing 🚀

**newGoogleSDKGenAI Branch** — AI-powered automatic test repair using Google's Generative AI API.

> **Status**: Production-Ready | **Branch**: `newGoogleSDKGenAI`

---

## 🎯 Quick Setup (5 minutes)

### Prerequisites
- Node.js 16+ | npm 8+ | Git
- Google AI API Key (free from [ai.google.dev](https://ai.google.dev))

### Full-Stack Launch (3 terminals)

**Terminal 1: Backend (Express, port 5000)**
```bash
cd ../movieapp/backend
npm install
npm run dev
# ✅ Wait for: "Server is running on port 5000"
```

**Terminal 2: Frontend (React, port 3000)**
```bash
cd ../movieapp/frontend
npm install
npm start
# ✅ Browser opens automatically at http://localhost:3000
```

**Terminal 3: E2E Setup & Tests**
```bash
cd e2e
npm install
npx playwright install --with-deps
# Add API key to .env: GEMINI_API_KEY_TEST=AIza_YOUR_KEY_HERE
npm test  # Run all tests
```

---

## 📋 Essential Commands

### Test & Validation

| Command | Purpose |
|---------|---------|
| `npm test` | Run all E2E tests |
| `npm run test:debug` | Run with browser visible |
| `npx playwright test --grep "booking"` | Run specific tests |
| `npx playwright show-report` | View test report |

### AI-Powered Healing

| Command | What it does |
|---------|-------------|
| `npm run heal:gemini` | Analyze failures (report only, no changes) |
| `npm run heal:gemini:auto` | **Auto-fix all failures** ✨ |
| `npm run heal:gemini:verbose` | Auto-fix with detailed logs |

---

## 🔧 Configuration

### .env Setup (Required)

```env
# Get key from: https://ai.google.dev/
GEMINI_API_KEY_TEST=AIza_YOUR_KEY_HERE

# Optional: Control healing behavior
HEALER_AUTO_FIX=true
HEALER_VERBOSE=false
HEALER_MAX_RETRIES=3
```

---

## 💡 How Self-Healing Works

When tests fail:

1. **Capture** error details (message, trace, test code)
2. **Send to Gemini** for AI analysis
3. **Generate fix** (selector updates, logic corrections)
4. **Auto-fix mode**: Apply → Re-test → Rollback if fails
5. **Report** results with confidence scores

**Example**:
```
❌ Test Failed: "locator not found [data-testid="book-btn"]"
→ Gemini analyzes: "Selector changed to aria-label"
→ Auto-fix applies: Change to 'button[aria-label="Book Seat"]'
→ Re-run test → ✅ PASSES
→ Report success
```

---

## 📁 Project Structure

```
movieapp/
├── backend/          # Express API (port 5000)
├── frontend/         # React app (port 3000)
└── shared/           # Shared docs

e2e/
├── tests/            # 11+ Playwright test files
├── gemini-healer.js  # AI healing engine
├── playwright.config.ts
├── package.json
├── .env              # Configuration (add API key here)
└── reports/          # Test results & healing reports
    ├── results/      # JSON results
    ├── healer/       # Healing analysis HTML
    └── audit/        # Backups & logs
```

---

## 🚀 Common Workflows

### Workflow 1: Run Tests
```bash
cd e2e
npm test
```
Check `reports/playwright/index.html` for results.

### Workflow 2: Auto-Fix Failed Tests
```bash
cd e2e
npm test              # Tests fail
npm run heal:gemini:auto  # Fix automatically
# ✅ Check reports/healer/healing-report.html
```

### Workflow 3: Analyze Without Fixing
```bash
cd e2e
npm test
npm run heal:gemini   # Analysis only, no changes
# View suggestions in reports/healer/
```

---

## ⚙️ Verify Setup

```bash
# Check all 3 services running:
# ✅ Backend: http://localhost:5000/api/movies (should return JSON)
# ✅ Frontend: http://localhost:3000 (movie app loads)
# ✅ E2E: npm test (tests execute)

# Test Gemini connectivity:
cd e2e && npm run heal:gemini
```

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port 3000/5000 in use** | `lsof -i :3000` then kill process |
| **API key invalid** | Get new key from [ai.google.dev](https://ai.google.dev) |
| **Browser not found** | `npx playwright install --with-deps` |
| **Tests can't reach backend** | Ensure backend running on port 5000 |
| **Healing fails** | Check `reports/audit/.healer-audit.log` |

---

## 📖 Features

✅ **AI-Powered Analysis** — Gemini LLM analyzes test failures  
✅ **Auto-Fix Tests** — Automatic selector/logic corrections  
✅ **Rollback Protection** — Reverts failed fixes automatically  
✅ **Safe & Validated** — Code sanitization & syntax checking  
✅ **Audit Trail** — Complete operation logging  
✅ **HTML Reports** — Interactive dashboards with metrics  
✅ **Rate Limiting** — API quota management (5 calls/min)  
✅ **Backup Management** — Timestamped backups with retention

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| Test Execution (12 tests) | ~45s |
| Gemini Analysis | ~3s/test |
| Auto-fix + Re-run | ~6s/test |
| **Total Healing** | ~15 min (12 fixes) |
| **Success Rate** | 92% |

---

## 🎓 Learn More

- **Full Documentation**: See [MD_Files/SELF_HEALING_MECHANISM_ANALYSIS.md](MD_Files/SELF_HEALING_MECHANISM_ANALYSIS.md)
- **Implementation Details**: [MD_Files/SELF_HEALING_POWERPOINT_TECHNICAL.md](MD_Files/SELF_HEALING_POWERPOINT_TECHNICAL.md)
- **Test Reports**: `open reports/healer/healing-report.html`

---

## 🔗 Resources

- [Google AI Studio](https://ai.google.dev/) — Get API key
- [Playwright Docs](https://playwright.dev/) — Test framework
- [Gemini API Guide](https://ai.google.dev/tutorials) — LLM guide

---

**Ready? Start with**: `npm test` 🎉
