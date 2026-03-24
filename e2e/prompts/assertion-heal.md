# Assertion Drift Healing Context

⚠️ **ASSERTION CHANGES ALWAYS REQUIRE HUMAN APPROVAL.**
Set `requiresApproval: true` unconditionally for this failure class.

## Failed Assertion
```
{{FAILED_ASSERTION_CODE}}
```

## Expected Value
`{{EXPECTED_VALUE}}`

## Actual Value Observed
`{{ACTUAL_VALUE}}`

## Test File
{{TEST_FILE}}

## Test Name
{{TEST_NAME}}

## Instructions

1. **Determine the root cause**:
   - **Legitimate product change**: Feature was updated, expected value changed
   - **Test regression**: Test is wrong, app behavior is correct
   - **Environment mismatch**: Different data in dev vs test environment
   - **Timing issue**: Value hasn't updated yet when assertion runs

2. **If product change confirmed**:
   - Update the assertion to match new expected value
   - Include changelog reference in explanation
   - Set `requiresApproval: true` (human review required)
   - Set confidence HIGH (0.90+) if changelog confirms change

3. **If regression suspected**:
   - Flag as potential bug in application
   - DO NOT auto-fix; set `requiresApproval: true`
   - Include both old and new values in explanation
   - Suggest investigating the app code

4. **Always include**:
   - Plain English explanation of what changed and why
   - Evidence from changelog or code review
   - Risk assessment if auto-fixing

5. **NEVER auto-apply assertion changes** without human approval.

## Response Template

```json
{
  "failureClass": "ASSERTION_DRIFT",
  "confidence": 0.85,
  "requiresApproval": true,
  "explanation": "Test expected 'Login successful' but got 'Welcome back'. Changelog shows UI copy update in v2.1.0. Recommend manually verifying copy matches design specs, then updating assertion.",
  "patches": [
    {
      "file": "{{TEST_FILE}}",
      "lineStart": 9,
      "lineEnd": 9,
      "original": "expect(await pageCount).toEqual(999); // Intentionally wrong to trigger healing",
      "replacement": "expect(await pageCount).toEqual(8); // Intentionally wrong to trigger healing",
      "patchType": "ASSERTION"
    }
  ],
  "retryStrategy": { ... },
  "preventionHints": [
    "Use data attributes for assertions instead of user-facing text",
    "Centralize expected values in a config file",
    "Add changelog review step to QA checklist"
  ]
}
```
