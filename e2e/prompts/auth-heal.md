# Authentication & Session Drift Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Error Message
```
{{ERROR_MESSAGE}}
```

## DOM Snapshot
```html
{{DOM_SNAPSHOT}}
```

## Network Request Log
```
{{NETWORK_LOG}}
```

## Instructions

1. **Identify auth failure type**:
   - **Token expired**: Session/JWT no longer valid
   - **Unauthorized (401)**: Missing or invalid credentials header
   - **Forbidden (403)**: Insufficient permissions
   - **Fresh login required**: Server invalidated session
   - **CORS with credentials**: Missing `credentials: 'include'` option

2. **Root cause analysis**:
   - Check test setup: Does it log in before the failing test?
   - Verify token refresh: Is the app auto-refreshing expired tokens?
   - Check network log: Did auth endpoint return 401/403?
   - Environment mismatch: Dev auth different from test auth?

3. **Suggested fixes**:
   - **Token refresh injection**: Add `await page.goto('/refresh-token')` before assertion
   - **Re-login**: Call login function again if token expired
   - **Add credentials header**: Include `Authorization: Bearer <token>` to requests
   - **Extend token TTL**: If test runs too long, increase session timeout
   - **Mock auth**: For isolated testing, stub auth endpoints

4. **ALWAYS set requiresApproval = true** for auth changes (security-critical).

## Common Patterns

- **JWT timeout**: Tokens typically expire after 1 hour; tests may exceed this
- **Session cookies**: Auto-cleared by browser; ensure test maintains session state
- **Logout behavior**: Some tests may intentionally call logout; verify preceding test doesn't affect auth state

## Confidence Scoring

- 0.95+: Clear token expiry in logs with known TTL
- 0.85–0.94: 401/403 error detected; fix is likely token refresh
- 0.70–0.84: Might be auth, might be permission; needs investigation
- 0.50–0.69: Auth state unclear; requires test refactoring
- <0.50: Complex auth flow → requiresApproval = true
