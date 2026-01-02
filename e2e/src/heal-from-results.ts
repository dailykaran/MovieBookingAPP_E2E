#!/usr/bin/env node

/**
 * Healer with Results.json Analysis
 * Reads Playwright test results from results.json, classifies errors, and heals tests
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { ResultsJsonParser, ParsedTestFailure } from './utils/ResultsJsonParser.js';
import { HealerFactory, HealerProvider } from './healers/HealerFactory.js';
import { HealerConfig, TestInfo, ErrorType } from './types/index.js';
import { ReportGenerator } from './utils/ReportGenerator.js';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true, debug: false });
} else {
  console.warn(`⚠️  Warning: .env file not found at ${envPath}`);
  dotenv.config({ override: true }); // Try default location
}

interface HealingSession {
  timestamp: string;
  provider: string;
  resultsFile: string;
  totalTests: number;
  healedCount: number;
  failedCount: number;
  successRate: number;
  errorTypeStats: Record<ErrorType, number>;
  severityStats: Record<string, number>;
  healedTests: Array<{
    testName: string;
    errorType: ErrorType;
    severity: string;
    healed: boolean;
  }>;
}

/**
 * Heal tests based on results.json analysis
 */
async function healFromResultsJson(resultsPath: string): Promise<void> {
  console.log('\n🔍 Parsing Playwright test results from results.json...\n');

  // Parse results.json
  const results = ResultsJsonParser.parseResultsJson(resultsPath);
  if (results.length === 0) {
    console.error('❌ No test results found in:', resultsPath);
    process.exit(1);
  }

  console.log(`📊 Found ${results.length} test results`);

  // Get failed tests
  const failedTests = ResultsJsonParser.getFailedTests(results);
  if (failedTests.length === 0) {
    console.log('✅ All tests passed! No healing needed.');
    return;
  }

  console.log(`⚠️  Found ${failedTests.length} failed tests\n`);

  // Analyze and classify failures
  const failures = ResultsJsonParser.analyzeFailures(failedTests);
  const summary = ResultsJsonParser.generateSummary(failures);

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    FAILURE ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log('Error Type Distribution:');
  console.log(
    `  • timeout:     ${summary.byType.timeout} tests`
  );
  console.log(
    `  • strict_mode: ${summary.byType.strict_mode} tests`
  );
  console.log(
    `  • assertion:   ${summary.byType.assertion} tests`
  );
  console.log(
    `  • not_found:   ${summary.byType.not_found} tests`
  );
  console.log(
    `  • unknown:     ${summary.byType.unknown} tests`
  );

  console.log('\nSeverity Distribution:');
  console.log(
    `  • CRITICAL: ${summary.bySeverity.critical} tests`
  );
  console.log(
    `  • HIGH:     ${summary.bySeverity.high} tests`
  );
  console.log(
    `  • MEDIUM:   ${summary.bySeverity.medium} tests`
  );
  console.log(
    `  • LOW:      ${summary.bySeverity.low} tests`
  );

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Initialize healer
  const provider = (process.env.HEALER_PROVIDER || 'gemini') as HealerProvider;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ API Key Error:');
    console.error(`  GEMINI_API_KEY env var not set`);
    console.error(`  .env path checked: ${envPath}`);
    console.error(`  .env exists: ${fs.existsSync(envPath)}`);
    process.exit(1);
  }
  
  console.log('✅ API Key loaded successfully');
  console.log(`  Provider: ${provider}`);
  console.log(`  API Key length: ${apiKey.length} characters`);

  const config: HealerConfig = {
    apiKey,
    maxRetries: parseInt(process.env.HEALER_MAX_RETRIES || '3', 10),
    apiTimeout: parseInt(process.env.HEALER_API_TIMEOUT || '60000', 10),
    maxFileSize: parseInt(process.env.HEALER_MAX_FILE_SIZE || '1048576', 10),
    backupDir: process.env.HEALER_BACKUP_DIR || path.join(process.cwd(), '.healer-backups'),
    auditLogPath: process.env.HEALER_AUDIT_LOG || path.join(process.cwd(), '.healer-audit.log'),
    verbose: process.env.HEALER_VERBOSE === 'true'
  };

  const healer = HealerFactory.createHealer(provider, config);
  const healingSession: HealingSession = {
    timestamp: new Date().toISOString(),
    provider,
    resultsFile: resultsPath,
    totalTests: failedTests.length,
    healedCount: 0,
    failedCount: 0,
    successRate: 0,
    errorTypeStats: {
      timeout: summary.byType.timeout,
      strict_mode: summary.byType.strict_mode,
      assertion: summary.byType.assertion,
      not_found: summary.byType.not_found,
      selector: summary.byType.selector,
      navigation: summary.byType.navigation,
      network: summary.byType.network,
      unknown: summary.byType.unknown
    },
    severityStats: summary.bySeverity,
    healedTests: []
  };

  // Heal each failed test
  console.log('🔧 Starting healing process for failed tests...\n');

  for (const failure of failures) {
    console.log(`📝 ${failure.testName} [${failure.classified.type}]`);

    try {
      // Read test file
      if (!fs.existsSync(failure.testFile)) {
        console.log(`   ⚠️  Test file not found`);
        healingSession.failedCount++;
        continue;
      }

      const testCode = fs.readFileSync(failure.testFile, 'utf-8');

      // Create test info with classification context
      const testInfo: TestInfo = {
        filePath: failure.testFile,
        error: failure.errorMessage,
        errorType: failure.classified.type,
        errorContext: failure.errorStack || failure.classified.message,
        timestamp: failure.timestamp
      };

      // Heal the test
      const result = await healer.healTest(testInfo, testCode);

      if (result.success) {
        console.log(`   ✅ Healed successfully!`);
        healingSession.healedCount++;
        healingSession.healedTests.push({
          testName: failure.testName,
          errorType: failure.classified.type,
          severity: failure.classified.severity,
          healed: true
        });
      } else {
        console.log(`   ❌ Healing failed: ${result.reason}`);
        healingSession.failedCount++;
        healingSession.healedTests.push({
          testName: failure.testName,
          errorType: failure.classified.type,
          severity: failure.classified.severity,
          healed: false
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ❌ Error: ${errorMsg}`);
      healingSession.failedCount++;
    }
  }

  // Calculate success rate
  healingSession.successRate =
    healingSession.totalTests > 0
      ? Math.round((healingSession.healedCount / healingSession.totalTests) * 100)
      : 0;

  // Print summary
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                    HEALING SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════\n');

  console.log(`Total Tests Healed: ${healingSession.totalTests}`);
  console.log(`✅ Successfully Healed: ${healingSession.healedCount}`);
  console.log(`❌ Failed to Heal: ${healingSession.failedCount}`);
  console.log(`📊 Success Rate: ${healingSession.successRate}%`);

  console.log('\n═══════════════════════════════════════════════════════════════\n');

  // Generate detailed report
  const detailedReport = ResultsJsonParser.generateDetailedReport(failures);
  console.log(detailedReport);

  // Save session data
  const sessionPath = path.join(
    process.cwd(),
    'test-results',
    `healing-session-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );

  fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
  fs.writeFileSync(sessionPath, JSON.stringify(healingSession, null, 2), 'utf-8');

  console.log(`\n💾 Healing session saved to: ${sessionPath}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Determine results.json path
  let resultsPath: string | null = null;

  if (args.length > 0) {
    resultsPath = args[0];
  } else {
    // Find results.json automatically
    resultsPath = ResultsJsonParser.findResultsJson();

    if (!resultsPath) {
      console.error(
        '❌ Could not find results.json file. Provide path as argument:'
      );
      console.error('   npm run heal:results path/to/results.json');
      process.exit(1);
    }

    console.log(`📄 Found results.json at: ${resultsPath}`);
  }

  try {
    await healFromResultsJson(resultsPath);
    console.log('\n✨ Healing session completed!');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${errorMsg}`);
    process.exit(1);
  }
}

main();
