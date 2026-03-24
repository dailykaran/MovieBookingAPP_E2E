#!/usr/bin/env node

/**
 * GCP Permission Troubleshooting Script
 * Diagnoses the exact permission issue and suggests fixes
 */

import 'dotenv/config';
import { resolve } from 'path';
import { VertexAI } from '@google-cloud/vertexai';

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
};

async function diagnosePermissions() {
  console.log(`\n${colors.cyan}🔍 GCP Permission Diagnosis${colors.reset}\n`);

  const project = process.env.GCP_PROJECT_ID || 'self-healing-vertex-ai';
  const location = process.env.GCP_LOCATION || 'us-central1';
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-pro';

  // Ensure GOOGLE_APPLICATION_CREDENTIALS is set
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credsPath) {
    console.log(`${colors.red}❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS not set${colors.reset}\n`);
    console.log(`Make sure your .env file contains:`);
    console.log(`  GOOGLE_APPLICATION_CREDENTIALS=./secrets/self-healing-vertex-ai-64a146d79b76.json\n`);
    process.exit(1);
  }

  // Resolve to absolute path
  const resolvedCredsPath = resolve(credsPath);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedCredsPath;

  console.log(`${colors.cyan}Configuration:${colors.reset}`);
  console.log(`  Project: ${project}`);
  console.log(`  Location: ${location}`);
  console.log(`  Model: ${model}`);
  console.log(`  Credentials: ${resolvedCredsPath}\n`);

  try {
    const vertexAI = new VertexAI({
      project,
      location,
    });

    const genAI = vertexAI.getGenerativeModel({
      model,
    });

    console.log(`${colors.yellow}⏳ Testing Gemini API access...${colors.reset}`);

    const response = await genAI.generateContent({
      contents: [{
        role: 'user',
        parts: [{
          text: 'Test'
        }]
      }]
    });

    console.log(`\n${colors.green}✅ SUCCESS! Vertex AI API is accessible.${colors.reset}\n`);
    console.log(`${colors.green}The self-healing system is ready to use!${colors.reset}\n`);
    process.exit(0);

  } catch (error) {
    console.log(`\n${colors.red}❌ Permission Error Detected${colors.reset}\n`);
    console.log(`${colors.yellow}Error Details:${colors.reset}`);
    console.log(`  ${error.message}\n`);

    if (error.message.includes('403') || error.message.includes('PERMISSION_DENIED')) {
      console.log(`${colors.red}ISSUE: Service account lacks required IAM role${colors.reset}\n`);
      
      console.log(`${colors.cyan}SOLUTION - Add One of These Roles:${colors.reset}\n`);
      console.log(`${colors.yellow}Option A (Recommended):${colors.reset}`);
      console.log(`  Role: Vertex AI Service Agent`);
      console.log(`  Name: roles/aiplatform.serviceAgent`);
      console.log(`  Why: Designed specifically for service-to-service Vertex AI access\n`);

      console.log(`${colors.yellow}Option B (If A doesn't work):${colors.reset}`);
      console.log(`  Role: Vertex AI User`);
      console.log(`  Name: roles/aiplatform.user`);
      console.log(`  Plus: AI Platform Admin`);
      console.log(`  Name: roles/aiplatform.aiModelAdmin\n`);

      console.log(`${colors.yellow}Option C (Most Permissive):${colors.reset}`);
      console.log(`  Role: AI Platform Admin`);
      console.log(`  Name: roles/aiplatform.admin`);
      console.log(`  Why: Full access to all Vertex AI operations\n`);

      console.log(`${colors.cyan}HOW TO APPLY (via GCP Console):${colors.reset}`);
      console.log(`  1. Visit: https://console.cloud.google.com/iam-admin/iam`);
      console.log(`  2. Find: self-heal-vertex-ai@self-healing-vertex-ai.iam.gserviceaccount.com`);
      console.log(`  3. Click the pencil icon (Edit)`);
      console.log(`  4. Click: + Add Another Role`);
      console.log(`  5. Type in search: "service agent"`);
      console.log(`  6. Select: Vertex AI Service Agent (roles/aiplatform.serviceAgent)`);
      console.log(`  7. Click: Save`);
      console.log(`  8. Wait 30-60 seconds`);
      console.log(`  9. Re-run: npm run diagnose:permissions\n`);

      console.log(`${colors.cyan}CRITICAL CHECK:${colors.reset}`);
      console.log(`  ✓ Make sure you selected the SERVICE ACCOUNT, not a regular user`);
      console.log(`  ✓ Ensure you clicked the PENCIL ICON (Edit Principal)`);
      console.log(`  ✓ Verify the role appears in the list after saving\n`);

    } else if (error.message.includes('UNAUTHENTICATED')) {
      console.log(`${colors.red}ISSUE: Service account credentials not found or invalid${colors.reset}\n`);
      console.log(`${colors.cyan}Check:${colors.reset}`);
      console.log(`  1. GOOGLE_APPLICATION_CREDENTIALS is set: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
      console.log(`  2. File exists: ./secrets/self-healing-vertex-ai-64a146d79b76.json`);
      console.log(`  3. File is valid JSON\n`);
    }

    process.exit(1);
  }
}

diagnosePermissions();
