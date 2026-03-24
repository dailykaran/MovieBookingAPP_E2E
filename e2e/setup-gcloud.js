#!/usr/bin/env node

/**
 * Alternative GCP IAM Setup using gcloud CLI
 * This approach is more reliable as it uses user's existing gcloud auth
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  bold: '\x1b[1m',
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  header: (msg) => console.log(`\n${colors.bold}${colors.blue}${msg}${colors.reset}\n`),
};

/**
 * Check if gcloud CLI is installed
 */
function checkGcloudInstalled() {
  try {
    execSync('gcloud --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Load credentials to extract project ID
 */
function loadCredentials() {
  const credPath = path.join(__dirname, 'secrets', 'self-healing-vertex-ai-64a146d79b76.json');
  
  if (!existsSync(credPath)) {
    log.error(`Credentials file not found: ${credPath}`);
    process.exit(1);
  }

  try {
    return JSON.parse(readFileSync(credPath, 'utf8'));
  } catch (error) {
    log.error(`Failed to parse credentials: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Setup using gcloud CLI
 */
function setupWithGcloud(credentials) {
  const projectId = credentials.project_id;
  const serviceAccountEmail = credentials.client_email;

  log.header('⚙️  GCP IAM Setup with gcloud CLI');

  log.info(`Project: ${projectId}`);
  log.info(`Service Account: ${serviceAccountEmail}`);

  try {
    // Set the project
    log.info('\n📌 Setting GCP project...');
    execSync(`gcloud config set project ${projectId}`, { stdio: 'inherit' });

    // List of required roles
    const roles = [
      'roles/aiplatform.user',
      'roles/aiplatform.viewer',
      'roles/aiplatform.aiModelAdmin',
      'roles/logging.logWriter',
      'roles/cloudtrace.agent',
    ];

    log.info('\n🔑 Granting IAM roles...');
    
    for (const role of roles) {
      try {
        log.info(`  Granting: ${role}`);
        execSync(
          `gcloud projects add-iam-policy-binding ${projectId} --member=serviceAccount:${serviceAccountEmail} --role=${role} --quiet`,
          { stdio: 'pipe' }
        );
        log.success(`  Granted: ${role}`);
      } catch (error) {
        // Role might already be assigned, continue
        log.warn(`  Already has or skipped: ${role}`);
      }
    }

    log.header('✅ IAM Setup Complete!');
    log.success('Service account now has permissions to:');
    log.success('  • Call Vertex AI Gemini endpoints');
    log.success('  • Access AI Platform services');
    log.success('  • Write logs and traces');
    
    log.info('\n📝 Next steps:');
    log.info('  1. Run: npm run heal:manual -- --testFile tests/broken_link.spec.ts --testName "should navigate"');
    log.info('  2. Verify: npx playwright test broken_link.spec.ts\n');

    process.exit(0);
  } catch (error) {
    log.error(`Setup failed: ${error.message}`);
    log.info('\nTroubleshooting:');
    log.info('  1. Ensure you have gcloud CLI installed: https://cloud.google.com/sdk/install');
    log.info('  2. Login with: gcloud auth login');
    log.info('  3. Set project: gcloud config set project self-healing-vertex-ai');
    log.info('  4. Re-run this script\n');
    process.exit(1);
  }
}

/**
 * Manual setup instructions
 */
function printManualInstructions(credentials) {
  const projectId = credentials.project_id;
  const serviceAccountEmail = credentials.client_email;

  log.header('📋 Manual GCP IAM Setup Instructions');

  console.log(`
Follow these steps to grant permissions manually:

1. Open Google Cloud Console:
   https://console.cloud.google.com/iam-admin/iam?project=${projectId}

2. Find the service account:
   ${serviceAccountEmail}

3. Click the service account and select "Edit Principal"

4. Add these roles:
   ✓ Vertex AI User
   ✓ AI Platform Admin (or better: Vertex AI Service Agent)
   ✓ Logs Writer
   ✓ Cloud Trace Agent

5. Click "Save"

6. Wait 1-2 minutes for permissions to propagate

7. Then run: npm run heal:manual -- --testFile tests/broken_link.spec.ts --testName "should navigate"

Alternatively, use gcloud CLI if you have it installed:
  https://cloud.google.com/sdk/docs/install

  Then run: npm run setup:gcloud
`);

  process.exit(0);
}

// Main execution
const credentials = loadCredentials();

if (checkGcloudInstalled()) {
  log.info('✓ gcloud CLI detected\n');
  setupWithGcloud(credentials);
} else {
  log.warn('gcloud CLI not found');
  log.info('Using manual setup instructions instead\n');
  printManualInstructions(credentials);
}
