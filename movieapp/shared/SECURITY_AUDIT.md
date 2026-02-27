# ShowGlow Movie Booking - Security Audit Report
**Date**: February 26, 2026  
**Status**: Educational Application (Not Production-Ready)

---

## Executive Summary
**Overall Risk Level**: MEDIUM (Acceptable for educational demo, not for production)

The ShowGlow application demonstrates several security best practices alongside areas requiring hardening for production deployment. This audit covers:
- iFrame security (YouTube, Stripe)
- CORS configuration
- Input validation & output encoding
- XSS prevention
- Web Component security
- API security
- Package dependencies

---

## 1. CRITICAL FINDINGS

### 1.1 🔴 CORS Configuration Is Too Permissive
**Location**: `movieapp/backend/src/index.ts`  
**Severity**: HIGH  
**Issue**: 
```typescript
app.use(cors());  // ❌ Allows requests from ANY origin
```

**Risk**: 
- Any malicious website can make requests to your API
- No protection against CSRF attacks
- Exposes to cross-origin data leakage

**Recommendation**: 
```typescript
app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
```

---

### 1.2 🔴 Missing Input Validation for Seat Numbers
**Location**: `movieapp/backend/src/controllers/movieController.ts::updateMovieSeats`  
**Severity**: HIGH  
**Issue**: 
- No validation that seat numbers are between 1-100
- No validation that showtime string format is correct
- No check for duplicate seat IDs in request

**Risk**: 
- Allows booking invalid seats (seat 500, -1, etc.)
- Database records become inconsistent
- Potential denial of service through malformed requests

**Recommendation**: Add validation:
```typescript
// Validate each seat number
if (!seats.some((s: number) => s >= 1 && s <= 100)) {
  return res.status(400).json({ message: 'Seat numbers must be between 1-100' });
}

// Validate showtime format (HH:MM)
if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(showtime)) {
  return res.status(400).json({ message: 'Invalid showtime format' });
}
```

---

### 1.3 🟡 No Request Input Size Limits
**Location**: `movieapp/backend/src/index.ts`  
**Severity**: MEDIUM  
**Issue**: 
```typescript
app.use(express.json());  // ❌ No size limit specified
```

**Risk**: 
- Large payload attacks (DoS)
- Memory exhaustion
- Slowloris-style attacks

**Recommendation**:
```typescript
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ limit: '10kb' }));
```

---

## 2. HIGH PRIORITY FINDINGS

### 2.1 🔴 Missing Security Headers
**Location**: `movieapp/backend/src/index.ts`  
**Severity**: HIGH  
**Issue**: No helmet.js or security headers configured  
**Risk**: Vulnerable to various header-based attacks

**Recommendation**: Install and use helmet.js:
```bash
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    frameSrc: ["'self'", "https://www.youtube-nocookie.com", "https://js.stripe.com"],
    imgSrc: ["'self'", "data:", "https:"]
  }
}));
```

---

### 2.2 🟡 No Rate Limiting
**Location**: `movieapp/backend/src/index.ts`  
**Severity**: MEDIUM  
**Issue**: No rate limiting on API endpoints  
**Risk**: Brute force attacks, DoS protection absent

**Recommendation**:
```bash
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
```

---

### 2.3 🟡 Missing Content Security Policy (CSP)
**Location**: `movieapp/frontend/public/index.html`  
**Severity**: MEDIUM  
**Issue**: No CSP meta tag configured  
**Risk**: XSS attacks more likely to succeed

**Recommendation**: Add to `<head>`:
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://js.stripe.com;
               frame-src 'self' https://www.youtube-nocookie.com https://js.stripe.com;
               img-src 'self' data: https:;">
```

---

## 3. MEDIUM PRIORITY FINDINGS

### 3.1 🟡 Unused Security Packages
**Location**: `movieapp/backend/package.json`  
**Severity**: LOW  
**Issue**: 
- bcrypt (version 6.0.0) installed but not used
- jsonwebtoken (9.0.2) installed but not used
- Increases supply chain risk

**Recommendation**: Remove unused packages if authentication not implemented:
```bash
npm uninstall bcrypt jsonwebtoken
```

---

### 3.2 🟡 Error Messages May Leak Information
**Location**: `movieapp/backend/src/controllers/movieController.ts`  
**Severity**: LOW  
**Issue**: Generic error messages good, but stack traces could leak in production

**Recommendation**: Ensure NODE_ENV is set to 'production' in production:
```typescript
if (process.env.NODE_ENV !== 'production') {
  console.error(error);
}
```

---

## 4. SECURITY BEST PRACTICES OBSERVED ✅

### 4.1 ✅ YouTube iFrame Sandbox Configuration
**Location**: `movieapp/frontend/src/components/YouTubeTrailer.tsx`  
**Status**: EXCELLENT

```typescript
sandbox="allow-accelerometer allow-autoplay allow-clipboard-write 
         allow-encrypted-media allow-gyroscope allow-picture-in-picture 
         allow-same-origin"
