#!/usr/bin/env node

/**
 * Self-Healing E2E System - Detailed Trace Logger
 * Captures all 8 healing stages with timing and context
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const STAGE_NAMES = [
  'INPUT_VALIDATION',
  'FAILURE_CLASSIFICATION',
  'SECURITY_CHECK_INPUT',
  'PROMPT_BUILDING',
  'GEMINI_ANALYSIS',
  'SECURITY_CHECK_OUTPUT',
  'APPROVAL_GATE',
  'PATCH_AND_TEST'
];

class HealingTraceLogger {
  constructor() {
    this.stages = [];
    this.startTime = Date.now();
  }

  logStage(stageNum, data) {
    const timestamp = Date.now() - this.startTime;
    const stage = {
      stageNum,
      stageName: STAGE_NAMES[stageNum - 1],
      timestamp,
      data
    };
    this.stages.push(stage);
    
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`⏱️  STAGE ${stageNum}/${STAGE_NAMES.length}: ${STAGE_NAMES[stageNum - 1]}`);
    console.log(`⏰ T+${timestamp}ms`);
    console.log('═'.repeat(80));
    console.log(JSON.stringify(data, null, 2));
  }

  report() {
    console.log(`\n${'═'.repeat(80)}`);
    console.log('📊 HEALING PIPELINE SUMMARY');
    console.log('═'.repeat(80));
    
    for (const stage of this.stages) {
      const status = stage.data?.status || stage.data?.success ? '✅' : '❌';
      console.log(`${status} Stage ${stage.stageNum} (${stage.stageName}): ${stage.timestamp}ms`);
    }
    
    const totalTime = Date.now() - this.startTime;
    console.log(`\n⏱️  Total Healing Time: ${totalTime}ms`);
  }
}

export { HealingTraceLogger };
