#!/usr/bin/env node
/**
 * Healing Approval Handler
 * 
 * Approves and applies pending healing proposals from Gemini AI
 * Usage: npm run heal:approve -- --healingId <ID>
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { readFileSync, appendFileSync } from 'fs';
import { PatchApplicator } from './patch-applicator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUDIT_FILE = path.join(__dirname, '../artifacts/heal-audit.jsonl');
const patcher = new PatchApplicator();

// Parse CLI arguments
const args = process.argv.slice(2);
let healingId = null;

// Handle both formats: --healingId ID or just ID
if (args.length === 1 && !args[0].startsWith('--')) {
  // Direct ID passed: npm run heal:approve -- ID
  healingId = args[0];
} else if (args.length >= 2) {
  // --healingId flag format (also handle npm's lowercase variant --healingid)
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--healingId' || args[i] === '--healingid') && i + 1 < args.length) {
      healingId = args[i + 1];
      break;
    }
  }
}

if (!healingId) {
  console.error('❌ Error: Healing ID is required');
  console.error('Usage: npm run heal:approve -- <healing-id>');
  console.error('\nExample: npm run heal:approve -- a2f11397-606');
  process.exit(1);
}

/**
 * Logs event to audit trail
 */
function logAudit(event) {
  const entry = {
    ...event,
    ts: new Date().toISOString(),
  };
  
  if (!fs.existsSync(path.dirname(AUDIT_FILE))) {
    fs.mkdirSync(path.dirname(AUDIT_FILE), { recursive: true });
  }
  
  appendFileSync(AUDIT_FILE, JSON.stringify(entry) + '\n');
}

/**
 * Find healing proposal in audit trail
 */
function findHealing(id) {
  if (!fs.existsSync(AUDIT_FILE)) {
    return null;
  }

  const lines = readFileSync(AUDIT_FILE, 'utf-8').split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      // Look for PENDING_APPROVAL or COMPLETE events with matching id
      if (entry.id === id && (entry.event === 'PENDING_APPROVAL' || entry.event === 'COMPLETE')) {
        return entry;
      }
    } catch (e) {
      // Skip invalid lines
    }
  }
  
  return null;
}

/**
 * Main approval workflow
 */
async function approveHealing() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║              🔧 Healing Approval Handler                       ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  console.log(`🔍 Looking up healing proposal: ${healingId}\n`);

  // Step 1: Find the healing proposal
  const healing = findHealing(healingId);
  
  if (!healing) {
    console.error(`❌ Healing proposal not found: ${healingId}`);
    console.error('\nAvailable options:');
    console.error('  1. Check healing ID is correct');
    console.error('  2. Review all healings: npm run audit:review');
    console.error('  3. Run new healing: npm run heal:manual -- --testFile tests/broken_link.spec.ts');
    process.exit(1);
  }

  console.log('📋 Healing Proposal Details:');
  console.log(`   ID: ${healing.id}`);
  console.log(`   Status: ${healing.event}`);
  if (healing.confidence) {
    console.log(`   Confidence: ${(healing.confidence * 100).toFixed(1)}%`);
  }
  if (healing.failureClass) {
    console.log(`   Failure Type: ${healing.failureClass}`);
  }
  console.log('');

  // Step 2: Check if confidence meets threshold
  const threshold = 0.82;
  if (healing.confidence && healing.confidence < threshold) {
    console.warn(`⚠️  Warning: Confidence ${(healing.confidence * 100).toFixed(1)}% is below recommended threshold ${(threshold * 100).toFixed(1)}%`);
    console.log('');
    console.log('This healing proposal may not be reliable.');
    console.log('You can proceed at your own risk, or request a new analysis.\n');
  }

  // Step 3: Log approval
  console.log('✅ Approval recorded\n');
  logAudit({
    id: healingId,
    event: 'APPROVAL',
    confidence: healing.confidence,
    message: `User approved healing proposal`,
  });

  // Step 3.5: Apply patches if available
  let patchesApplied = false;
  if (healing.patches && Array.isArray(healing.patches) && healing.patches.length > 0) {
    console.log('📝 Applying patches...\n');
    
    try {
      const patchResult = await patcher.apply(healing.patches);
      patchesApplied = patchResult.successful > 0;
      
      if (patchesApplied) {
        console.log(`✅ Successfully applied ${patchResult.successful} patch(es)`);
        healing.patches.forEach((p, idx) => {
          console.log(`   Patch ${idx + 1}: ${p.file}`);
        });
        console.log('');
      } else {
        console.log(`⚠️  No patches could be applied`);
        if (patchResult.details) {
          patchResult.details.forEach(d => {
            if (!d.success) {
              console.log(`   ❌ ${d.file}: ${d.reason}`);
            }
          });
        }
        console.log('');
      }
    } catch (err) {
      console.log(`⚠️  Patch application error: ${err.message}\n`);
    }
  } else {
    console.log('ℹ️  No patches in proposal to apply\n');
  }

  // Step 4: Re-run test to verify
  console.log('📊 Verifying fix with test re-run...\n');
  
  const testFile = healing.testFile || 'tests/broken_link.spec.ts';
  
  try {
    execSync(`npx playwright test ${testFile} --reporter=json`, {
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    });
    
    console.log('✅ Test passed! Healing was successful.\n');
    logAudit({
      id: healingId,
      event: 'COMPLETE',
      status: 'SUCCESS',
      patchesApplied,
      message: 'Test passed after healing approval',
    });
    
  } catch (err) {
    if (patchesApplied) {
      console.warn('⚠️  Patches were applied but test still failing.\n');
    } else {
      console.warn('⚠️  Test still failing. Healing may need refinement.\n');
    }
    console.log('Next steps:');
    console.log('  1. Review the test output above');
    console.log('  2. Run new healing: npm run heal:manual -- --testFile tests/broken_link.spec.ts');
    console.log('  3. Check audit trail: npm run audit:review\n');
    
    logAudit({
      id: healingId,
      event: 'APPROVAL_VERIFICATION_FAILED',
      patchesApplied,
      message: 'Test still failed after healing approval',
    });
  }

  console.log('✅ Approval workflow complete!\n');
  console.log('📚 Next steps:');
  console.log(`   • View changes: git diff tests/broken_link.spec.ts`);
  console.log(`   • Review audit: npm run audit:review`);
  console.log(`   • Run all tests: npx playwright test\n`);
}

// Run the approval workflow
approveHealing().catch(err => {
  console.error('❌ Error during approval:', err.message);
  process.exit(1);
});
