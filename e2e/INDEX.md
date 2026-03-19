# 📚 Self-Healing E2E Test System — Complete Documentation Index

**Last Updated**: March 17, 2026  
**Status**: ✅ Production Ready

---

## 📖 Documentation Roadmap

### Quick Start (5-10 minutes)
1. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** — Essential commands & configuration
2. **[SETUP_GUIDE.md](SETUP_GUIDE.md)** — GCP Setup (15 min) + Local Config (5 min)

### System Understanding (20-30 minutes)
1. **[SELF_HEALING_README.md](SELF_HEALING_README.md)** — Complete system overview
   - Architecture and workflow
   - Command reference
   - Webhook API integration
   - Security & safety measures
   - Best practices

2. **[IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)** — What was built
   - File structure
   - Core components
   - Prompt engineering
   - Deployment readiness

### Deployment & Operations (1-2 hours)
1. **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** — Step-by-step deployment
   - Phase 1: GCP Setup (30 min)
   - Phase 2: Local Setup (15 min)
   - Phase 3: Local Testing (20 min)
   - Phase 4: CI/CD Integration (30 min)
   - Phase 5-8: Hardening, Monitoring, Scaling

### Development & Coding
1. **`src/orchestrator.js`** — Main 8-stage healing pipeline (start here)
2. **`src/security/validator.js`** — Security checks & validation
3. **`prompts/system-prompt.md`** — Master AI prompt template
4. **`src/classifiers/failure-classifier.js`** — Error classification
5. **`tests/test-fixtures.ts`** — Playwright fixture integration

---

## 🎯 Finding What You Need

### "I'm new. How do I get started?"
→ Read **SETUP_GUIDE.md** (30 min) → Run **QUICK_REFERENCE.md** commands

### "How does the system work?"
→ Read **SELF_HEALING_README.md** Architecture section → Review **src/orchestrator.js**

### "How do I deploy to production?"
→ Follow **DEPLOYMENT_CHECKLIST.md** Phase by Phase

### "What was implemented?"
→ Review **IMPLEMENTATION_SUMMARY.md** + **File Structure** section

### "How do I configure it?"
→ Check **QUICK_REFERENCE.md** Configuration Tips + **.env.example**

### "How do I debug a failure?"
→ See **QUICK_REFERENCE.md** Troubleshooting + **SELF_HEALING_README.md** Debugging

### "How do I integrate with my CI/CD?"
→ See **SELF_HEALING_README.md** Webhook Integration + **DEPLOYMENT_CHECKLIST.md** Phase 4

