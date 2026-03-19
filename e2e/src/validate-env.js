// src/validate-env.js
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import Ajv from 'ajv';
import { createLogger, format } from 'winston';

const logger = createLogger({
  level: 'info',
  format: format.simple(),
});

const SCHEMA = JSON.parse(readFileSync('.env.schema.json', 'utf8'));
const ajv = new Ajv();

export async function validateEnvironment() {
  console.log('🔍 Validating environment variables...\n');

  const errors = [];

  // Check required env vars
  for (const required of SCHEMA.required) {
    if (!process.env[required]) {
      errors.push(`❌ Missing required: ${required}`);
    } else {
      console.log(`✓ ${required}: ${maskSensitive(required, process.env[required])}`);
    }
  }

  // Type validation
  for (const [key, type] of Object.entries(SCHEMA.types)) {
    const value = process.env[key];
    if (!value) continue;

    let isValid = true;
    switch (type) {
      case 'integer':
        isValid = Number.isInteger(parseInt(value, 10));
        break;
      case 'float':
        isValid = !isNaN(parseFloat(value));
        break;
      case 'boolean':
        isValid = ['true', 'false'].includes(value.toLowerCase());
        break;
    }

    if (!isValid) {
      errors.push(`❌ ${key} must be ${type}, got: ${value}`);
    }
  }

  // GCP credentials file check
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credsPath && !existsSync(credsPath)) {
    errors.push(`❌ GCP credentials file not found: ${credsPath}`);
  }

  if (errors.length > 0) {
    console.error('\n' + errors.join('\n'));
    process.exit(1);
  }

  console.log('\n✅ All environment variables validated successfully!');
}

function maskSensitive(key, value) {
  if (/secret|key|credential|token|password/i.test(key)) {
    return value.substring(0, 4) + '...***';
  }
  return value;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await validateEnvironment();
}
