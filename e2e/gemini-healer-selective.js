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

// CRITICAL: Only TRUE infrastructure errors that CANNOT be fixed by test changes
const INFRASTRUCTURE_ERRORS = [
  'connection refused', 'connection reset', 'enotfound', 'econnrefused',
  'host not found', 'dns', 'getaddrinfo', 'econnreset',
  'target page, context or browser has been closed', 'browser context was closed',
  'websocket closed', 'target closed', 'session not created',
  'err_name_not_resolved', 'err_connection_refused', 'err_connection_reset',
  'err_network_changed', 'timeout waiting for connection',
  'socket hang up', 'socket error', 'epipe', 'enotfound'
];

// Validate API key
if (!GEMINI_API_KEY_TEST) {
  console.error('❌ GEMINI_API_KEY_TEST environment variable is not set!');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY_TEST);

/**
 * Classify error type to determine if it can be healed
 */
function classifyErrorType(errorMessage) {
  if (!errorMessage) return 'UNKNOWN';
  
  const lower = errorMessage.toLowerCase();
  
  // Check for TRUE infrastructure/connection errors
  for (const infError of INFRASTRUCTURE_ERRORS) {
    if (lower.includes(infError)) {
      return 'INFRASTRUCTURE';
    }
  }
  
  // Check for timeout types
  if (lower.includes('timeout')) {
    if (lower.includes('waiting for') && (lower.includes('connection') || lower.includes('server'))) {
      return 'INFRASTRUCTURE';
    }
    if (lower.includes('browser') && lower.includes('closed')) {
      return 'INFRASTRUCTURE';
    }
    return 'TIMEOUT_ASSERTION';
  }
  
  // Check for assertion/selector errors (fixable)
  if (lower.includes('expect') || lower.includes('selector') || lower.includes('not found')) {
    return 'ASSERTION';
  }
  
  return 'UNKNOWN';
}

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

    const prompt = `You are an expert Playwright test automation engineer. Fix this failing test block.

CRITICAL: Start your response with: DECISION: [UPDATE_TEST, FRONTEND_BUG, UPDATE_SELECTOR, UPDATE_TEXT, or MANUAL_REVIEW]

Test Name: ${testBlock.name}

Current Test Code:
\`\`\`typescript
${testBlock.code}
\`\`\`

Analysis Requirements:
1. **Identify the failure cause**:
   - Is it a selector issue (element not found)?
   - Is it a URL/navigation change?
   - Is it a text/label change?
   - Is it a frontend bug (broken behavior)?
   - Is it a DOM architecture issue?

2. **Make a decision**:
   - If test logic needs fixing → DECISION: UPDATE_TEST
   - If only selector needs updating → DECISION: UPDATE_SELECTOR
   - If text/label changed → DECISION: UPDATE_TEXT
   - If frontend is broken → DECISION: FRONTEND_BUG
   - If unsure → DECISION: MANUAL_REVIEW

3. **Provide the fix**:
   - For UPDATE_TEST/UPDATE_SELECTOR/UPDATE_TEXT: Return ONLY corrected test block
   - For FRONTEND_BUG: Describe what frontend developers should fix
   - Follow selector priority: getByRole > getByText > getByLabel > getByTestId > avoid .Mui*
   - Preserve test name and overall structure

4. **Return format**:
   - Start with: DECISION: [choice]
   - Brief reasoning (1-2 lines)
   - Then provide:
     - If FRONTEND_BUG: Description of frontend issue
     - If UPDATE_*: Full fixed test block in \`\`\`typescript\`\`\` fence
   - Keep same test name and structure
   - For selectors: prioritize resilient over Material-UI classes

IMPORTANT:
- DO NOT include other test blocks, imports, or wrapper functions
- ONLY the failing test block that needs fixing
- NO truncation - provide complete working code
- Maintain test intent, don't silently accept broken behavior`;

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
 * Extract decision from Gemini response
 */
function extractDecisionFromResponse(response) {
  const decisionPattern = /DECISION:\s*([A-Z_]+)/i;
  const match = response.match(decisionPattern);
  
  if (match) {
    const decision = match[1];
    const validDecisions = ['FRONTEND_BUG', 'UPDATE_TEST', 'UPDATE_SELECTOR', 'UPDATE_TEXT', 'MANUAL_REVIEW'];
    
    if (validDecisions.includes(decision)) {
      return {
        decision,
        reasoning: extractReasoningFromResponse(response)
      };
    }
  }
  
  return { decision: 'UNKNOWN', reasoning: '' };
}

/**
 * Extract reasoning from response
 */
function extractReasoningFromResponse(response) {
  const reasoningPatterns = [
    /DECISION:.*?\n([\s\S]{0,200}?)(?=\n\`\`\`|Fixed|FRONTEND|$)/i,
    /([\s\S]{0,150}?)(?=\`\`\`)/i
  ];
  
  for (const pattern of reasoningPatterns) {
    const match = response.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 200);
    }
  }
  
  return '';
}

/**
 * Recursively collect all specs from nested suite structure
 */
function collectSpecsRecursive(suite) {
  const allSpecs = [];
  
  // Add specs from current level
  if (suite.specs && Array.isArray(suite.specs)) {
    suite.specs.forEach(spec => {
      allSpecs.push(spec);
    });
  }
  
  // Recursively add specs from nested suites
  if (suite.suites && Array.isArray(suite.suites)) {
    suite.suites.forEach(nestedSuite => {
      const nestedSpecs = collectSpecsRecursive(nestedSuite);
      allSpecs.push(...nestedSpecs);
    });
  }
  
  return allSpecs;
}

/**
 * Get failing tests from results.json
 */
function getFailingTestNames() {
  const resultsPath = path.join(process.cwd(), 'reports/results', 'results.json');
  
  if (!fs.existsSync(resultsPath)) {
    console.error('❌ reports/results/results.json not found');
    return [];
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const failingTests = [];

    if (results.suites && Array.isArray(results.suites)) {
      results.suites.forEach(suite => {
        // Recursively collect specs from main level and nested suites
        const allSpecs = collectSpecsRecursive(suite);
        
        allSpecs.forEach(spec => {
          if (spec.tests && Array.isArray(spec.tests)) {
            spec.tests.forEach(test => {
              // Check if test failed (status !== 'expected' when status is 'failed')
              if (test.results && test.results[0] && test.results[0].status !== 'passed') {
                failingTests.push(spec.title);
              }
            });
          }
        });
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

      // NEW: Extract decision
      const healerDecision = extractDecisionFromResponse(analysis);
      console.log(`📋 Healer Decision: ${healerDecision.decision}`);
      if (healerDecision.reasoning) {
        console.log(`   ${healerDecision.reasoning}`);
      }

      // NEW: Skip if frontend bug
      if (healerDecision.decision === 'FRONTEND_BUG') {
        console.log(`🔴 FRONTEND BUG DETECTED - Skipping test fix`);
        console.log(`   Please fix the frontend code first`);
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
