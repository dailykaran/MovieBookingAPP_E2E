#!/usr/bin/env node

/**
 * Selective Test Block Healer
 * Fixes only failing test blocks, not entire files
 * 
 * Features:
 * - Parses test file to identify individual test blocks
 * - Extracts only failing test functions
 * - Sends failing blocks to Gemini for analysis
 * - Surgically replaces only the failing blocks
 * - Preserves passing tests and other code
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '.env');
dotenv.config({ path: envPath });

const GEMINI_API_KEY_TEST = process.env.GEMINI_API_KEY_TEST;

// Validate API key
if (!GEMINI_API_KEY_TEST) {
  console.error('❌ GEMINI_API_KEY_TEST environment variable is not set!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY_TEST);

/**
 * Extract test blocks from code
 * Returns array of: { name, start, end, code, isFailing }
 */
function extractTestBlocks(fileContent, failingTestNames = []) {
  const testBlocks = [];
  
  // Match: test('name', async ({ page }) => { ... });
  // or: test.skip('name', async ({ page }) => { ... });
  const testPattern = /^(test\.skip|test)\('([^']+)',\s*async\s*\(\{\s*page\s*\}\)\s*=>\s*\{/gm;
  
  let match;
  while ((match = testPattern.exec(fileContent)) !== null) {
    const isSkipped = match[1] === 'test.skip';
    const testName = match[2];
    const startPos = match.index;
    const blockStart = match.index + match[0].length;
    
    // Find matching closing brace
    let braceCount = 1;
    let endPos = blockStart;
    for (let i = blockStart; i < fileContent.length && braceCount > 0; i++) {
      if (fileContent[i] === '{') braceCount++;
      if (fileContent[i] === '}') braceCount--;
      if (braceCount === 0) endPos = i;
    }
    
    // Include the closing `);` after the final brace
    let closingPos = endPos + 1;
    while (closingPos < fileContent.length && /[\s\n]/.test(fileContent[closingPos])) {
      closingPos++;
    }
    if (fileContent.substring(closingPos, closingPos + 2) === ');') {
      closingPos += 2;
    }
    
    const testCode = fileContent.substring(startPos, closingPos);
    const isFailing = failingTestNames.some(name => name.includes(testName));
    
    testBlocks.push({
      name: testName,
      isSkipped,
      isFailing,
      startPos,
      endPos: closingPos,
      code: testCode
    });
  }
  
  return testBlocks;
}

/**
 * Replace specific test block in file content
 */
function replaceTestBlock(fileContent, oldBlock, newBlock) {
  return fileContent.substring(0, oldBlock.startPos) + 
         newBlock.code + 
         fileContent.substring(oldBlock.endPos);
}

/**
 * Analyze failing test block with Gemini
 */
async function analyzeTestBlock(testBlock) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = `You are a Playwright test expert. Fix this failing test block.

Test Name: ${testBlock.name}

Current Test Code:
\`\`\`typescript
${testBlock.code}
\`\`\`

Please:
1. Identify why this test is failing
2. Fix only the failing test block (do not include beforeEach, imports, or other test blocks)
3. Return ONLY the fixed test block wrapped in \`\`\`typescript\`\`\` code fence
4. Keep the same test name and structure
5. Prioritize resilient selectors: getByRole > getByText > getByLabel > getByTestId
6. Avoid brittle .Mui* class selectors

Return ONLY the fixed test block code, nothing else.`;

    console.log(`📡 Sending ${testBlock.name} to Gemini...`);
    
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    });

    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error(`❌ Gemini analysis failed:`, err.message);
    return null;
  }
}

/**
 * Extract test block code from Gemini response
 */
function extractTestBlockCode(response) {
  if (!response) return null;
  
  const codeMatch = response.match(/```(?:typescript|javascript)?\n([\s\S]*?)\n```/);
  if (codeMatch) {
    return codeMatch[1].trim();
  }
  
  return null;
}

/**
 * Get failing tests from results.json
 */
