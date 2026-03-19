# Layout Shift & Visual Change Healing Context

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

## Screenshot (if available)
[Screenshot attached inline]

## Instructions

1. **Identify the layout issue**:
   - **Coordinate shift**: Element moved; hard-coded X/Y coordinates no longer valid
   - **Viewport size change**: Test runs in different browser viewport
   - **Font/spacing change**: CSS updates changed element size/position
   - **Responsive design**: Element hidden on mobile/small screens
   - **Animation timing**: Element not settled before screenshot taken

2. **Root cause**:
   - Browser window resized; element coordinates changed
   - CSS media query activated; layout reorganized
   - Responsive grid changed column count
   - Padding/margin/font-size updated in design
   - Modal/overlay shifted element position

3. **Suggested fixes** (in priority order):
   - **Use role/text selectors**: Replace coordinate-based checks with semantic selectors
   - **Set fixed viewport**: `page.setViewportSize({ width: 1280, height: 720 })`
   - **Wait for layout**: `await page.waitForLoadState('networkidle')` before visual check
   - **Update coordinates**: Recalibrate X/Y positions from latest screenshot
   - **Use `toBeVisible()`**: Replace pixel-perfect checks with visibility assertions

4. **Avoid hard-coded coordinates**:

```typescript
// ❌ BAD: Hard-coded coordinates break on layout change
await page.click(512, 340);

// ✅ GOOD: Selector-based, works across layouts
await page.click('button:has-text("Submit")');

// ❌ BAD: Pixel-perfect visual comparison
await expect(page).toHaveScreenshot('button.png');

// ✅ GOOD: Semantic assertion
await expect(page.locator('button')).toBeVisible();
```

## Confidence Scoring

- 0.95+: Clear coordinate shift; updated values obvious from screenshot
- 0.85–0.94: Layout change confirmed; fix requires selector adjustment
- 0.70–0.84: Responsive design likely cause; needs viewport-specific handling
- 0.50–0.69: Visual change unclear; may need multiple fixes
- <0.50: Complex layout system → requiresApproval = true
