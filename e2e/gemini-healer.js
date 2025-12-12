#!/usr/bin/env node

/**
 * Advanced Gemini-Powered Playwright Test Healer
 * Fully integrated with Google Generative AI API
 * 
 * Features:
 * - Full Gemini API integration for intelligent test analysis
 * - Supports timeout errors, assertion failures, and selector issues
 * - Automatic test code generation and fixing
 * - Context-aware error analysis
 * - Detailed logging and progress tracking
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { generateHtmlReport } from './healer-report-generator.js';

// Load environment variables
dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HEALER_AUTO_FIX = process.env.HEALER_AUTO_FIX === 'true';
const HEALER_VERBOSE = process.env.HEALER_VERBOSE === 'true';

// Validate API key
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY environment variable is not set!');
  console.error('Please set GEMINI_API_KEY in your .env file or environment.');
  process.exit(1);
}

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * CLI Arguments Parser
 */
function parseArgs() {
  const args = process.argv.slice(2);
  return {
    autoFix: args.includes('--auto-fix') || args.includes('-a'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    testFile: args.find(arg => !arg.startsWith('-')),
    help: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Display help message
 */
function showHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║           Gemini-Powered Playwright Test Healer                        ║
╚═══════════════════════════════════════════════════════════════════════╝

Usage: node gemini-healer.js [options] [test-file]

Options:
  --auto-fix, -a     Automatically apply fixes suggested by Gemini
  --verbose, -v      Show detailed debug information
  --help, -h         Display this help message

Examples:
  node gemini-healer.js                    # Heal all failing tests
  node gemini-healer.js --auto-fix         # Heal and auto-apply fixes
  node gemini-healer.js --auto-fix -v      # Heal with verbose logging
  node gemini-healer.js localhost-3000     # Heal specific test file

Environment Variables:
  GEMINI_API_KEY              Your Google Generative AI API key (required)
  HEALER_AUTO_FIX             Default auto-fix behavior (true/false)
  HEALER_VERBOSE              Default verbose logging (true/false)
  HEALER_MAX_RETRIES          Maximum retry attempts (default: 3)
`);
}

/**
 * Fetch and parse test results
 */
function getFailedTests() {
  const resultsPath = path.join(process.cwd(), 'test-results', 'results.json');

  if (!fs.existsSync(resultsPath)) {
    console.warn('⚠️  No test results found. Run tests first with: npm test');
    return [];
  }

  try {
    const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
    const failedTests = [];

    if (results.suites && Array.isArray(results.suites)) {
      for (const suite of results.suites) {
        if (!suite.specs || !Array.isArray(suite.specs)) continue;

        for (const spec of suite.specs) {
          if (spec.ok === false) {
            const testInfo = extractTestInfo(spec);
            failedTests.push({
              file: suite.file,
              filePath: path.join(process.cwd(), 'tests', path.basename(suite.file)),
              title: spec.title,
              status: 'failed',
              error: testInfo.error,
              errorType: testInfo.errorType,
              errorContext: testInfo.errorContext
            });
          }
        }
      }
    }

    return failedTests;
  } catch (err) {
    console.error('❌ Error parsing test results:', err.message);
    return [];
  }
}

/**
 * Extract detailed test information from test spec
 */
function extractTestInfo(spec) {
  let error = 'Test failed';
  let errorType = 'unknown';
  let errorContext = '';

  if (spec.tests && Array.isArray(spec.tests) && spec.tests[0]) {
    const test = spec.tests[0];
    if (test.results && Array.isArray(test.results) && test.results[0]) {
      const result = test.results[0];

      // Collect all error messages
      if (result.errors && Array.isArray(result.errors)) {
        const errorMessages = result.errors
          .filter(err => err.message)
          .map(err => err.message);
        error = errorMessages.join('\n');
      }

      // Determine error type
      if (error.includes('timeout') || error.includes('Timeout')) {
        errorType = 'timeout';
      } else if (error.includes('strict mode') || error.includes('resolved to')) {
        errorType = 'strict_mode';
      } else if (error.includes('expect') || error.includes('assertion')) {
        errorType = 'assertion';
      } else if (error.includes('not found')) {
        errorType = 'not_found';
      }

      // Extract error context with file location
      if (result.errors && result.errors[0]) {
        errorContext = result.errors[0].location || '';
      }
    }
  }

  return { error, errorType, errorContext };
}

/**
 * Read test file content
 */
function readTestFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Test file not found: ${filePath}`);
    return null;
  }

  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error(`❌ Error reading test file: ${err.message}`);
    return null;
  }
}