### "What's the security model?"
→ Check **SELF_HEALING_README.md** Security section + **src/security/** directory

---

## 📁 File Structure & Purpose

### Documentation Files
```
SELF_HEALING_README.md         → Complete system guide (go-to resource)
SETUP_GUIDE.md                 → GCP + local setup walkthrough  
IMPLEMENTATION_SUMMARY.md      → What was built
DEPLOYMENT_CHECKLIST.md        → Step-by-step deployment
QUICK_REFERENCE.md             → One-page cheat sheet
.env.example                   → Configuration template
.env.schema.json               → Environment validation rules
```

### Source Code
```
src/
├── index.js                    HTTP server + startup (read first)
├── orchestrator.js             Main 8-stage pipeline (read second)
├── gemini-client.js            Vertex AI integration
├── prompt-builder.js           Prompt template engine
├── patch-applicator.js         Safe code patching
├── validate-env.js             Environment validation
├── watcher.js                  File watcher (local dev)
├── audit-viewer.js             Analytics viewer (npm run audit:review)
├── classifiers/
│   └── failure-classifier.js   Error categorization
├── security/
│   ├── validator.js            Input/output security
│   └── secret-scanner.js       Credential leak detection
└── reporters/
    └── audit-logger.js         Immutable JSONL logging
```

### Prompt Templates
```
prompts/
├── system-prompt.md            Master AI instructions
├── selector-heal.md            Stale selector fixes
├── timing-heal.md              Timeout/flakiness fixes
├── assertion-heal.md           Assertion drift fixes
├── network-heal.md             Network fault fixes
├── auth-heal.md                Auth/session drift fixes
├── env-heal.md                 Environment mismatch fixes
└── layout-heal.md              Visual/layout shift fixes
```

### Test Integration
```
tests/
└── test-fixtures.ts            Custom Playwright fixtures
```

### Artifacts & Logs
```
artifacts/
├── screenshots/                Test failure screenshots
├── patches/                    Backup files for rollback
└── heal-audit.jsonl            Immutable healing audit trail
```

---

## 🔑 Key Concepts

### Healing Pipeline (8 Stages)

```
1. CLASSIFY      Failure categorization (7 classes)
   ↓
2. VALIDATE_IN   Security: injection, size, format
   ↓
3. BUILD_PROMPT  Template injection + context
   ↓
4. GEMINI_AI     Multimodal analysis (text + DOM + screenshot)
   ↓
5. VALIDATE_OUT  Security: schema, code patterns, secrets
   ↓
6. CONFIDENCE    Auto-apply (>0.82) vs Pending Approval
   ↓
7. PATCH_APPLY   Sandbox validation + file patching
   ↓
8. RERUN_TEST    Verify fix works
```

### Failure Classifications

| Class | Cause | Fix |
|-------|-------|-----|
| `SELECTOR_STALE` | Element selector invalid | Find new selector |
| `TIMING_FLAKINESS` | Test timeout too short | Increase wait time |
| `ASSERTION_DRIFT` | Expected value changed | Update assertion ⚠️ |
| `NETWORK_FAULT` | API/network failure | Stub/mock or retry |
| `AUTH_DRIFT` | Token/session expired | Refresh or re-login |
| `ENV_MISMATCH` | Config error | Fix baseURL/env vars |
| `LAYOUT_SHIFT` | Visual change | Update coordinates |

### Confidence Scoring

- **0.95–1.0** → Auto-apply (high confidence)
- **0.82–0.94** → Auto-apply (normal confidence)
- **0.70–0.81** → Pending approval (low confidence)
- **<0.70** → Pending approval + require investigation
- **Assertions** → Always pending (security-critical)

---

## 🔐 Security Model

### Input Protection
✅ Size limits (DOM <100KB, test code <10KB)
✅ Prompt injection detection
✅ Field type validation
✅ HMAC signature verification

### Output Protection
✅ Zod schema strict validation
✅ Dangerous code blocklist (eval, exec, child_process, etc.)
✅ File path whitelist (tests/, e2e/, playwright/)
✅ Line count caps (50 lines default)
✅ Secret/credential scanning

### Approval Workflow
✅ Assertion changes → Always require approval
✅ Low confidence → Require approval
✅ High confidence + safe patch → Auto-apply

### Audit Trail
✅ Immutable append-only JSONL
✅ Timestamps on all actions
✅ No delete/overwrite capability
✅ Retained 90+ days (recommended)

---

## 💻 Common Commands

```bash
# Setup & Validation
npm install
npm run validate:env

# Running Tests
npm test                        # Run all tests
npm run test:debug             # Interactive debug mode
npm run heal:watch             # Auto-heal on failure

# Server Management
npm run start                  # Start healing server
npm run audit:review           # View analytics

# Directory Navigation
cd e2e                         # E2E tests folder
cd movieapp/backend            # Backend API
cd movieapp/frontend           # Frontend app
```

## 📊 Key Metrics to Track

| Metric | Formula | Target |
|--------|---------|--------|
| **Success Rate** | Healed / Total Attempts | ≥85% |
| **False Positive Rate** | Wrong Fixes / Total | <5% |
| **Mean Healing Time** | Avg failure → healed | <60s |
| **Escalation Rate** | Pending / Total | <15% |
| **Confidence Accuracy** | Score vs actual result | R² >0.8 |

```bash
# Auto-calculate metrics
npm run audit:review
```

---

## 🚀 Quick Commands by Task

### Getting Started
```bash
npm install && npm run validate:env
```

### Local Development
```bash
npm test                       # Run tests
npm run heal:watch            # Auto-heal mode
npm run audit:review          # View results
```

### Debugging
```bash
npm run test:debug            # Interactive debugger
tail -f artifacts/heal-audit.jsonl | jq .    # Watch healing log
```

### Server Management
```bash
npm run start                 # Start healing server
curl http://localhost:3099/health            # Check health
```

---

## 🎓 Learning Sequence

### Day 1: Understanding
1. Read: QUICK_REFERENCE.md (5 min)
2. Read: SETUP_GUIDE.md (20 min)
3. Read: SELF_HEALING_README.md Architecture (15 min)

### Day 2: Setup & Testing
1. Follow: SETUP_GUIDE.md steps 1-4 (45 min)
2. Run: `npm test` (10 min)
3. Check: `npm run audit:review` (5 min)

### Day 3: Deployment
1. Read: DEPLOYMENT_CHECKLIST.md (20 min)
2. Follow: DEPLOYMENT_CHECKLIST.md Phase 1-3 (1 hour)
3. Set up: CI/CD integration (DEPLOYMENT_CHECKLIST Phase 4)

### Week 2+: Production Operation
1. Monitor: Daily `npm run audit:review`
2. Review: Weekly success metrics
3. Optimize: Adjust thresholds based on results

---

## ❓ FAQ

### Q: Do I need GCP credentials?
**A**: Yes, but only for Gemini API calls. Get them with: `SETUP_GUIDE.md` Phase 1

### Q: Can I customize Gemini prompts?
**A**: Yes! Edit files in `prompts/` directory

### Q: What if Gemini API is down?
**A**: Healing will fail gracefully. Tests continue to run normally.

### Q: How do I adjust healing aggressiveness?
**A**: Set `HEAL_CONFIDENCE_THRESHOLD` in `.env` (lower = more auto-apply)

### Q: Can I use this with Cypress?
**A**: Currently supports Playwright. Cypress support coming soon.

### Q: How are audit logs stored?
**A**: Immutable JSONL in `artifacts/heal-audit.jsonl` (append-only)

### Q: Do I need to approve every fix?
**A**: No. Only low-confidence (<0.82) and assertion changes require approval.

---

## 📞 Support Resources

### Documentation
- **System Overview**: SELF_HEALING_README.md
- **Setup Issues**: SETUP_GUIDE.md → Troubleshooting
- **Deployment Help**: DEPLOYMENT_CHECKLIST.md
- **Quick Answers**: QUICK_REFERENCE.md

### Code
- **Main Logic**: `src/orchestrator.js`
- **Security**: `src/security/validator.js`
- **Classification**: `src/classifiers/failure-classifier.js`
- **Prompts**: `prompts/system-prompt.md`

### Debugging
- **Audit Log**: `npm run audit:review`
- **Real-time Log**: `tail -f artifacts/heal-audit.jsonl | jq .`
- **Error Log**: `cat artifacts/heal-errors.log`

---

## ✅ Deployment Readiness Checklist

Before going to production, verify:

- [ ] GCP project created and APIs enabled
- [ ] Service account created with Vertex AI User role
- [ ] GCP credentials file downloaded
- [ ] .env configured with GCP_PROJECT_ID
- [ ] `npm run validate:env` passes
- [ ] Local tests pass with `npm test`
- [ ] Healing server starts with `npm run start`
- [ ] CI/CD pipeline set up
- [ ] Monitoring and alerts configured
- [ ] Team trained on system
- [ ] Approval workflow defined
- [ ] Security review completed

---

## 📝 Version & History

**Current Version**: 1.0.0  
**Release Date**: March 17, 2026  
**Status**: ✅ Production Ready  

**Changelog**:
- v1.0.0: Initial release with 7 failure categories, Gemini 2.5 Flash support

---

## 🎯 Next Steps

1. **Now**: Read QUICK_REFERENCE.md (5 min)
2. **Next**: Follow SETUP_GUIDE.md (30 min)
3. **Then**: Deploy with DEPLOYMENT_CHECKLIST.md (2 hours)
4. **Finally**: Monitor with `npm run audit:review` (ongoing)

---

**Questions?** Check the appropriate documentation section in this index, or review code comments in `src/` directory.

**Ready to start?** → Jump to [QUICK_REFERENCE.md](QUICK_REFERENCE.md)
