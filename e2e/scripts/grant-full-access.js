#!/usr/bin/env node
/**
 * Grant Full Access to Healing System
 * 
 * Creates permission config allowing auto-approval of all healing proposals
 * for .spec.ts files without manual review gate.
 * 
 * Usage: npm run grant-access
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const permissionFile = path.join(__dirname, '..', '.healer-permissions.json');

const permissionConfig = {
  version: "1.0",
  approvalGate: {
    enabled: false,
    description: "FULL ACCESS: All healing proposals auto-approved for .spec.ts files",
    grantedAt: new Date().toISOString()
  },
  scope: {
    filePatterns: ["tests/**/*.spec.ts"],
    allowAutoApply: true,
    requiredConfidence: 0.0,
    autoApproveAllFailureTypes: true
  },
  security: {
    auditTrailRequired: true,
    auditPath: "artifacts/heal-audit.jsonl",
    backupOriginals: true
  },
  metadata: {
    grantedBy: "User",
    fullAccessLevel: "UNRESTRICTED",
    comment: "User has full permission for all healing operations on test files"
  }
};

// Create the config file
try {
  fs.writeFileSync(permissionFile, JSON.stringify(permissionConfig, null, 2));
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        ✅ FULL ACCESS GRANTED TO HEALING SYSTEM           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  console.log('📁 Permission Config Created:');
  console.log(`   📄 ${permissionFile}\n`);
  
  console.log('🔓 Access Level: UNRESTRICTED');
  console.log('   • All healing proposals will auto-approve');
  console.log('   • No manual approval gate required');
  console.log('   • Confidence threshold: 0% (accept all)\n');
  
  console.log('📊 Scope:');
  console.log('   • Files: tests/**/*.spec.ts');
  console.log('   • Auto-apply: Enabled');
  console.log('   • Backup originals: Yes\n');
  
  console.log('🛡️  Security:');
  console.log('   • Audit trail: Required');
  console.log('   • Location: artifacts/heal-audit.jsonl');
  console.log('   • All changes logged permanently\n');
  
  console.log('🚀 You can now run:');
  console.log('   npm run heal:manual -- --testFile <path> --testName <name>');
  console.log('   npm run heal:batch -- --all\n');
  
  console.log('📝 Result: Tests will be healed automatically with full approval\n');
  
  console.log('✅ To verify access:');
  console.log('   cat e2e/.healer-permissions.json\n');
  
  console.log('🔄 To revoke access:');
  console.log('   npm run revoke-access\n');
  
} catch (error) {
  console.error('❌ Error creating permission config:');
  console.error(error.message);
  process.exit(1);
}
