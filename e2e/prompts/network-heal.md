# Network Fault Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Error Message
```
{{ERROR_MESSAGE}}
```

## Network Request Log
```
{{NETWORK_LOG}}
```

## Instructions

1. **Classify the network error**:
   - **Connection refused**: Backend service not running or port mismatch
   - **Timeout**: API call takes too long
   - **5xx error**: Server-side error (500, 502, 503, 504)
   - **4xx error**: Client request malformed or unauthorized (400, 401, 403, 404)
   - **CORS error**: Cross-origin request blocked
   - **DNS failure**: Domain name not resolving

2. **Suggest appropriate fix**:
   - **Connection refused**: Check backend is running; verify URL/port in test config
   - **Timeout**: Increase timeout or add `waitForResponse()` pattern
   - **5xx errors**: May need mock/stub; escalate to backend team
   - **4xx errors**: Fix request payload or authentication
   - **CORS**: Check server CORS headers
   - **DNS**: Verify test `baseURL` environment variable

3. **Consider network stubbing**:
   - For flaky external APIs, add Playwright route stub
   - Example: `page.route('**/api/external/**', route => route.abort('failed'))`
   - Or mock: `page.route('**/api/search', fixture.json({ results: [...] }))`

4. **Return JSON schema** with retry strategy.

## Network Stub Example

```typescript
// Stub a failing API endpoint
await page.route('**/api/payment/process', route => {
  route.abort('failed');  // or route.continue() with mock data
});

// Replace with mock response
await page.route('**/api/movies/**', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ movies: [...] })
  });
});
```

## Confidence Scoring

- 0.95+: Clear error code with obvious fix (e.g., wrong URL port)
- 0.85–0.94: Network timeout; increasing wait time likely fixes it
- 0.70–0.84: Server error; needs investigation or mock
- 0.50–0.69: Flaky network; requires retry logic
- <0.50: Complex network issue → requiresApproval = true
