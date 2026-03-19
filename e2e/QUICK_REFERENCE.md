# 🎯 Self-Healing E2E — Quick Reference Card

## 🚀 Quick Start (5 minutes)

```bash
# 1. Install & validate
npm install
npm run validate:env

# 2. Start system
npm run start              # Healing server (port 3099)

# 3. Run tests in another terminal
npm test                   # Playwright tests (port 3000)

# 4. View results
npm run audit:review       # Healing analytics
```

---

## 🔧 Commands

| Command | Purpose | Output |
|---------|---------|--------|
| `npm test` | Run E2E tests | HTML report in `reports/playwright/` |
| `npm run test:debug` | Interactive debug mode | Opens Playwright Inspector |
| `npm run heal:watch` | Auto-heal on failure | Monitors test results |
| `npm run start` | HTTP webhook server | Listens on port 3099 |
| `npm run validate:env` | Check setup | Green if all OK, red if missing |
| `npm run audit:review` | View healing stats | Success rate, recent events |

---

## 🌐 HTTP Webhook API

### Request
```bash
POST /heal HTTP/1.1
Host: localhost:3099
Content-Type: application/json
X-Webhook-Signature: sha256=<hmac>

{
  "testFile": "tests/auth.spec.ts",
  "testName": "should login",
  "errorMessage": "Element not found",
  "domSnapshot": "<html>...</html>",
  "failedSelector": ".btn-login"
}
```

### Response
```json
{
  "healingId": "abc123xyz",
  "status": "HEALED",
  "confidence": 0.92,
  "failureClass": "SELECTOR_STALE"
}
```

### Status Values
- `HEALED` — Fixed and verified
- `PENDING_APPROVAL` — Needs human review
- `FAILED_AFTER_HEAL` — Fix didn't work
- `BLOCKED` — Security issue detected
- `ERROR` — System error

---

## 📊 Failure Classifications

| Class | Cause | Healing |
|-------|-------|---------|
| `SELECTOR_STALE` | CSS/XPath changed | Find new selector |
| `TIMING_FLAKINESS` | Timeout too short | Increase wait time |
| `ASSERTION_DRIFT` | Expected value changed | Update assertion (approval needed) |
| `NETWORK_FAULT` | API failed | Stub/mock or increase timeout |
| `AUTH_DRIFT` | Token expired | Refresh token or re-login |
| `ENV_MISMATCH` | Config wrong | Fix baseURL or env vars |
| `LAYOUT_SHIFT` | Visual changed | Update coordinates/selectors |

---

## 🔐 Security Checklist

✅ Keep `.env` and `secrets/` out of git (in `.gitignore`)  
✅ Set strong `WEBHOOK_SECRET` (min 32 chars)  
✅ Require approval for assertion changes  
✅ Review pending fixes before merging  
✅ Audit logs monthly (check `artifacts/heal-audit.jsonl`)  

---

## ⚙️ Configuration Tips

### Make Fixes Auto-Apply
```dotenv
HEAL_CONFIDENCE_THRESHOLD=0.75  # Lower = more auto-apply
```

### Require All Approval
```dotenv
HEAL_REQUIRE_APPROVAL=true  # Set to true for safest mode
```

### Control Patch Size
```dotenv
HEAL_MAX_PATCH_LINES=100    # Increase for larger fixes
```

### Tighten Security
```dotenv
HEAL_SECRET_SCAN=true       # Scan for leaked credentials
HEAL_PATCH_SANDBOX=true     # Validate syntax before apply
```

---

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| `GCP credentials not found` | Check `ls ./secrets/gcp-service-account.json` |
| `Validation fails` | Run `npm run validate:env` to see missing vars |
| `Low confidence locks fixes` | Increase `HEAL_CONFIDENCE_THRESHOLD` in `.env` |
| `Test still fails after patch` | Check `npm run audit:review` for details |
| `Port 3099 already in use` | Kill: `lsof -ti:3099 \| xargs kill -9` |

---

## 📈 KPIs to Track

- **Success Rate** = (Healed / Total Attempts) × 100  → Target: ≥85%
- **False Positives** = (Wrong Patches / Total) × 100 → Target: <5%
- **Time to Heal** = Average time failure → fixed → Target: <60s
- **Escalation Rate** = (Pending / Total) × 100 → Target: <15%

```bash
# Auto-calculate from audit log
npm run audit:review
```

---

## 📁 Important Files

| File | Purpose |
|------|---------|
| `src/orchestrator.js` | Main healing pipeline (read this first) |
| `src/security/validator.js` | Security checks |
| `prompts/system-prompt.md` | Master AI prompt |
| `.env.example` | Configuration template |
| `artifacts/heal-audit.jsonl` | Healing history (append-only) |
| `SELF_HEALING_README.md` | Full documentation |
| `SETUP_GUIDE.md` | GCP + local setup |

---

## 🎓 Learning Path

1. **Setup** (15 min) → `SETUP_GUIDE.md`
2. **Overview** (10 min) → `SELF_HEALING_README.md`
3. **Architecture** (20 min) → `src/orchestrator.js`
4. **Config** (5 min) → `.env` + `npm run validate:env`
5. **Test** (10 min) → `npm test` + `npm run audit:review`

---

## 🔗 External Resources

- [Playwright Docs](https://playwright.dev)
- [Vertex AI Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai)
- [GCP Service Accounts](https://cloud.google.com/docs/authentication)

---

## ✨ Tips & Tricks

### Local Testing
```bash
# Run single test file
npx playwright test tests/auth.spec.ts

# Run with grep filter
npx playwright test --grep "should login"

# Headed mode (see browser)
npm run test:debug
```

### Debug Healing
```bash
# Watch audit log in real-time
tail -f artifacts/heal-audit.jsonl | jq .

# Pretty-print recent entries
tail -5 artifacts/heal-audit.jsonl | jq .
```

### Generate HMAC for Webhook
```bash
# Node.js
const crypto = require('crypto');
const hmac = crypto.createHmac('sha256', 'YOUR_SECRET').update('data').digest('hex');
console.log(`sha256=${hmac}`);

# Bash
echo -n "data" | openssl dgst -sha256 -hmac "YOUR_SECRET" | cut -d' ' -f2
```

---

**Need Help?** Check `SELF_HEALING_README.md` Troubleshooting section or review inline comments in `src/`.

**Last Updated**: March 2026 | **Status**: ✅ Production Ready