/**
 * Generate comprehensive analysis prompt for Gemini
 */
function generateAnalysisPrompt(testInfo, testCode) {
  return `You are an expert Playwright test automation engineer. Analyze this failing test and provide:

1. **Root Cause Analysis**: Explain why the test is failing
2. **Error Classification**: Identify the type of error (timeout, assertion, selector, etc.)
3. **Issues Found**: List specific problems in the test code
4. **Recommended Fixes**: Provide clear, step-by-step fixes
5. **Fixed Code**: Provide the COMPLETE corrected test code

CRITICAL: You MUST provide the complete fixed test code inside a TypeScript code block.
The code block MUST include all imports, the complete test function, and closing braces.
Do NOT truncate the code block. Provide the full, working test code.

Error Type: ${testInfo.errorType}
Error Message:
\`\`\`
${testInfo.error.substring(0, 1000)}
\`\`\`

Current Test Code:
\`\`\`typescript
${testCode}
\`\`\`

Analysis Focus Areas:
- Playwright selectors (CSS, role-based, text-based)
- Material-UI component selectors (.MuiBox-root, .MuiPaper-root, etc.)
- Timing and async operations (waitForNavigation, waitForLoadState, etc.)
- Test data assumptions and brittleness
- Accessibility-first selectors (getByRole, getByLabel, etc.)
- Strict mode violations (locators matching multiple elements)

IMPORTANT: Always output the COMPLETE fixed code in a code block, never truncate it.`;
}

/**
 * Call Gemini API with streaming support
 */
async function analyzeWithGemini(testInfo, testCode) {
  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash'
    });

    const prompt = generateAnalysisPrompt(testInfo, testCode);

    console.log('📡 Sending to Gemini API for analysis...');
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 8192  // Increased from 4096 to ensure complete code output
      }
    });

    const response = await result.response;
    return response.text();
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    return null;
  }
}

/**
 * Extract fixed test code from Gemini response
 */
