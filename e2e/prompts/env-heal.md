# Environment & Configuration Mismatch Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Error Message
```
{{ERROR_MESSAGE}}
```

## Instructions

1. **Identify the env mismatch**:
   - **baseURL undefined**: Test config doesn't set starting URL
   - **Environment variable missing**: Test references `process.env.X` that's not set
   - **Port mismatch**: Test points to wrong server port (e.g., 3000 vs 5000)
   - **Protocol mismatch**: Test uses `http://` but app requires `https://`
   - **API endpoint wrong**: Backend URL in frontend test doesn't match actual backend

2. **Root cause**:
   - `.env` file not loaded or not in test environment
   - Test runs with wrong NODE_ENV (dev vs test vs prod)
   - CI/CD overrides local environment variables
   - Docker container paths differ from host paths

3. **Suggested fixes**:
   - **Set baseURL**: `npx playwright test --base-url=http://localhost:3000`
   - **Load .env**: Use `dotenv` in test setup to load `process.env.*`
   - **Use fixture**: Create Playwright fixture for dynamic URL
   - **Update playwright.config.ts**: Set `webServer` or `baseURL` property
   - **CI/CD config**: Ensure GitHub Actions / Jenkins sets correct env vars

4. **Example fixture approach**:

```typescript
// fixtures/urls.ts
export const config = {
  baseUrl: process.env.TEST_BASE_URL || 'http://localhost:3000',
  apiUrl: process.env.API_URL || 'http://localhost:5000/api',
};

// In test:
const { page } = test;
await page.goto(config.baseUrl);
const response = await page.request.get(config.apiUrl + '/movies');
```

## Confidence Scoring

- 0.95+: Error message explicitly mentions missing env var
- 0.85–0.94: baseURL clearly not set or wrong port
- 0.70–0.84: Likely env issue; could also be network
- 0.50–0.69: Might be env or might be app config
- <0.50: Complex configuration → requiresApproval = true
