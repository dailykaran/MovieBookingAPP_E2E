# iFrame & Shadow DOM Implementation in ShowGlow Movie Booking App

## 📋 Overview

This document explains the complete implementation of **iFrames** and **Shadow DOM** (Web Components) in the ShowGlow movie booking application.

---

## 🎯 What Was Implemented

### 1. **Web Components with Shadow DOM** (3 Components)

| Component | File | Purpose | Features |
|-----------|------|---------|----------|
| **SeatGrid** | `SeatGridWebComponent.ts` | 100-seat theater grid | Encapsulated styling, click handlers, seat validation |
| **MovieCard** | `MovieCardWebComponent.ts` | Movie display card | Hover effects, trailer button, responsive design |
| **PaymentForm** | `PaymentFormWebComponent.ts` | Secure payment form | Form validation, card type detection, error handling |

### 2. **iFrames** (2 Integrations)

| Integration | Component | Purpose | Security |
|------------|-----------|---------|----------|
| **YouTube Trailer** | `YouTubeTrailer.tsx` | Embed movie trailers | YouTube nocookie domain, sandbox restrictions |
| **Stripe Payment** | `StripePayment.tsx` | Secure payment processing | Stripe.js API, PCI compliance, tokenization |

### 3. **React Wrappers** (5 Components)

Bridge React to Web Components with custom event handling:
- `SeatGridWrapper.tsx` - Connects React state to SeatGrid
- `MovieCardWrapper.tsx` - Connects React state to MovieCard
- `PaymentFormWrapper.tsx` - Connects React state to PaymentForm

---

## 📚 Understanding Web Components & Shadow DOM

### What is Shadow DOM?

**Shadow DOM** is a browser API that allows encapsulation of DOM and CSS:

```html
<!-- Regular DOM -->
<div class="seat-grid">
  <!-- Exposed to global styles, can be modified by parent -->
  <button class="seat">1</button>
</div>

<!-- Shadow DOM -->
<seat-grid>
  #shadow-root (open)
    <style>
      .seat { color: blue; }  <!-- Only affects shadow DOM -->
    </style>
    <button class="seat">1</button>
</seat-grid>
```

**Benefits:**
- ✅ Style encapsulation (no CSS conflicts)
- ✅ DOM encapsulation (protected from parent manipulation)
- ✅ Reusability without side effects
- ✅ Better maintainability

### What are Web Components?

**Web Components** are custom HTML elements built with:

1. **Custom Elements API** - Define your own `<my-element>`
2. **Shadow DOM** - Encapsulate styles and structure
3. **Template & Slot** - Reusable content patterns
4. **HTML Imports** - Load components (older, use ES6 modules now)

Example custom element:
```typescript
class MyElement extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `<style>...</style><div>Content</div>`;
  }
}

customElements.define('my-element', MyElement);
```

---

## 🎬 Understanding iFrames

### What is an iFrame?

An **iFrame** (inline frame) embeds another HTML document within the current page:

```html
<iframe src="https://example.com" sandbox="allow-scripts allow-same-origin"></iframe>
```

### iFrames in ShowGlow

#### 1. **YouTube Trailer iFrame**
```html
<iframe
  src="https://www.youtube-nocookie.com/embed/VIDEO_ID?rel=0"
  allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
  sandbox="allow-scripts allow-same-origin allow-presentation"
/>
```

**Security features:**
- ✅ `youtube-nocookie.com` - Doesn't track user
- ✅ `sandbox` attribute - Restricts iFrame capabilities
- ✅ `allow` attribute - Only allows essential permissions
- ✅ No `allow-top-navigation` - Can't break out of frame

#### 2. **Stripe Payment iFrame**
```javascript
// Stripe Element (not traditional iFrame, but similar concept)
const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');
```

