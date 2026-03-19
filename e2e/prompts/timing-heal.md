# Timing & Flakiness Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Error Type: {{ERROR_TYPE}}
## Timeout Value Used: {{TIMEOUT_MS}}ms

## Network Request Log (last 10 entries)
```
{{NETWORK_LOG}}
```

## Instructions

1. **Identify the failure type**:
   - **Eager assertion**: Test checks element before it renders
   - **Animation delay**: CSS transitions completing too slowly
   - **API latency**: Network request takes longer than expected
   - **Hydration delay**: Server-side rendering not complete
   - **Resource loading**: Image, script, stylesheet not loaded

2. **Suggest minimum wait strategy**:
   - `page.waitForSelector(sel, { timeout: N })`
   - `page.waitForLoadState('networkidle')`
   - `page.waitForResponse(response => response.url().includes('/api/...'))`
   - `expect(locator).toBeVisible({ timeout: N })`
   - Playwright `eventually` assertion pattern

3. **NEVER use `page.waitForTimeout(ms)`** (hard sleep) unless:
   - Timeout > 5000ms AND
   - Justified (e.g., animation must complete)

4. **Return JSON schema** as defined in system prompt.

## Timeout Adjustment Guidelines

| Current Timeout | Observation | Recommended Action |
|---|---|---|
| < 5000ms | Network request log shows API latency | Increase to 8000–10000ms |
| 5000–10000ms | CSS animation observed in DOM | Increase to 12000–15000ms |
| > 10000ms | Already excessive | Review test logic; may indicate deeper issue |

## Confidence Scoring

- 0.95+: Network log shows clear API call completing just before timeout
- 0.85–0.94: Consistent animation delay observed
- 0.70–0.84: Timeout increase with no root cause clear
- 0.50–0.69: Multiple possible causes; requires investigation
- <0.50: Problem may not be timing → requiresApproval = true
