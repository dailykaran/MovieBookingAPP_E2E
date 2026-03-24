# Selector Healing Context

## Test Information
- **File**: `{{TEST_FILE}}`
- **Test Name**: `{{TEST_NAME}}`

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
```

## Failing Line Context
```typescript
{{FAILING_LINE_CONTEXT}}
```

## Error Message
```
{{ERROR_MESSAGE}}
```

## DOM Snapshot (relevant fragment)
```html
{{DOM_SNAPSHOT}}
```

## Current Selector That Failed
`{{FAILED_SELECTOR}}`

## Instructions

1. **IMPORTANT**: When returning patches, use the EXACT test file path: `{{TEST_FILE}}`
2. **Analyze the failing line** shown above to understand what selector changed
3. **Extract correct selector** from the error message if available
4. **Priority order** for new selectors:
   - `data-testid="..."` (most stable)
   - `aria-label="..."`
   - Playwright role selectors: `page.getByRole('button', { name: '...' })`
   - CSS class-based selectors (beware brittle)
   - XPath only as last resort
5. **Return ONLY the JSON schema** defined in the system prompt.
6. **If multiple candidates exist**, list them in `preventionHints` ranked by stability.
7. **DO NOT suggest selectors** based on:
   - Dynamic IDs (GUIDs, timestamps)
   - Index-based selectors (nth-child)
   - Hard-coded coordinates
   - Animation classes that change on hover

## Common Error Patterns

- **"element not found"**: Selector changed, use alternative (data-testid, aria-label)
- **"element is not visible"**: Element exists but hidden, add wait or check visibility condition
- **"Locator: locator(...) Expected: visible"**: Selector is valid but element not visible yet

## Examples

### Pattern 1: Text-based selector changed
**Old Code**: `locator('a:has-text("Book")')`  
**New Code**: `locator('button:has-text("Book Now")')`  
→ Tag changed from `<a>` to `<button>`, text changed from "Book" to "Book Now"

### Pattern 2: Placeholder changed
**Old Code**: `locator('input[placeholder="Find movies"]')`  
**New Code**: `locator('input[placeholder="Search movies..."]')`  
→ Placeholder text updated

### Pattern 3: Use data-testid
**Alternative**: `locator('[data-testid="search-input"]')`  
→ Most stable approach if data-testid exists in DOM

## Confidence Scoring

- 0.95+: data-testid or aria-label found
- 0.85–0.94: Role selector with exact name match or exact attribute match
- 0.70–0.84: CSS class selector (stable, unlikely to change)
- 0.50–0.69: Fallback selector or index-based approach
- <0.50: No viable selector found → requiresApproval = true

