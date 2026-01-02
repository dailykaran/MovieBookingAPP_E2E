/**
 * Main Entry Point for TypeScript Self-Heal Mechanism
 * Orchestrates the healing process with full OOP architecture
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { TestInfo, ErrorType, HealerConfig, HealingReport } from './types/index.js';
import { HealerFactory, HealerProvider } from './healers/HealerFactory.js';
import { ReportGenerator } from './utils/ReportGenerator.js';

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath, override: true, debug: false });
} else {
  console.warn(`⚠️  Warning: .env file not found at ${envPath}`);
  dotenv.config({ override: true }); // Try default location
}

/**
 * Parse error information from test failure
 */
function parseTestError(errorOutput: string): { error: string; errorType: ErrorType; context: string } {
  const errorMap: { [key: string]: ErrorType } = {
    'timeout': 'timeout',
    'not found': 'not_found',
    'expect': 'assertion',
    'selector': 'selector',
    'navigation': 'navigation',
    'network': 'network'
  };

  let errorType: ErrorType = 'unknown';
  for (const [pattern, type] of Object.entries(errorMap)) {
    if (errorOutput.toLowerCase().includes(pattern)) {
      errorType = type;
      break;
    }
  }

  return {
    error: errorOutput,
    errorType,
    context: errorOutput.substring(0, 200)
  };
}

/**
 * Main healing orchestrator
 */
async function runHealer(testFilePath: string): Promise<HealingReport> {
  const startTime = Date.now();
  const healingResults: HealingReport = {
    timestamp: new Date().toISOString(),
    duration: '0s',
    provider: 'unknown',
    totalTests: 0,
    successCount: 0,
    failedCount: 0,
    skippedCount: 0,
    successRate: 0,
    tests: []
  };

  try {
    // Get configuration
    const provider = (process.env.HEALER_PROVIDER || 'gemini') as HealerProvider;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('❌ API Key Error:');
      console.error(`  GEMINI_API_KEY env var not set`);
      console.error(`  .env path checked: ${envPath}`);
      console.error(`  .env exists: ${fs.existsSync(envPath)}`);
      throw new Error('No API key found (GEMINI_API_KEY)');
    }
    
    console.log('✅ API Key loaded successfully');
    console.log(`  Provider: ${provider}`);
    console.log(`  API Key length: ${apiKey.length} characters`);

    if (!HealerFactory.isValidProvider(provider)) {
      throw new Error(`Invalid provider: ${provider}`);
    }

    healingResults.provider = provider;

    // Create healer configuration
    const config: HealerConfig = {
      apiKey,
      maxRetries: parseInt(process.env.HEALER_MAX_RETRIES || '3', 10),
      apiTimeout: parseInt(process.env.HEALER_API_TIMEOUT || '60000', 10),
      maxFileSize: parseInt(process.env.HEALER_MAX_FILE_SIZE || '1048576', 10),
      backupDir: process.env.HEALER_BACKUP_DIR || path.join(process.cwd(), '.healer-backups'),
      auditLogPath: process.env.HEALER_AUDIT_LOG || path.join(process.cwd(), '.healer-audit.log'),
      verbose: process.env.HEALER_VERBOSE === 'true'
    };

    // Create healer using factory pattern
    const healer = HealerFactory.createHealer(provider, config);

    // Read test file
    if (!fs.existsSync(testFilePath)) {
      throw new Error(`Test file not found: ${testFilePath}`);
    }

    const testCode = fs.readFileSync(testFilePath, 'utf-8');

    // Parse error information (in real usage, this would come from test failure)
    const errorOutput = process.env.TEST_ERROR || 'Test failed to execute';
    const { error, errorType, context } = parseTestError(errorOutput);

    // Create test info
    const testInfo: TestInfo = {
      filePath: testFilePath,
      error,
      errorType,
      errorContext: context,
      timestamp: new Date()
    };

    console.log(`🔍 Healing test: ${testFilePath}`);

    // Execute healing
    const result = await healer.healTest(testInfo, testCode);

    healingResults.totalTests = 1;

    // Record healing result
    healingResults.tests.push({
      filePath: testFilePath,
      error,
      errorType: errorType.toString(),
      analysis: 'Analysis performed by ' + provider + ' AI',
      suggestedFix: result.fix || '',
      success: result.success,
      timestamp: new Date().toISOString()
    });

    if (result.success) {
      healingResults.successCount = 1;
      console.log(`✅ Test healed successfully!`);
      if (result.fix) {
        console.log(`\nFixed code applied and verified.`);
      }
    } else {
      healingResults.failedCount = 1;
      console.log(`⚠️ Healing skipped: ${result.reason}`);
    }

    // Calculate success rate
    healingResults.successRate =
      healingResults.totalTests > 0
        ? Math.round((healingResults.successCount / healingResults.totalTests) * 100)
        : 0;

    // Calculate duration
    const endTime = Date.now();
    const durationMs = endTime - startTime;
    const seconds = Math.round(durationMs / 1000);
    healingResults.duration = `${seconds}s`;

    // Generate HTML report
    const reportGenerator = new ReportGenerator();
    const reportPath = reportGenerator.saveReport(healingResults);
    console.log(`\n📄 Report available at: ${reportPath}`);

    return healingResults;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Healing failed: ${errorMsg}`);
    
    // Still generate report with error
    healingResults.failedCount = 1;
    const reportGenerator = new ReportGenerator();
    try {
      const reportPath = reportGenerator.saveReport(healingResults);
      console.log(`\n📄 Error report available at: ${reportPath}`);
    } catch (reportError) {
      console.error('Failed to generate report:', reportError);
    }

    process.exit(1);
  }
}

/**
 * CLI Entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: npx ts-node src/index.ts <test-file>');
    console.error('Example: npx ts-node src/index.ts e2e/tests/MovieDetails.spec.ts');
    process.exit(1);
  }

  const testFile = args[0];
  await runHealer(testFile);
}

// Run if executed directly - check if this is the main module
// In Node.js with ES modules, we can check if process.argv[1] matches the current file
const isExecutedDirectly = process.argv[1] && 
  (process.argv[1].includes('index.js') || process.argv[1].includes('dist/src'));

if (isExecutedDirectly) {
  main().catch(error => {
    console.error(error);
    process.exit(1);
  });
}

export { runHealer };
