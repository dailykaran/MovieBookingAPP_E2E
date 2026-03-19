# Self-Healing E2E Setup Guide

Step-by-step guide to set up the self-healing test system.

## Prerequisites

- **Node.js** >= 20.0.0 (check: `node --version`)
- **Google Cloud Project** with Vertex AI API enabled
- **GCP Service Account** with Vertex AI admin permissions

## Step 1: GCP Setup

### 1.1 Create GCP Project

```bash
# List existing projects
gcloud projects list

# Create new project
gcloud projects create my-e2e-healing --name="E2E Healing Tests"

# Set as active
gcloud config set project my-e2e-healing
```

### 1.2 Enable APIs

```bash
# Enable Vertex AI API
gcloud services enable aiplatform.googleapis.com

# Enable IAM API
gcloud services enable iam.googleapis.com

# Verify APIs are enabled
gcloud services list --enabled
```

### 1.3 Create Service Account

```bash
# Create service account
gcloud iam service-accounts create e2e-healer \
  --display-name="E2E Test Healer"

# Grant Vertex AI User role
gcloud projects add-iam-policy-binding my-e2e-healing \
  --member="serviceAccount:e2e-healer@my-e2e-healing.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

# Create and download JSON key
gcloud iam service-accounts keys create ./secrets/gcp-service-account.json \
  --iam-account=e2e-healer@my-e2e-healing.iam.gserviceaccount.com

# Verify key file
ls -la ./secrets/gcp-service-account.json
```

## Step 2: Local Configuration

### 2.1 Install Dependencies

```bash
cd e2e
npm install
npx playwright install --with-deps
```

### 2.2 Configure Environment

```bash
# Copy .env.example to .env
cp .env.example .env

# Edit .env with your GCP project ID and paths
nano .env  # or use your editor
```

Key variables to set:

```dotenv
GCP_PROJECT_ID=my-e2e-healing
GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-service-account.json
WEBHOOK_SECRET=your-secret-key-min-32-chars
```

### 2.3 Validate Setup

```bash
npm run validate:env
```

Expected output:
```
🔍 Validating environment variables...

✓ GCP_PROJECT_ID: my-e2e-healing
✓ GCP_LOCATION: us-central1
✓ GOOGLE_APPLICATION_CREDENTIALS: ./secrets/gcp-service-account.json
... (more variables)

✅ All environment variables validated successfully!
```

## Step 3: Start Services

### 3.1 Start Backend App

In Terminal 1:
```bash
cd movieapp/backend
npm install
npm run dev
```

Wait for: `Server is running on port 5000`

### 3.2 Start Frontend App

In Terminal 2:
```bash
cd movieapp/frontend
npm install
npm start
```

Browser opens automatically to `http://localhost:3000`

### 3.3 Start Healing Server (Optional)

In Terminal 3:
```bash
cd e2e
npm run start
```

Output:
```
🚀 Self-Healing E2E Test Server — Startup

1️⃣  Validating environment...
   ✅ Environment OK

2️⃣  Webhook server listening on port 3099
   📍 POST http://localhost:3099/heal

3️⃣  Health check server listening on port 3098
   📍 GET http://localhost:3098/health

✅ Self-Healing server ready!
```

## Step 4: Run Tests

### Option 1: Manual Test Run

```bash
cd e2e
npm test
```

Tests run in headless mode. Results saved to:
- `reports/playwright/` — HTML report
- `reports/results/results.json` — JSON report
- `test-results/` — Playwright test results

### Option 2: Interactive Debug Mode

```bash
npm run test:debug
```

Opens Playwright Inspector for step-by-step debugging.

### Option 3: Watch Mode (Auto-Healing)

```bash
npm run heal:watch
```

Monitors test results and auto-heals failures as they occur.

## Step 5: Verify Healing

### Check Audit Trail

```bash
npm run audit:review
```

Shows statistics and recent healing events:
```
📊 Self-Healing Audit Trail

📈 Statistics:
Total events: 24
Average confidence: 0.89

🎯 Healing Summary:
Healing attempts: 8
Successfully healed: 7
Blocked (security): 0
Pending approval: 1
Success rate: 87.5%
```

### Check Healing Log

View immutable healing records:
```bash
cat artifacts/heal-audit.jsonl | tail -20
```

Each line is a JSON event with timestamp, status, and details.

## Troubleshooting

### Error: "PERMISSION_DENIED: Invalid service account"

**Fix**: Verify service account JSON is valid:
```bash
# Check file exists
ls -la ./secrets/gcp-service-account.json

# Check format
cat ./secrets/gcp-service-account.json | jq .

# Verify service account has correct role
gcloud projects get-iam-policy my-e2e-healing \
  --flatten="bindings[].members" \
  --filter="bindings.members:*e2e-healer*"
```

### Error: "UNAVAILABLE: Vertex AI API not enabled"

**Fix**: Enable the API:
```bash
gcloud services enable aiplatform.googleapis.com
```

### Error: "Test failed before healing started"

**Fix**: Ensure backend and frontend are running:
```bash
# Terminal 1
curl http://localhost:5000/api/movies

# Terminal 2
curl http://localhost:3000
```

### Error: "Low confidence — healing not applied"

This is expected! Low-confidence fixes require manual review:
```bash
npm run audit:review
# Look for PENDING_APPROVAL status
```

## Next Steps

### 1. Writing Testable Code
- Add `data-testid` attributes to critical elements
- Use semantic selectors (role, label, text)
- Avoid hard-coded coordinates and timeouts

### 2. CI/CD Integration
- Add healing webhook trigger on test failure
- Store audit logs in artifact storage
- Set up approval workflow for pending fixes

### 3. Monitor Success Rate
- Track healing success over time
- Adjust confidence threshold based on false positive rate
- Refine prompt templates for better accuracy

### 4. Secure Credentials
- Never commit `.env` or `secrets/`
- Use GitHub Secrets or equivalent for CI/CD
- Rotate service account keys regularly

## Getting Help

**Check logs**:
```bash
tail -f artifacts/heal-errors.log
cat artifacts/heal-audit.jsonl | jq .
```

**Validate environment**:
```bash
npm run validate:env
```

**Review test code**:
```bash
# Find failing test
grep -r "element not found" test-results/

# Check test file
cat tests/failing-test.spec.ts
```

---

**Status**: ✅ Setup complete!

Next: Run `npm test` to execute tests, or `npm run heal:watch` for auto-healing mode.