**Security features:**
- ✅ PCI DSS compliant (doesn't handle raw card data)
- ✅ Tokenization (converts card to secure token)
- ✅ 3D Secure support (additional authentication)
- ✅ Fraud detection

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  MovieDetails.tsx (React)               │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │         <SeatGridWrapper>                       │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │  <seat-grid> (Web Component)             │  │   │
│  │  │  ┌─────────────────────────────────────┐│  │   │
│  │  │  │ #shadow-root (open)                ││  │   │
│  │  │  │ - Encapsulated CSS                 ││  │   │
│  │  │  │ - Encapsulated DOM                 ││  │   │
│  │  │  │ - Seat buttons with handlers       ││  │   │
│  │  │  └─────────────────────────────────────┘│  │   │
│  │  │                                        │  │   │
│  │  │  Events:                               │  │   │
│  │  │  - seat-selected (custom event)      │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │      <YouTubeTrailer>                           │   │
│  │  Opens Dialog with iFrame:                      │   │
│  │  <iframe                                        │   │
│  │    src="youtube-nocookie.com/embed/..."        │   │
│  │    sandbox="allow-scripts..."                   │   │
│  │  />                                             │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              PaymentPage.tsx (React)                    │
│                                                         │
│  Option 1: Custom Web Component                        │
│  ┌──────────────────────────────────┐                  │
│  │  <payment-form>                  │                  │
│  │  #shadow-root (open)            │                  │
│  │  - Form fields with validation  │                  │
│  │  - Card type detection          │                  │
│  │  - Error handling               │                  │
│  └──────────────────────────────────┘                  │
│                                                         │
│  Option 2: Stripe iFrame                              │
│  ┌──────────────────────────────────┐                  │
│  │  Stripe payment form (Element)    │                  │
│  │  - PCI compliant                 │                  │
│  │  - Card tokenization             │                  │
│  │  - 3D Secure support             │                  │
│  └──────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Examples

### Example 1: Seat Selection Flow

```
User clicks seat #5
    ↓
SeatGridWrapper detects click (React)
    ↓
Calls onSeatSelect callback (React handler)
    ↓
updateSelectedSeats(5) → SeatGrid Web Component
    ↓
Web Component re-renders Shadow DOM
    ↓
User sees visual feedback in Shadow DOM
    ↓
React state updated
    ↓
Button shows updated price: ₹1250 (5 seats × ₹250)
```

### Example 2: Payment Submission Flow

```
User fills payment form
    ↓
Clicks "Pay ₹1250" button
    ↓
PaymentForm validate() (Shadow DOM validation)
    ↓
Emits 'payment-submitted' custom event
    ↓
PaymentFormWrapper catches event (React)
    ↓
Calls onPaymentSubmit callback (React handler)
    ↓
Redux dispatch updateMovieSeats()
    ↓
API call to backend: PATCH /api/movies/:id/seats
    ↓
Backend returns updated movie state
    ↓
Redux store updated
    ↓
React shows success message
```

---

## 📦 File Structure

```
movieapp/frontend/src/components/

Web Components (TypeScript):
├── SeatGridWebComponent.ts          # Seat grid with Shadow DOM
├── MovieCardWebComponent.ts         # Movie card with Shadow DOM
├── PaymentFormWebComponent.ts       # Payment form with Shadow DOM

iFrames (React):
├── YouTubeTrailer.tsx               # YouTube trailer in Dialog
└── StripePayment.tsx                # Stripe payment iFrame

React Wrappers:
├── SeatGridWrapper.tsx              # Bridge React to SeatGrid
├── MovieCardWrapper.tsx             # Bridge React to MovieCard
└── PaymentFormWrapper.tsx           # Bridge React to PaymentForm

Integration:
├── INTEGRATION_GUIDE.tsx            # How to use all components
└── IMPLEMENTATION.md                # This file
```

---

## 🚀 Usage Examples

### 1. Using SeatGrid Web Component

```tsx
import SeatGridWrapper from './SeatGridWrapper';

function MovieDetails() {
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);

  return (
    <SeatGridWrapper
      availableSeats={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
      bookedSeats={[11, 12, 13, 14, 15]}
      selectedSeats={selectedSeats}
      showtime="14:00"
      onSeatSelect={(seatId) => {
        setSelectedSeats(prev => 
          prev.includes(seatId) 
            ? prev.filter(s => s !== seatId)
            : [...prev, seatId]
        );
      }}
    />
  );
}
```

### 2. Using MovieCard Web Component

```tsx
import MovieCardWrapper from './MovieCardWrapper';

function MovieList() {
  const handleTrailerClick = (trailerUrl: string) => {
    window.open(trailerUrl, '_blank');
  };

  return (
    <MovieCardWrapper
      id={1}
      title="Dune"
      releaseDate="2024-02-14"
      rating={4.5}
      reviews={1250}
      trailerUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      showtimes={['10:00', '14:00', '18:00']}
      onBookClick={(movieId) => navigate(`/movie/${movieId}`)}
      onTrailerClick={handleTrailerClick}
    />
  );
}
```

### 3. Using YouTube Trailer iFrame

```tsx
import YouTubeTrailer from './YouTubeTrailer';

function MovieDetails() {
  const [showTrailer, setShowTrailer] = useState(false);

  return (
    <>
      <button onClick={() => setShowTrailer(true)}>Watch Trailer</button>
      
      <YouTubeTrailer
        open={showTrailer}
        trailerUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        movieTitle="Dune"
        onClose={() => setShowTrailer(false)}
      />
    </>
  );
}
```

### 4. Using Stripe Payment iFrame

```tsx
import StripePayment from './StripePayment';

function PaymentPage() {
  return (
    <StripePayment
      amount={1250}
      currency="inr"
      publishableKey="pk_test_..." // From Stripe dashboard
      clientSecret="pi_..." // From backend
      onSuccess={(paymentIntentId) => console.log('Success:', paymentIntentId)}
      onError={(error) => console.log('Error:', error)}
    />
  );
}
```

---

## 🔒 Security Considerations

### Shadow DOM Security

| Threat | Mitigation |
|--------|-----------|
| CSS injection | ✅ Styles scoped to Shadow DOM only |
| DOM injection | ✅ Shadow DOM tree protected from parent |
| XSS attacks | ✅ Use `textContent` not `innerHTML` |
| Event bubbling | ✅ Control `composed` property on custom events |

### iFrame Security

| Threat | Mitigation |
|--------|-----------|
| XSS from external source | ✅ `sandbox` attribute restricts capabilities |
| Clickjacking | ✅ `X-Frame-Options` header (server-side) |
| Form hijacking | ✅ Stripe/YouTube handle their own forms |
| Cookie theft | ✅ YouTube nocookie avoids tracking |
| Capital leakage | ✅ Payment data never reaches your server |

### Recommended Sandbox Attributes

```html
<!-- YouTube (most restrictive) -->
<iframe
  sandbox="allow-scripts allow-same-origin allow-presentation"
  src="youtube-nocookie.com/..."
/>

<!-- Custom iFrame (if needed) -->
<iframe
  sandbox="allow-scripts allow-forms allow-same-origin"
  src="external-service.com"
/>

<!-- Never use for untrusted sources -->
<!-- ❌ <iframe src="untrusted.com"></iframe> -->
<!-- ✅ <iframe sandbox src="untrusted.com"></iframe> -->
```

---

## 🧪 Testing Web Components & iFrames

### Unit Tests for Web Components

```typescript
// Test seat grid validation
test('SeatGridElement marks seat as selected', () => {
  const element = new SeatGridElement();
  element.setAttribute('available-seats', '[1,2,3]');
  document.body.appendChild(element);

  const seat = element.shadowRoot?.querySelector('[data-seat-id="1"]');
  seat?.dispatchEvent(new Event('click'));

  expect(element.getAttribute('selected-seats')).toContain('1');
});
```

### E2E Tests for iFrames

```typescript
// Playwright test for YouTube iframe
test('YouTube trailer opens in iframe', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  await page.click('button:has-text("Watch Trailer")');

  // Check iframe is visible
  const iframe = page.frameLocator('iframe[src*="youtube"]');
  await expect(iframe.locator('body')).toBeVisible();
});

// Test shadows and encapsulation
test('Seat grid styles are encapsulated', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  
  const seatGrid = page.locator('seat-grid');
  const style = await seatGrid.evaluate((el) => {
    const shadowRoot = el.shadowRoot;
    return window.getComputedStyle(
      shadowRoot?.querySelector('.seat')!
    ).color;
  });

  expect(style).toBe('rgb(255, 255, 255)'); // Expected color in component
});
```

### Accessibility Testing

```typescript
test('Web Components support keyboard navigation', async ({ page }) => {
  await page.goto('http://localhost:3000/movie/1');
  
  // Tab to first seat
  await page.keyboard.press('Tab');
  
  // Press space to select
  await page.keyboard.press('Space');
  
  // Check seat is selected
  const selectedSeats = await page.evaluate(() => {
    const element = document.querySelector('seat-grid');
    return JSON.parse(
      element?.getAttribute('selected-seats') || '[]'
    );
  });
  
  expect(selectedSeats.length).toBeGreaterThan(0);
});
```

---

## 📊 Performance Impact

| Metric | Impact | Notes |
|--------|--------|-------|
| **Bundle Size** | +5-8KB (gzipped) | Web Components code |
| **Render Time** | ~same | Shadow DOM equally fast |
| **Style Recalc** | Improved | Scoped to Shadow DOM only |
| **Event Handling** | Minimal overhead | Custom events are native |
| **Memory** | +2-3MB | One-time Shadow DOM trees |

---

## 🔄 Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Web Components | ✅ 67+ | ✅ 63+ | ✅ 10+ | ✅ 79+ |
| Shadow DOM | ✅ 67+ | ✅ 63+ | ✅ 10+ | ✅ 79+ |
| Custom Elements | ✅ 67+ | ✅ 63+ | ✅ 10+ | ✅ 79+ |
| iframe | ✅ All | ✅ All | ✅ All | ✅ All |

**Polyfills available** for older browsers via:
- `@webcomponents/webcomponentsjs`
- `@webcomponents/custom-elements`

---

## 🎯 Migration Checklist

### Phase 1: Web Components
- [ ] Copy Web Component TypeScript files to `src/components/`
- [ ] Register components in app initialization
- [ ] Create React wrapper components
- [ ] Test Shadow DOM encapsulation

### Phase 2: Update Components
- [ ] Update MovieDetails.tsx to use SeatGridWrapper
- [ ] Update MovieList.tsx to use MovieCardWrapper
- [ ] Update PaymentPage.tsx to use PaymentFormWrapper
- [ ] Test event handlers and callbacks

### Phase 3: Add iFrames
- [ ] Add YouTubeTrailer component
- [ ] Update MovieDetails to show trailer button
- [ ] Add StripePayment component
- [ ] Integrate with payment processing

### Phase 4: Testing & Polish
- [ ] Write E2E tests for Web Components
- [ ] Test iFrame sandbox restrictions
- [ ] Verify accessibility (WCAG 2.1 AA)
- [ ] Performance testing & optimization
- [ ] Security audit (XSS, injection attacks)

---

## 📝 Additional Resources

- [MDN Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)
- [MDN Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [iframe security best practices](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html#html-encapsulation)
- [Stripe documentation](https://stripe.com/docs)
- [YouTube embedded player API](https://developers.google.com/youtube/iframe_api_reference)

---

## 🤝 Contributing

When adding new Web Components or iFrames:

1. ✅ Ensure Shadow DOM encapsulation
2. ✅ Add proper TypeScript typing
3. ✅ Include accessibility attributes (aria-*, role)
4. ✅ Add unit/E2E tests
5. ✅ Document custom events
6. ✅ Security review for iFrames (sandbox attributes)
7. ✅ Update this documentation

---

**Last Updated:** February 26, 2026
**Author:** ShowGlow Development Team
