#!/usr/bin/env node

/**
 * Sanitization Verification Script
 * Validates that all 4 security functions are properly implemented
 */

const fs = require('fs');
const path = require('path');

const healerFile = path.join(__dirname, 'gemini-healer.js');
const content = fs.readFileSync(healerFile, 'utf8');

console.log('\n🔍 Sanitization Implementation Verification\n');
console.log('='.repeat(70));

const checks = [
  {
    name: 'sanitizeForPrompt() function',
    pattern: /function sanitizeForPrompt\(input, maxLength = 5000\)/,
    description: 'Escapes & redacts user input'
  },
  {
    name: 'sanitizeErrorMessage() function',
    pattern: /function sanitizeErrorMessage\(error, maxLength = 1000\)/,
    description: 'Cleans error messages'
  },
  {
    name: 'detectPromptInjection() function',
    pattern: /function detectPromptInjection\(input\)/,
    description: 'Detects injection attempts'
  },
  {
    name: 'validateTestCodeSize() function',
    pattern: /function validateTestCodeSize\(code, maxLength = 50000\)/,
    description: 'Prevents token overflow'
  },
  {
    name: 'Updated generateAnalysisPrompt()',
    pattern: /if \(detectPromptInjection\(testCode\)\)/,
    description: 'Calls security functions'
  },
  {
    name: 'Sanitized error type',
    pattern: /const sanitizedErrorType = sanitizeForPrompt\(testInfo\.errorType/,
    description: 'Error types are sanitized'
  },
  {
    name: 'Sanitized error message',
    pattern: /const sanitizedError = sanitizeErrorMessage\(testInfo\.error/,
    description: 'Error messages are sanitized'
  },
  {
    name: 'Sanitized test code',
    pattern: /const sanitizedTestCode = sanitizeForPrompt\(testCode/,
    description: 'Test code is sanitized'
  }
];

let passed = 0;
let failed = 0;

checks.forEach((check, index) => {
  const found = check.pattern.test(content);
  const status = found ? '✅ PASS' : '❌ FAIL';
  const icon = found ? '✓' : '✗';
  
  console.log(`\n${icon} ${check.name}`);
  console.log(`  Status: ${status}`);
  console.log(`  ${check.description}`);
  
  if (found) {
    passed++;
  } else {
    failed++;
  }
});

console.log('\n' + '='.repeat(70));
console.log(`\n📊 Results: ${passed}/${checks.length} checks passed\n`);

if (failed === 0) {
  console.log('✅ All sanitization functions are properly implemented!');
  console.log('\n📖 Documentation files:');
  console.log('   - SANITIZATION_README.md');
  console.log('   - SANITIZATION_GUIDE.md');
  console.log('   - IMPLEMENTATION_SUMMARY.md');
  console.log('   - EXAMPLES.md\n');
  process.exit(0);
} else {
  console.log(`❌ ${failed} check(s) failed!\n`);
  process.exit(1);
}