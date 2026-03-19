// src/prompt-builder.js
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { consoleLogger } from './reporters/audit-logger.js';

const TEMPLATE_DIR = resolve('./prompts');

/**
 * Load a prompt template and inject context variables.
 * @param {string} templateName  – file name without .md extension
 * @param {object} variables     – key/value pairs for {{PLACEHOLDER}} substitution
 * @returns {string}
 */
export function buildPrompt(templateName, variables = {}) {
  const templatePath = resolve(TEMPLATE_DIR, `${templateName}.md`);
  
  let template;
  try {
    template = readFileSync(templatePath, 'utf8');
  } catch (err) {
    consoleLogger.warn(`Template not found: ${templateName}`, { error: err.message });
    return '';
  }

  // Replace all {{PLACEHOLDER}} tokens
  for (const [key, value] of Object.entries(variables)) {
    const safeValue = sanitizePromptInput(String(value ?? ''));
    template = template.replaceAll(`{{${key}}}`, safeValue);
  }

  // Verify no unfilled placeholders remain
  const unfilled = template.match(/\{\{[A-Z_]+\}\}/g);
  if (unfilled && unfilled.length > 0) {
    consoleLogger.warn(`Prompt has unfilled variables: ${unfilled.join(', ')}`);
  }

  return template;
}

/**
 * Strip potentially dangerous injection patterns from user-provided
 * context before it enters the prompt.
 */
function sanitizePromptInput(input) {
  return input
    .replace(/ignore\s+(all\s+)?previous\s+instructions?/gi, '[REDACTED]')
    .replace(/you\s+are\s+now/gi, '[REDACTED]')
    .replace(/<script[\s\S]*?<\/script>/gi, '[SCRIPT_REMOVED]')
    .replace(/\{\{.*?\}\}/g, '[TEMPLATE_REMOVED]') // prevent nested injection
    .slice(0, 8000); // hard length cap
}
