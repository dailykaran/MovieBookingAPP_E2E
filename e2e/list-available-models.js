#!/usr/bin/env node
/**
 * List available Gemini models in Vertex AI project
 * Helps identify which models are accessible for healing
 */

import { VertexAI } from '@google-cloud/vertexai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '.env') });

const project = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'us-central1';

const geminiModels = [
  // Gemini 3 Models (Latest)
  'gemini-3-pro',
  'gemini-3-pro-exp',
  'gemini-3-flash',
  'gemini-3-pro-latest',
  'gemini-3-pro-preview',
  'gemini-3-flash-preview',
  
  // Gemini 2.0 Models
  'gemini-2.0-pro',
  'gemini-2.0-pro-exp',
  'gemini-2.0-pro-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  
  // Gemini 2.5 Models
  'gemini-2.5-pro',
  'gemini-2.5-flash',
  'gemini-2.5-flash-preview-04-17',
  'gemini-2.5-pro-exp',
  
  // Gemini 1.5 Models
  'gemini-1.5-pro',
  'gemini-1.5-flash',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-latest',
];

async function testModel(model) {
  try {
    const vertexAI = new VertexAI({ project, location });
    const generativeModel = vertexAI.getGenerativeModel({
      model: model,
    });

    await generativeModel.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: 'test' }],
        },
      ],
    });
    
    return { available: true, model: model };
  } catch (error) {
    const errorMsg = error.message || String(error);
    if (errorMsg.includes('404') || errorMsg.includes('not found') || errorMsg.includes('NOT_FOUND')) {
      return { available: false, model: model, reason: '404 Not Found' };
    } else if (errorMsg.includes('permission') || errorMsg.includes('PERMISSION_DENIED')) {
      return { available: false, model: model, reason: 'Permission Denied' };
    } else if (errorMsg.includes('RESOURCE_EXHAUSTED')) {
      return { available: true, model: model, reason: 'Rate Limited' };
    } else if (errorMsg.includes('is not a function')) {
      return { available: false, model: model, reason: 'Client Error' };
    }
    return { available: false, model: model, reason: errorMsg.substring(0, 100) };
  }
}

async function main() {
  console.log('\n📋 Checking Available Gemini Models in Vertex AI');
  console.log(`Project: ${project}`);
  console.log(`Location: ${location}`);
  console.log('─'.repeat(70));

  try {
    const results = [];
    
    // Test each model
    for (const modelName of geminiModels) {
      process.stdout.write(`Testing ${modelName}... `);
      const result = await testModel(modelName);
      results.push(result);
      
      if (result.available) {
        console.log('✅ AVAILABLE');
      } else {
        console.log(`❌ ${result.reason}`);
      }
    }

    // Summary
    console.log('\n' + '─'.repeat(70));
    const available = results.filter(r => r.available);
    
    if (available.length === 0) {
      console.log('❌ No models found\n');
      process.exit(1);
    }

    console.log(`\n✅ AVAILABLE MODELS (${available.length}):\n`);
    
    // Group by family
    const gemini3 = available.filter(m => m.model.includes('gemini-3'));
    const gemini2 = available.filter(m => m.model.includes('gemini-2'));
    const gemini15 = available.filter(m => m.model.includes('gemini-1'));

    if (gemini3.length > 0) {
      console.log('🚀 Gemini 3 (Latest):');
      gemini3.forEach(m => console.log(`   • ${m.model}`));
    }

    if (gemini2.length > 0) {
      console.log('\n📊 Gemini 2.x:');
      gemini2.forEach(m => console.log(`   • ${m.model}`));
    }

    if (gemini15.length > 0) {
      console.log('\n📊 Gemini 1.5:');
      gemini15.forEach(m => console.log(`   • ${m.model}`));
    }

    console.log('\n' + '─'.repeat(70));
    
    // Recommendation
    if (gemini3.length > 0) {
      const recommended = gemini3[0];
      console.log(`\n🎯 RECOMMENDED: ${recommended.model}`);
      console.log(`\nUpdate your .env file:`);
      console.log(`GEMINI_MODEL=${recommended.model}`);
    } else if (gemini2.length > 0) {
      const recommended = gemini2[0];
      console.log(`\n🎯 RECOMMENDED: ${recommended.model}`);
      console.log(`\nUpdate your .env file:`);
      console.log(`GEMINI_MODEL=${recommended.model}`);
    }

    console.log('\n');
  } catch (error) {
    console.error('❌ Error checking models:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify GCP credentials are set: GOOGLE_APPLICATION_CREDENTIALS');
    console.log('2. Check GCP_PROJECT_ID in .env');
    console.log('3. Ensure Vertex AI API is enabled: gcloud services enable aiplatform.googleapis.com');
    console.log('4. Verify service account has aiplatform.admin role');
    process.exit(1);
  }
}

main();
