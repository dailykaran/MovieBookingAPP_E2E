#!/usr/bin/env node
/**
 * Verify .env File API Key Configuration
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

console.log('\n╔════════════════════════════════════════════════╗');
console.log('║   .ENV FILE API KEY CONFIGURATION CHECK        ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Check .env file
const envPath = path.resolve(process.cwd(), '.env');
console.log(`📍 Checking .env file at: ${envPath}`);
console.log(`   File exists: ${fs.existsSync(envPath) ? '✅ YES' : '❌ NO'}\n`);

// Load .env
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('✅ .env file loaded successfully\n');
} else {
  console.error('❌ .env file not found!\n');
  process.exit(1);
}

// Check API key
const apiKey = process.env.GEMINI_API_KEY;
console.log('API Key Configuration:');
console.log(`  Variable name: GEMINI_API_KEY`);
console.log(`  Is set: ${apiKey ? '✅ YES' : '❌ NO'}`);
console.log(`  Length: ${apiKey?.length || 0} characters`);
console.log(`  First 10 chars: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`);
console.log(`  Last 5 chars: ${apiKey ? '...' + apiKey.substring(apiKey.length - 5) : 'NOT SET'}\n`);

// Check other config
console.log('Other Configuration:');
console.log(`  HEALER_PROVIDER: ${process.env.HEALER_PROVIDER || 'gemini (default)'}`);
console.log(`  HEALER_MAX_RETRIES: ${process.env.HEALER_MAX_RETRIES || '3 (default)'}`);
console.log(`  HEALER_VERBOSE: ${process.env.HEALER_VERBOSE || 'false (default)'}\n`);

// Final status
if (apiKey) {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  ✅ ALL CONFIGURATIONS ARE CORRECT             ║');
  console.log('║  Ready to run: npm run heal:ts tests/test.ts   ║');
  console.log('╚════════════════════════════════════════════════╝\n');
} else {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║  ❌ MISSING REQUIRED CONFIGURATION             ║');
  console.log('║  Add GEMINI_API_KEY to .env file               ║');
  console.log('╚════════════════════════════════════════════════╝\n');
  process.exit(1);
}