```

**Why Good**:
- Uses youtube-nocookie.com (no tracking cookies)
- Restrictive sandbox attributes
- Disables scripts, forms, popups, plugins
- Proper `rel=0` parameter (hides related videos)
- Allows only necessary features

---

### 4.2 ✅ Stripe Integration Security
**Location**: `movieapp/frontend/src/components/StripePayment.tsx`  
**Status**: GOOD

**Why Good**:
- Loads Stripe.js from official CDN (https://js.stripe.com/v3/)
- Uses Stripe's official payment methods (no raw card data handling)
- confirmCardPayment handles sensitive data securely
- Never stores card numbers in application

---

### 4.3 ✅ HTML Output Encoding in Web Components
**Location**: `movieapp/frontend/src/components/MovieCardWebComponent.ts`  
**Status**: EXCELLENT

```typescript
private escapeHTML(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}
```

**Why Good**:
- Prevents XSS attacks through movie titles
- All user-controlled data escaped before rendering

---

### 4.4 ✅ Input Validation - Seat Arrays
**Location**: `movieapp/backend/src/controllers/movieController.ts::updateMovieSeats`  
**Status**: GOOD (Partial)

```typescript
if (!Array.isArray(seats)) {
  return res.status(400).json({ message: 'Seats must be an array' });
}
```

**Why Good**: Validates request body shape
**Needs Improvement**: Add seat number range validation (1-100)

---

### 4.5 ✅ React Component Props Typing
**Location**: Multiple React components  
**Status**: GOOD

All components use TypeScript interfaces for props, preventing accidental type mismatches.

---

### 4.6 ✅ Shadow DOM Encapsulation
**Location**: `movieapp/frontend/src/components/*WebComponent.ts`  
**Status**: GOOD

Web Components use Shadow DOM which:
- Prevents CSS injection
- Isolates component styles
- Protects internal DOM structure

---

## 5. RECOMMENDATIONS BY PRIORITY

### 🔴 CRITICAL (Fix Before Production)
1. **Restrict CORS origins** → Specify explicit allowed origins
2. **Add seat number validation** → Enforce 1-100 range
3. **Add security headers** → Install helmet.js and configure CSP
4. **Add request size limits** → Set express.json limit

### 🟡 HIGH (Before Public Deployment)
1. **Add rate limiting** → Prevent brute force/DoS
2. **Add CSP meta tag** → Strengthen XSS protection
3. **Add HTTPS** → Encrypt all traffic
4. **Add logging/monitoring** → Track suspicious activity

### 🟢 MEDIUM (Nice to Have)
1. **Remove unused packages** → Reduce supply chain risk
2. **Add request validation middleware** → Centralized input checks
3. **Add HTTPS redirects** → Force secure connections
4. **Add security.txt** → Standard security contact info

---

## 6. IMPLEMENTATION CHECKLIST

### Backend Security Enhancements
- [ ] Configure CORS with allowed origins
- [ ] Add helmet.js for security headers
- [ ] Add express-rate-limit
- [ ] Add input validation for seat numbers
- [ ] Add request body size limits
- [ ] Add joi/express-validator for request validation
- [ ] Add request logging (morgan)
- [ ] Set NODE_ENV=production for prod
- [ ] Remove unused security packages OR implement authentication

### Frontend Security Enhancements
- [ ] Add CSP meta tag to index.html
- [ ] Add HTTPS-only mode
- [ ] Add X-Frame-Options to prevent clickjacking
- [ ] Remove console.error from production builds
- [ ] Add security.txt file

### Infrastructure Security
- [ ] Deploy on HTTPS only
- [ ] Set secure environment variables
- [ ] Enable HSTS headers
- [ ] Configure firewall rules
- [ ] Set up rate limiting at CDN level

---

## 7. COMPLIANCE & STANDARDS

### Applicable Standards
- **OWASP Top 10**: A01:2021 – Broken Access Control, A03:2021 – Injection
- **CWE**: CWE-79 (XSS), CWE-89 (SQL Injection), CWE-352 (CSRF)
- **HTTP Security Headers**: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection

### Current Compliance
- ✅ XSS Protection: Partial (HTML escaping present, CSP missing)
- ⚠️ CSRF Protection: Missing (No token validation)
- ✅ Injection Protection: Good (Parameterized queries for file I/O)
- ⚠️ Access Control: Missing (No authentication)

---

## 8. CONCLUSION

ShowGlow demonstrates **solid foundational security practices** for an educational application:
- ✅ Web Components with Shadow DOM encapsulation
- ✅ Proper iFrame sandboxing
- ✅ HTML output encoding
- ✅ Secure payment processing via Stripe

**Critical gaps for production**:
1. Permissive CORS configuration
2. Insufficient input validation
3. Missing security headers
4. No rate limiting

**Recommendation**: Deploy with CRITICAL fixes (#1-4 above) only in controlled environments. Add all HIGH priority items before public deployment.

---

**Generated**: February 26, 2026  
**Reviewed By**: Security Audit Agent  
**Status**: EDUCATIONAL APPLICATION - NOT PRODUCTION READY