function getFailingTestNames() {
  const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.error('❌ test-results/results.json not found');
    return [];
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const failingTests = [];

    if (results.suites && Array.isArray(results.suites)) {
      results.suites.forEach(suite => {
        if (suite.specs && Array.isArray(suite.specs)) {
          suite.specs.forEach(spec => {
            if (spec.tests && Array.isArray(spec.tests)) {
              spec.tests.forEach(test => {
                // Check if test failed (status !== 'expected' when status is 'failed')
                if (test.results && test.results[0] && test.results[0].status !== 'passed') {
                  failingTests.push(spec.title);
                }
              });
            }
          });
        }
      });
    }

    return failingTests;
  } catch (err) {
    console.error('❌ Error parsing results.json:', err.message);
    return [];
  }
}

/**
 * Main selective healing workflow
 */
async function healSelectively() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║         Selective Test Block Healer - Fix Only Failing Blocks         ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  // Get failing test names
  const failingTestNames = getFailingTestNames();

  if (failingTestNames.length === 0) {
    console.log('✅ No failing tests found! All tests are passing.');
    return;
  }

  console.log(`\n📊 Found ${failingTestNames.length} failing test(s):`);
  failingTestNames.forEach((name, idx) => {
    console.log(`  ${idx + 1}. ${name}`);
  });

  // Process each test file in tests directory
  const testsDir = path.join(process.cwd(), 'tests');
  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.spec.ts'));

  console.log(`\n🔍 Scanning ${testFiles.length} test file(s)...\n`);

  for (const testFile of testFiles) {
    const filePath = path.join(testsDir, testFile);
    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Extract test blocks
    const testBlocks = extractTestBlocks(fileContent, failingTestNames);
    const failingBlocks = testBlocks.filter(b => b.isFailing);

    if (failingBlocks.length === 0) {
      console.log(`⏭️  ${testFile}: No failing blocks`);
      continue;
    }

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🔧 Healing: ${testFile}`);
    console.log(`   Found ${failingBlocks.length} failing block(s)`);
    console.log('═'.repeat(70));

    // Create backup
    const backupDir = path.join(process.cwd(), '.healer-backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(backupDir, `${testFile}.${timestamp}.bak`);
    fs.writeFileSync(backupPath, fileContent, 'utf8');
    console.log(`✅ Backup created: ${backupPath}`);

    // Process each failing block
    for (const block of failingBlocks) {
      console.log(`\n📋 Analyzing: "${block.name}"`);

      // Get Gemini analysis
      const analysis = await analyzeTestBlock(block);
      if (!analysis) {
        console.log(`❌ Analysis failed for "${block.name}"`);
        continue;
      }

      // Extract fixed code
      const fixedCode = extractTestBlockCode(analysis);
      if (!fixedCode) {
        console.log(`❌ Could not extract fixed code for "${block.name}"`);
        continue;
      }

      console.log(`✅ Fix received for "${block.name}"`);

      // Create new block object with fixed code
      const fixedBlock = {
        ...block,
        code: fixedCode
      };

      // Replace in file content
      fileContent = replaceTestBlock(fileContent, block, fixedBlock);
      console.log(`✅ Block replaced in memory`);

      // Show snippet of fix
      const lines = fixedCode.split('\n').slice(0, 5);
      console.log(`\n   Fixed code preview:`);
      lines.forEach(line => {
        console.log(`   ${line}`);
      });
    }

    // Write updated file
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`\n✅ File updated: ${testFile}`);

    // Verify fixes
    console.log(`\n🧪 Verifying fixes...`);
    try {
      execFileSync('npx', [
        'playwright',
        'test',
        `tests/${testFile}`,
        '--reporter=list'
      ], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      console.log(`✅ All tests in ${testFile} now pass!`);
    } catch (err) {
      const output = err.stdout || '';
      if (output.includes('pass') && !output.includes('fail')) {
        console.log(`✅ Tests verified!`);
      } else {
        console.log(`⚠️  Some tests still failing. Review the fixes.`);
      }
    }
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`✅ Selective healing complete!`);
  console.log(`${'═'.repeat(70)}\n`);
}

// Run healer
healSelectively().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
