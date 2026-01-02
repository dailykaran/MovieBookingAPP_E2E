#!/usr/bin/env node

/**
 * Generate Playwright test results JSON with proper encoding
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const resultsPath = path.join(__dirname, '..', 'test-results', 'results.json');

// Ensure directory exists
const dir = path.dirname(resultsPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log('🎬 Running Playwright tests...\n');

const proc = spawn('npx', ['playwright', 'test', '--reporter=json', '--quiet'], {
  cwd: path.join(__dirname, '..'),
  stdio: ['inherit', 'pipe', 'inherit']
});

let jsonOutput = '';

proc.stdout.on('data', (data) => {
  jsonOutput += data.toString('utf-8');
});

proc.on('close', (code) => {
  try {
    // Validate JSON
    const parsed = JSON.parse(jsonOutput);
    
    // Write with UTF-8 encoding
    fs.writeFileSync(resultsPath, jsonOutput, 'utf-8');
    
    console.log(`\n✅ Results saved to: ${resultsPath}`);
    console.log(`📊 File size: ${fs.statSync(resultsPath).size} bytes`);
    
    // Extract stats
    if (parsed.stats) {
      console.log(`📈 Tests: ${parsed.stats.expected} expected, ${parsed.stats.unexpected} unexpected`);
    }
  } catch (error) {
    console.error('\n❌ Error processing results:', error.message);
    process.exit(1);
  }
});
