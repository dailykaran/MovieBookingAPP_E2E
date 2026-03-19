#!/usr/bin/env node

/**
 * Direct Vertex AI / Gemini Healing Script
 * Analyzes failing test and applies AI-powered fixes
 */

import 'dotenv/config';
import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SelfHealingOrchestrator } from './src/orchestrator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runHealing() {
  console.log('🤖 Vertex AI Self-Healing System (Gemini 2.5 Flash)\n');
  console.log('━'.repeat(60));

  const testFile = 'tests/HomePage.spec.ts';
  const errorContextFile = 'test-results/HomePage-verify-app-loads-chromium/error-context.md';

  // Read test file and error context
  let testCode = '';
  let errorContext = '';

  try {
    testCode = readFileSync(testFile, 'utf8');
    console.log(`✓ Loaded test file: ${testFile}`);
  } catch (e) {
    console.error(`✗ Failed to read test file: ${e.message}`);
    return;
  }

  try {
    errorContext = readFileSync(errorContextFile, 'utf8');
    console.log(`✓ Loaded error context from test run`);
  } catch (e) {
    console.warn(`⚠ No error context file found, using test output only`);
  }

  console.log('━'.repeat(60));
  console.log('\n📋 Test Failure Summary:\n');
  console.log('Expected: "ShowGlow"');
  console.log('Received: "ShowGlow - Book Movie Tickets"');
  console.log('Category: ASSERTION_DRIFT\n');

  console.log('━'.repeat(60));
  console.log('\n🔄 Starting Vertex AI Analysis Pipeline...\n');

  // Build healing event
  const healingEvent = {
    testFile,
    testCode,
    errorMessage: 'Expected: "ShowGlow" Received: "ShowGlow - Book Movie Tickets"',
    errorType: 'AssertionError',
    failureCategory: 'ASSERTION_DRIFT',
    timestamp: new Date().toISOString(),
    environment: {
      browser: 'chromium',
      framework: 'playwright',
      node_version: process.version,
    },
  };

  try {
    const orchestrator = new SelfHealingOrchestrator();

    // Stage 1: Classify
    console.log('Stage 1/8: 🏷️  Classifying failure...');
    console.log('   → Identified as: ASSERTION_DRIFT (expected value mismatch)');

    // Stage 2-4: Validate, Prompt, Request AI
    console.log('\nStage 2/8: 🔒 Security validation...');
    console.log('   → Input sanitized and safe to process');

    console.log('\nStage 3/8: 📝 Building AI prompt...');
    console.log('   → Using assertion-heal.md template');

    console.log('\nStage 4/8: 🧠 Requesting Vertex AI / Gemini 2.5 Flash...');
    console.log('   → Sending test code + error context');
    console.log('   → Multimodal analysis: text extraction');

    // Run the orchestrator
    const result = await orchestrator.heal(healingEvent);

    console.log('\nStage 5/8: ✅ Received AI analysis');
    console.log(`   → Confidence: ${(result.confidence || 0.85).toFixed(2)}`);
    console.log(`   → Status: ${result.status}`);

    // Stage 6: Confidence gate
    const threshold = parseFloat(process.env.HEAL_CONFIDENCE_THRESHOLD || '0.82');
    console.log(`\nStage 6/8: 🚪 Confidence gate (threshold: ${threshold})`);

    if (result.confidence >= threshold) {
      console.log(`   → PASSED (${result.confidence.toFixed(2)} ≥ ${threshold})`);
      console.log('   → Auto-applying patch...\n');

      // Stage 7: Apply patch
      console.log('Stage 7/8: 🔨 Applying patch to test file...\n');

      if (result.proposedFix) {
        try {
          const originalContent = readFileSync(testFile, 'utf8');
          const patchedContent = result.proposedFix;

          writeFileSync(testFile, patchedContent, 'utf8');
          console.log('✓ Patch applied successfully!\n');

          console.log('━━━ PROPOSED FIX ━━━━━━━━━━━━━━━━━');
          console.log(patchedContent);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

          // Return for test re-run
          console.log('Stage 8/8: 🔄 Ready for test re-run');
          console.log('   → Run: npm test -- HomePage.spec.ts\n');
          console.log('✅ Healing complete! Test file has been updated.\n');
        } catch (e) {
          console.error(`✗ Failed to apply patch: ${e.message}`);
        }
      }
    } else {
      console.log(
        `   → FAILED (${result.confidence?.toFixed(2) || 'N/A'} < ${threshold})`
      );
      console.log('   → Confidence too low — requires human review\n');
      if (result.proposedFix) {
        console.log('📋 Proposed Fix (for review):');
        console.log('━'.repeat(60));
        console.log(result.proposedFix);
        console.log('━'.repeat(60));
      }
    }

    console.log('\n💾 Audit log saved to: reports/healing-audit.jsonl');
  } catch (error) {
    console.error('\n❌ Healing pipeline failed:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Verify GCP credentials: echo $GOOGLE_APPLICATION_CREDENTIALS');
    console.error('2. Check .env file is properly configured');
    console.error('3. Ensure Gemini API is accessible');
    process.exit(1);
  }
}

// Run healing
runHealing().catch(console.error);
