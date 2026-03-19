# 🚀 Self-Healing E2E — Deployment Checklist

Use this checklist to deploy the self-healing system to production.

## Phase 1: GCP Setup (30 minutes)

- [ ] Create GCP project
  ```bash
  gcloud projects create my-e2e-healing --name="E2E Healing Tests"
  gcloud config set project my-e2e-healing
  ```

- [ ] Enable Vertex AI API
  ```bash
  gcloud services enable aiplatform.googleapis.com
  ```

- [ ] Create service account
  ```bash
  gcloud iam service-accounts create e2e-healer --display-name="E2E Test Healer"
  ```

- [ ] Grant Vertex AI User role
  ```bash
  gcloud projects add-iam-policy-binding my-e2e-healing \
    --member="serviceAccount:e2e-healer@my-e2e-healing.iam.gserviceaccount.com" \
    --role="roles/aiplatform.user"
  ```

- [ ] Download service account key
  ```bash
  gcloud iam service-accounts keys create ./secrets/gcp-service-account.json \
    --iam-account=e2e-healer@my-e2e-healing.iam.gserviceaccount.com
  ```

- [ ] Verify key file exists and is valid
  ```bash
  cat ./secrets/gcp-service-account.json | jq .
  ```

## Phase 2: Local Setup (15 minutes)

- [ ] Copy environment template
  ```bash
  cp .env.example .env
  ```

- [ ] Edit .env with GCP project ID
  ```bash
  # Update these lines:
  GCP_PROJECT_ID=my-e2e-healing
  GOOGLE_APPLICATION_CREDENTIALS=./secrets/gcp-service-account.json
  WEBHOOK_SECRET=generate-a-random-32-char-string
  ```

- [ ] Install dependencies
  ```bash
  npm install
  npx playwright install --with-deps
  ```

- [ ] Validate environment
  ```bash
  npm run validate:env
  # Should show: ✅ All environment variables validated successfully!
  ```

## Phase 3: Local Testing (20 minutes)

- [ ] Start backend app
  ```bash
  cd movieapp/backend
  npm install
  npm run dev
  # Wait for: Server is running on port 5000
  ```

- [ ] Start frontend app (in another terminal)
  ```bash
  cd movieapp/frontend
  npm install
  npm start
  # Browser opens to http://localhost:3000
  ```

- [ ] Start healing server (in third terminal)
  ```bash
  cd e2e
  npm run start
  # Wait for: Self-Healing server ready!
  ```

- [ ] Run a test to trigger healing
  ```bash
  npm test --grep "should"
  ```

- [ ] Check audit log for healing events
  ```bash
  npm run audit:review
  ```

- [ ] Verify all three services are running
  - ✅ Backend: http://localhost:5000/api/movies
  - ✅ Frontend: http://localhost:3000
  - ✅ Healing: http://localhost:3099/health

## Phase 4: CI/CD Integration (30 minutes)

### Configuration

- [ ] Add GitHub Actions secrets (or equivalent)
  ```
  GCP_PROJECT_ID: my-e2e-healing
  GCP_SERVICE_ACCOUNT_KEY: (contents of gcp-service-account.json)
  WEBHOOK_SECRET: (your generated secret)
  HEALER_URL: http://healing-server:3099  # or your server URL
  ```

- [ ] Create CI/CD workflow file (`.github/workflows/e2e-healing.yml`)
  ```yaml
  name: E2E Tests with Healing
  on: [push, pull_request]
  
  jobs:
    test:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v3
        - uses: actions/setup-node@v3
          with:
            node-version: '20'
        
        - name: Setup GCP credentials
          run: |
            mkdir -p e2e/secrets
            echo '${{ secrets.GCP_SERVICE_ACCOUNT_KEY }}' > e2e/secrets/gcp-service-account.json
        
        - name: Install dependencies
          run: npm install --prefix e2e
        
        - name: Start healing server
          run: |
            cd e2e
            npm run start &
            sleep 5  # Wait for server to start
        
        - name: Validate environment
          run: npm run validate:env --prefix e2e
        
        - name: Run tests
          run: npm test --prefix e2e
        
        - name: Upload audit log
          if: always()
          uses: actions/upload-artifact@v3
          with:
            name: healing-audit
            path: e2e/artifacts/heal-audit.jsonl
        
        - name: Upload reports
          if: always()
          uses: actions/upload-artifact@v3
          with:
            name: test-reports
            path: e2e/reports/
  ```

- [ ] Test CI/CD workflow
  ```bash
  # Local test with act (simulate GitHub Actions)
  act -j test -s GCP_SERVICE_ACCOUNT_KEY="$(cat ./secrets/gcp-service-account.json)"
  ```

### Monitoring

- [ ] Set up log aggregation
  - Stackdriver Logging (Google Cloud)
  - Or: ELK Stack (Elasticsearch, Logstash, Kibana)
  - Or: Splunk, DataDog, etc.

- [ ] Configure alerting
  - Alert if success rate drops below 80%
  - Alert if false positive rate exceeds 5%
  - Alert on security blocks (>5 per day)

- [ ] Create dashboard
  - Track success rate over time
  - Track healing latency
  - Track failure categories (pie chart)
  - Track confidence distribution

## Phase 5: Production Hardening (1 hour)

### Security

