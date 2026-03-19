// src/index.js
import 'dotenv/config';
import http from 'http';
import crypto from 'crypto';
import { SelfHealingOrchestrator } from './orchestrator.js';
import { AuditLogger } from './reporters/audit-logger.js';
import { validateEnvironment } from './validate-env.js';

const logger = new AuditLogger();
const orchestrator = new SelfHealingOrchestrator();
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.HEAL_SERVER_PORT || 3099;

/**
 * HMAC signature verification for webhook requests
 */
function verifyHmacSignature(body, signature) {
  if (!WEBHOOK_SECRET) {
    logger.warn('WEBHOOK_SECRET not configured — skipping signature verification');
    return true;
  }

  try {
    const expected = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(body)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expected}`),
      Buffer.from(signature)
    );
  } catch (err) {
    logger.error('HMAC verification error', { error: err.message });
    return false;
  }
}

/**
 * HTTP server for webhook-based test failure events
 */
const server = http.createServer(async (req, res) => {
  // Only accept POST /heal
  if (req.method !== 'POST' || req.url !== '/heal') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  // Collect request body
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const rawBody = Buffer.concat(chunks).toString();
  const signature = req.headers['x-webhook-signature'] ?? '';

  // ── HMAC signature verification ──────────────────────────────
  if (!verifyHmacSignature(rawBody, signature)) {
    logger.warn('Invalid webhook signature — request rejected');
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized: Invalid signature' }));
    return;
  }

  // Parse JSON body
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    logger.error('JSON parse error', { error: err.message });
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON in request body' }));
    return;
  }

  // ── Process healing request ──────────────────────────────────
  try {
    const result = await orchestrator.heal(event);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
  } catch (err) {
    logger.error('Orchestrator fatal error', { error: err.message, stack: err.stack });
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

/**
 * Health check endpoint
 */
const healthServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(404);
  res.end();
});

/**
 * Startup sequence
 */
async function startup() {
  console.log('🚀 Self-Healing E2E Test Server — Startup\n');

  try {
    // Validate environment
    console.log('1️⃣  Validating environment...');
    await validateEnvironment();
    console.log('   ✅ Environment OK\n');

    // Start main server
    server.listen(PORT, () => {
      console.log(`2️⃣  Webhook server listening on port ${PORT}`);
      console.log(`   📍 POST http://localhost:${PORT}/heal\n`);
    });

    // Start health check server
    healthServer.listen(3098, () => {
      console.log(`3️⃣  Health check server listening on port 3098`);
      console.log(`   📍 GET http://localhost:3098/health\n`);
    });

    console.log('✅ Self-Healing server ready!\n');
    console.log('Configuration:');
    console.log(`   • Gemini Model: ${process.env.GEMINI_MODEL}`);
    console.log(`   • Confidence Threshold: ${process.env.HEAL_CONFIDENCE_THRESHOLD}`);
    console.log(`   • Max Retries: ${process.env.HEAL_MAX_RETRIES}`);
    console.log(`   • Audit Log: ${process.env.TEST_AUDIT_LOG}\n`);
  } catch (err) {
    console.error('❌ Startup failed:', err.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down...');
  server.close();
  healthServer.close();
  process.exit(0);
});

startup();
