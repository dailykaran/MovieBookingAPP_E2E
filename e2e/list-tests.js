#!/usr/bin/env node
/**
 * List all available tests in the e2e/tests directory
 * Usage: node list-tests.js
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const testsDir = './tests';

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║           📋 AVAILABLE E2E TESTS                          ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

try {
  const files = readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));
  
  if (files.length === 0) {
    console.log('❌ No test files found in ./tests/\n');
    process.exit(0);
  }

  let totalTests = 0;

  files.forEach(file => {
    const filePath = join(testsDir, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Match test() declarations
    const testMatches = content.match(/test\(['"`]([^'"`]+)['"`]/g);
    
    if (testMatches && testMatches.length > 0) {
      console.log(`📄 ${file}`);
      console.log('   ─────────────────────────────────────────────');
      
      testMatches.forEach((match, idx) => {
        // Extract test name from match
        const testName = match.match(/test\(['"`]([^'"`]+)['"`]/)[1];
        console.log(`   ${idx + 1}. "${testName}"`);
        totalTests++;
      });
      
      console.log('');
    }
  });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║                       Total: ${totalTests} tests`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('✅ HOW TO USE THESE TESTS:\n');
  console.log('Run healing for a specific test:\n');
  console.log('   npm run heal:manual -- --testFile tests/<FILE> --testName "<NAME>"\n');
  console.log('Example:\n');
  console.log('   npm run heal:manual -- --testFile tests/HomePage.spec.ts --testName "verify app loads"\n');

} catch (err) {
  console.error('❌ Error reading test files:', err.message);
  process.exit(1);
}
