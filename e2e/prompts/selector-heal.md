# Selector Healing Context

## Failed Test Snippet
```
{{FAILED_TEST_CODE}}
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

1. **Analyze the DOM snapshot** to find alternative selectors for the failing element.
2. **Priority order** for new selectors:
   - `data-testid="..."` (most stable)
   - `aria-label="..."`
   - Playwright role selectors: `page.getByRole('button', { name: '...' })`
   - CSS class-based selectors (beware brittle)
   - XPath only as last resort
3. **Return ONLY the JSON schema** defined in the system prompt.
4. **If multiple candidates exist**, list them in `preventionHints` ranked by stability.
5. **DO NOT suggest selectors** based on:
   - Dynamic IDs (GUIDs, timestamps)
   - Index-based selectors (nth-child)
   - Hard-coded coordinates
   - Animation classes that change on hover

## Common Patterns to Look For

- `<button data-testid="submit-btn">` → Use `data-testid="submit-btn"`
- `<input aria-label="Email">` → Use `aria-label="Email"`
- `<h1>Title</h1>` → Use `getByRole('heading', { level: 1, name: 'Title' })`
- `<div class="btn btn-primary">Click</div>` → Use `getByRole('button')` if clickable

## Confidence Scoring

- 0.95+: data-testid or aria-label found
- 0.85–0.94: Role selector with exact name match
- 0.70–0.84: CSS class selector (stable, unlikely to change)
- 0.50–0.69: Fallback selector or index-based approach
- <0.50: No viable selector found → requiresApproval = true
