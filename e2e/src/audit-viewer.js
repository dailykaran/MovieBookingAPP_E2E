// src/audit-viewer.js
import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const AUDIT_FILE = process.env.TEST_AUDIT_LOG || './artifacts/heal-audit.jsonl';

/**
 * View and analyze the healing audit trail
 */
function viewAudit() {
  if (!existsSync(AUDIT_FILE)) {
    console.log(`❌ Audit file not found: ${AUDIT_FILE}\n`);
    process.exit(1);
  }

  const content = readFileSync(AUDIT_FILE, 'utf8');
  const lines = content.trim().split('\n');

  console.log(`📊 Self-Healing Audit Trail\n`);
  console.log(`File: ${AUDIT_FILE}`);
  console.log(`Entries: ${lines.length}\n`);

  // Parse and aggregate stats
  const stats = {
    totalEvents: 0,
    byType: {},
    byStatus: {},
    averageConfidence: 0,
    confidenceScores: [],
  };

  const events = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      events.push(entry);

      stats.totalEvents++;
      stats.byType[entry.event] = (stats.byType[entry.event] || 0) + 1;

      if (entry.confidence) {
        stats.confidenceScores.push(entry.confidence);
      }
    } catch (err) {
      console.warn(`⚠️  Skipped malformed entry: ${line.substring(0, 50)}...`);
    }
  }

  // Calculate averages
  if (stats.confidenceScores.length > 0) {
    stats.averageConfidence = (
      stats.confidenceScores.reduce((a, b) => a + b, 0) / stats.confidenceScores.length
    ).toFixed(2);
  }

  // Display stats
  console.log('📈 Statistics:\n');
  console.log(`Total events: ${stats.totalEvents}`);
  console.log(`Average confidence: ${stats.averageConfidence}`);

  console.log('\nBy event type:');
  for (const [type, count] of Object.entries(stats.byType).sort()) {
    console.log(`  • ${type}: ${count}`);
  }

  // Display recent events
  console.log('\n\n📝 Recent Events (last 20):\n');
  const recent = events.slice(-20);
  for (const event of recent) {
    const ts = event.ts ? new Date(event.ts).toLocaleString() : 'unknown';
    console.log(`[${ts}] ${event.event}`);

    if (event.id) console.log(`   ID: ${event.id}`);
    if (event.reason) console.log(`   Reason: ${event.reason}`);
    if (event.confidence) console.log(`   Confidence: ${event.confidence}`);
    if (event.failureClass) console.log(`   Failure: ${event.failureClass}`);
    if (event.message) console.log(`   Message: ${event.message}`);

    console.log('');
  }

  // Healing success rate
  const healStarts = events.filter(e => e.event === 'HEAL_START').length;
  const healed = events.filter(e => e.event === 'COMPLETE' && e.passed).length;
  const blocked = events.filter(e => e.event === 'BLOCKED').length;
  const pending = events.filter(e => e.event === 'PENDING_APPROVAL').length;

  console.log('\n🎯 Healing Summary:\n');
  console.log(`Healing attempts: ${healStarts}`);
  console.log(`Successfully healed: ${healed}`);
  console.log(`Blocked (security): ${blocked}`);
  console.log(`Pending approval: ${pending}`);
  if (healStarts > 0) {
    console.log(`Success rate: ${((healed / healStarts) * 100).toFixed(1)}%`);
  }
}

viewAudit();