- [ ] Review and harden security settings
  ```bash
  # In .env, set stricter defaults:
  HEAL_CONFIDENCE_THRESHOLD=0.85    # Higher = more conservative
  HEAL_ASSERTION_APPROVAL=true      # Always require approval
  HEAL_SECRET_SCAN=true             # Enable credential scanning
  HEAL_PATCH_SANDBOX=true           # Validate all patches
  HEAL_MAX_PATCH_LINES=30           # Smaller patches
  ```

- [ ] Audit file permissions
  ```bash
  # Ensure secrets directory is not world-readable
  chmod 700 e2e/secrets/
  chmod 600 e2e/secrets/gcp-service-account.json
  ```

- [ ] Rotate webhook secret
  ```bash
  # Generate strong random secret
  openssl rand -base64 32
  # Update in .env and CI/CD secrets
  ```

- [ ] Enable audit log archival
  ```bash
  # Backup audit logs daily to Cloud Storage
  gsutil cp e2e/artifacts/heal-audit.jsonl \
    gs://my-healing-backups/$(date +%Y-%m-%d).jsonl
  ```

### Monitoring & Alerts

- [ ] Set up alerting for:
  - [ ] Healing server downtime
  - [ ] GCP quota exceeded
  - [ ] High security block rate
  - [ ] Gemini API errors
  - [ ] Test failure spike (>200% normal)

- [ ] Create runbook for:
  - [ ] Healing server down
  - [ ] GCP quota exceeded
  - [ ] Webhook signature mismatch
  - [ ] False positive wave

### Performance

- [ ] Benchmark healing latency
  ```bash
  # Should be <60s from failure to healed
  npm run audit:review
  # Review "Mean time to heal" metric
  ```

- [ ] Test concurrent requests
  ```bash
  # Simulate multiple tests failing simultaneously
  # Verify server handles load without dropping requests
  ```

- [ ] Monitor resource usage
  - [ ] CPU: healing server should use <20%
  - [ ] Memory: should not exceed 500MB
  - [ ] Disk: audit log should not exceed 1GB/month

## Phase 6: Approval Workflow (30 minutes)

### Manual Approval System

- [ ] Integrate with approval tool (Slack, GitHub, etc.)
  ```bash
  # Example: Create Slack integration
  # POST to Slack when healing is pending approval
  ```

- [ ] Create approval dashboard
  - List pending healing proposals
  - Show confidence scores
  - Show diff between original and proposed fix
  - Buttons: Approve, Reject, Request Changes

- [ ] Set approval SLA
  - Critical fixes: 1 hour
  - Normal fixes: 4 hours
  - Low-priority: 24 hours

- [ ] Configure escalation
  - Auto-approve if pending >SLA
  - Notify team lead if blocked
  - Escalate security blocks to security team

## Phase 7: Monitoring & Maintenance (Ongoing)

- [ ] Daily checks
  ```bash
  npm run audit:review
  # Check: Success rate, blocked count, pending count
  ```

- [ ] Weekly review
  - [ ] Top failure categories (focus improvements here)
  - [ ] Confidence distribution
  - [ ] False positives detected
  - [ ] System errors

- [ ] Monthly reporting
  - [ ] Success rate trend
  - [ ] Cost analysis
  - [ ] Team satisfaction survey
  - [ ] Improvement recommendations

- [ ] Quarterly planning
  - [ ] Review KPIs vs targets
  - [ ] Plan prompt template improvements
  - [ ] Evaluate new failure categories
  - [ ] Budget GCP costs

## Phase 8: Scaling & Optimization

- [ ] Scale healing server
  - [ ] Load balance multiple instances
  - [ ] Use job queue (Redis, GCP Pub/Sub)
  - [ ] Implement caching for similar failures

- [ ] Optimize Gemini prompts
  - [ ] A/B test prompt variations
  - [ ] Collect feedback on healed tests
  - [ ] Improve confidence scoring

- [ ] Expand to other frameworks
  - [ ] Cypress integration
  - [ ] WebdriverIO support
  - [ ] Custom framework support

## Rollback Plan

If something goes wrong:

- [ ] Disable healing server
  ```bash
  # Stop webhook server
  kill $(lsof -ti:3099)
  ```

- [ ] Revert pending patches
  ```bash
  # Restore from backup
  cp ./artifacts/patches/*.bak <original-path>
  ```

- [ ] Roll back service account
  ```bash
  # Disable old service account key
  gcloud iam service-accounts keys list \
    --iam-account=e2e-healer@my-e2e-healing.iam.gserviceaccount.com
  
  # Delete compromised key if needed
  gcloud iam service-accounts keys delete KEY_ID \
    --iam-account=e2e-healer@my-e2e-healing.iam.gserviceaccount.com
  ```

- [ ] Manual test runs
  ```bash
  # Fall back to standard Playwright
  npm test
  ```

## Success Criteria

- ✅ All tests pass locally
- ✅ Healing server running without errors
- ✅ CI/CD pipeline green
- ✅ Audit logs created and accessible
- ✅ Approval workflow functional
- ✅ Alerts configured and tested
- ✅ Team trained on system
- ✅ Documentation updated
- ✅ Success rate >85%, false positives <5%

## Sign-Off

- [ ] Technical Lead: __________________ Date: _______
- [ ] QA Lead: __________________ Date: _______
- [ ] Security Review: __________________ Date: _______
- [ ] DevOps: __________________ Date: _______

---

**Deployment Checklist Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Ready for Deployment
