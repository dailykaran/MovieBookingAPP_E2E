// src/security/secret-scanner.js

const SECRET_PATTERNS = [
  { type: 'AWS_KEY', pattern: /AKIA[0-9A-Z]{16}/ },
  { type: 'GCP_KEY', pattern: /AIza[0-9A-Za-z\-_]{35}/ },
  { type: 'PRIVATE_KEY', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
  { type: 'JWT', pattern: /eyJ[A-Za-z0-9+/=]{20,}\.[A-Za-z0-9+/=]{20,}/ },
  {
    type: 'GENERIC_SECRET',
    pattern: /(secret|password|passwd|token|api_?key)\s*[:=]\s*['"][^'"]{8,}/i,
  },
  { type: 'HEX_SECRET', pattern: /[0-9a-f]{32,64}/i },
];

/**
 * Scan text for potential secret/credential patterns
 */
export class SecretScanner {
  scan(text) {
    for (const { type, pattern } of SECRET_PATTERNS) {
      if (pattern.test(text)) {
        return { found: true, type };
      }
    }
    return { found: false };
  }
}