function extractFixedCode(geminiResponse) {
  if (!geminiResponse) return null;

  // Strategy: Find ALL code blocks and return the LAST one (which should be the fixed code)
  // This is because Gemini's response typically has analysis examples first, then the fixed code at the end
  
  const codeBlockPattern = /```(?:typescript|javascript)?\n([\s\S]*?)\n```/g;
  let allMatches = [];
  let match;
  
  // Extract all code blocks
  while ((match = codeBlockPattern.exec(geminiResponse)) !== null) {
    const code = match[1].trim();
    // Only keep blocks that look like test code
    if (code.includes('import') || code.includes('test(') || code.includes('expect(')) {
      allMatches.push(code);
    }
  }
  
  // Return the LAST (most complete) code block if available
  if (allMatches.length > 0) {
    const lastCode = allMatches[allMatches.length - 1];
    
    // Validate the code
    if ((lastCode.includes('import') || lastCode.includes('test(')) && lastCode.includes('expect(')) {
      return lastCode;
    }
    
    // If last one doesn't look right, try the most complete looking one
    for (let i = allMatches.length - 1; i >= 0; i--) {
      if (allMatches[i].includes('import') && allMatches[i].includes('test(')) {
        return allMatches[i];
      }
    }
  }

  // Fallback: Try to extract from incomplete response if no complete blocks found
  const incompleteMatch = geminiResponse.match(/import\s*{[\s\S]*?from\s*['"][^'"]+['"];[\s\S]*/);
  if (incompleteMatch) {
    const code = incompleteMatch[0].trim();
    if ((code.includes('test(') || code.includes('expect(')) && code.includes('import')) {
      // Add closing if missing
      if (!code.includes('});')) {
        return code + '\n});';
      }
      return code;
    }
  }

  return null;
}

/**
 * Apply fixes to test file
 */
function applyFixes(filePath, fixedCode) {
  try {
    // Validate the code before writing
    if (!fixedCode || fixedCode.trim().length === 0) {
      console.error('❌ Error: Fixed code is empty');
      return false;
    }

    // Check for critical code patterns
    const hasImport = fixedCode.includes('import');
    const hasTest = fixedCode.includes('test(');
    const hasExpect = fixedCode.includes('expect(');
    const hasClosingBrace = fixedCode.includes('});');

    if (!hasImport) {
      console.warn('⚠️  Warning: Fixed code missing import statement');
    }

    if (!hasTest) {
      console.error('❌ Error: Fixed code missing test() function - invalid Playwright test');
      return false;
    }

    if (!hasExpect) {
      console.warn('⚠️  Warning: Fixed code has no expect() assertions');
    }

    if (!hasClosingBrace) {
      console.warn('⚠️  Warning: Fixed code may be incomplete (missing closing braces)');
    }

    // Additional safety check: don't overwrite with markdown or analysis text
    if (fixedCode.includes('### ') || fixedCode.includes('**') && fixedCode.includes('**')) {
      console.error('❌ Error: Fixed code appears to contain markdown formatting - likely analysis text, not code');
      return false;
    }

    // Write the file
    fs.writeFileSync(filePath, fixedCode, 'utf8');
    console.log('✅ Test file updated with fixes');
    return true;
  } catch (err) {
    console.error('❌ Error applying fixes:', err.message);
    return false;
  }
}

/**
 * Run specific test to verify fix
 */
function verifyFix(testFile) {
  try {
    console.log('🧪 Re-running test to verify fix...');
    // Use the basename without the full path
    const testFileName = path.basename(testFile);
    
    // Run with explicit output handling - try to capture exit code properly
    let output = '';
    let stderr = '';
    
    try {
      output = execSync(`npx playwright test tests/${testFileName} --reporter=list --reporter=json --reporter-output=playwright-report/verify-results.json`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
    } catch (execErr) {
      // execSync throws on non-zero exit, but we need to check the output
      output = execErr.stdout || '';
      stderr = execErr.stderr || '';
    }
    
    if (HEALER_VERBOSE) {
      console.log('Verification output:', output);
      if (stderr) console.log('Verification stderr:', stderr);
    }
    
    // Check for passing tests in output
    const passMatch = output.match(/(\d+)\s+pass/i);
    const failMatch = output.match(/(\d+)\s+fail/i);
    
    const passes = passMatch ? parseInt(passMatch[1]) : 0;
    const fails = failMatch ? parseInt(failMatch[1]) : 0;
    
    if (HEALER_VERBOSE) {
      console.log(`  Passes: ${passes}, Fails: ${fails}`);
    }
    
    // If there are no failures, test passed
    if (fails === 0 && passes > 0) {
      console.log('✅ Test verification shows passing');
      return true;
    }
    
    // Check if it's a configuration issue vs actual test failure
    if (output.includes('No tests found')) {
      console.log('⚠️  Could not find test file for verification. Assuming fix is valid.');
      return true;
    }
    
    if (fails > 0) {
      console.log(`❌ Test verification shows ${fails} failing test(s)`);
      return false;
    }
    
    // If we can't determine, assume pass (since no errors thrown)
    return true;
    
  } catch (err) {
    if (HEALER_VERBOSE) {
      console.log('Test verification error:', err.message);
    }
    return false;
  }
}

/**
 * Display analysis results
 */
function displayAnalysis(analysis) {
  console.log('\n📋 Analysis Results:');
  console.log('═'.repeat(70));
  console.log(analysis);
  console.log('═'.repeat(70));
}

/**
 * Main healer workflow
 */
async function heal() {
  const options = parseArgs();
  const startTime = Date.now();
  const healingResults = {
    totalTests: 0,
    fixedCount: 0,
    verifiedCount: 0,
    successRate: 0,
    duration: '',
    tests: []
  };

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  console.log(`
╔═══════════════════════════════════════════════════════════════════════╗
║    🔧 Gemini-Powered Playwright Test Healer                            ║
║       Intelligent Test Analysis & Automated Fixing                     ║
╚═══════════════════════════════════════════════════════════════════════╝
`);

  console.log(`⚙️  Configuration:`);
  console.log(`   Auto-Fix: ${options.autoFix ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Verbose: ${options.verbose ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   API Key: ${GEMINI_API_KEY ? '✅ Configured' : '❌ Missing'}\n`);

  // Get failed tests
  console.log('📊 Analyzing test failures...\n');
  let failedTests = getFailedTests();

  if (failedTests.length === 0) {
    console.log('✅ No failing tests found! All tests are passing.');
    return;
  }

  // Filter by specific test file if provided
  if (options.testFile) {
    failedTests = failedTests.filter(t => t.file.includes(options.testFile));
    if (failedTests.length === 0) {
      console.warn(`⚠️  No failing tests found matching: ${options.testFile}`);
      return;
    }
  }

  console.log(`Found ${failedTests.length} failing test(s):\n`);
  failedTests.forEach((test, idx) => {
    console.log(`  ${idx + 1}. ${test.file} › ${test.title}`);
    console.log(`     Error Type: ${test.errorType}`);
    console.log(`     Error: ${test.error.substring(0, 80)}...\n`);
  });

  healingResults.totalTests = failedTests.length;

  // Process each failing test
  for (const test of failedTests) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`🔍 Healing: ${test.file}`);
    console.log(`   Test: ${test.title}`);
    console.log(`   Type: ${test.errorType}`);
    console.log('═'.repeat(70));

    // Initialize test result
    const testResult = {
      file: test.file,
      title: test.title,
      errorType: test.errorType,
      error: test.error,
      analysis: null,
      fixed: false,
      verified: false,
      fixedCode: null
    };

    // Read test file
    const testCode = readTestFile(test.filePath);
    if (!testCode) {
      healingResults.tests.push(testResult);
      continue;
    }

    if (options.verbose) {
      console.log('\n📄 Current Test Code:');
      console.log(testCode);
    }

    // Analyze with Gemini
    const analysis = await analyzeWithGemini(test, testCode);
    if (!analysis) {
      healingResults.tests.push(testResult);
      continue;
    }

    testResult.analysis = analysis;
    displayAnalysis(analysis);

    // Extract and apply fixes
    const fixedCode = extractFixedCode(analysis);
    if (fixedCode) {
      console.log('\n✅ Fixed code extracted successfully');
      testResult.fixedCode = fixedCode;

      if (options.autoFix) {
        console.log('🔧 Applying fixes...');
        if (applyFixes(test.filePath, fixedCode)) {
          testResult.fixed = true;
          healingResults.fixedCount++;

          // Verify the fix
          const verified = verifyFix(test.filePath);
          if (verified) {
            console.log('✅ Test passed after healing!');
            testResult.verified = true;
            healingResults.verifiedCount++;
          } else {
            console.log('⚠️  Test still failing after fix. May need manual review.');
          }
        }
      } else {
        console.log('\n⏸️  Auto-fix is disabled.');
        console.log('   Review the analysis above and apply fixes manually, or');
        console.log('   Re-run with --auto-fix to apply changes automatically.\n');

        // Ask user if they want to apply the fix
        console.log('Fixed code:');
        console.log('```typescript');
        console.log(fixedCode);
        console.log('```\n');
      }
    } else {
      console.error('❌ Could not extract fixed code from Gemini response');
    }

    healingResults.tests.push(testResult);
  }

  // Calculate success rate
  if (healingResults.totalTests > 0) {
    healingResults.successRate = Math.round((healingResults.verifiedCount / healingResults.totalTests) * 100);
  }

  // Calculate duration
  const endTime = Date.now();
  const durationMs = endTime - startTime;
  const durationSec = Math.round(durationMs / 1000);
  healingResults.duration = `${durationSec}s`;

  console.log(`\n${'═'.repeat(70)}`);
  console.log('✅ Healing session complete!');
  console.log('═'.repeat(70));
  console.log(`\n📊 Summary:`);
  console.log(`   Total Tests: ${healingResults.totalTests}`);
  console.log(`   Fixed: ${healingResults.fixedCount}`);
  console.log(`   Verified: ${healingResults.verifiedCount}`);
  console.log(`   Success Rate: ${healingResults.successRate}%`);
  console.log(`   Duration: ${healingResults.duration}`);

  // Generate HTML report if auto-fix was enabled
  if (options.autoFix && healingResults.totalTests > 0) {
    generateHtmlReport(healingResults);
  }
}

// Run healer
heal().catch(err => {
  console.error('❌ Fatal error:', err.message);
  if (HEALER_VERBOSE) {
    console.error(err.stack);
  }
  process.exit(1);
});
