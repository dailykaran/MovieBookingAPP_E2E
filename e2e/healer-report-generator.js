#!/usr/bin/env node

/**
 * Gemini Healer - HTML Report Generator (Enhanced with Tabs)
 * Generates professional HTML reports with improved styling and interactivity
 * Color Scheme: Navy Blue (#1e3a8a), Green (#10b981), Grey (#6b7280)
 */

import fs from 'fs';
import path from 'path';

/**
 * Helper function to escape HTML special characters
 */
function escapeHtmlNode(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Remove ANSI escape codes from text
 */
function stripAnsiCodes(text) {
  if (!text) return '';
  // Remove ANSI escape sequences: ESC[...m or ESC[...H, etc.
  return text
    .replace(/\x1b\[[0-9;]*m/g, '')      // Color codes: [31m, [39m, etc.
    .replace(/\x1b\[[0-9;]*H/g, '')      // Cursor position: [2J, etc.
    .replace(/\x1b\[[0-9;]*[A-Z]/g, '')  // Other escape sequences
    .replace(/\[\d+m/g, '')               // Fallback for [31m style codes
    .replace(/\[\d+[A-Z]/g, '');          // Fallback for cursor codes
}

function normalizeReportedValue(rawValue) {
  if (rawValue === null || rawValue === undefined) return null;
  const text = `${rawValue}`.trim();
  const prefixMatch = text.match(/^(?:Old|New|Failed|Working|Decision|Current|Actual)\s*[^:]*:\s*(.*)$/i);
  const cleaned = prefixMatch ? prefixMatch[1].trim() : text;
  if (!cleaned || /^(N\/A|NA|undefined|null)$/i.test(cleaned)) return null;
  return cleaned;
}

function resolveLocatorText(eventValue, detailValue) {
  return normalizeReportedValue(eventValue) || normalizeReportedValue(detailValue);
}

/**
 * Format code with line numbers - simplified and truncated
 */
function formatCodeWithLineNumbers(code, type = 'error', maxLines = 8) {
  if (!code) return '<span style="color: #6b7280;">No content available</span>';
  
  const lines = code.split('\n').slice(0, maxLines);
  const totalLines = code.split('\n').length;
  const hasMore = totalLines > maxLines;
  const lineNumWidth = Math.max(2, totalLines.toString().length);
  
  let html = lines.map((line, idx) => {
    const lineNum = idx + 1;
    const paddedNum = lineNum.toString().padStart(lineNumWidth, ' ');
    const escapedLine = escapeHtmlNode(line || ' ');
    
    let highlighted = escapedLine;
    
    if (type === 'error') {
      highlighted = escapedLine
        .replace(/\b(Error|TypeError|AssertionError|ReferenceError|FAIL)\b/g, '<span class="error-kw">$1</span>')
        .replace(/\b(timeout|Timeout|TIMEOUT|failed|Failed)\b/g, '<span class="error-warn">$1</span>')
        .replace(/\b(at|in|near)\b/g, '<span class="error-prep">$1</span>');
    } else if (type === 'fix') {
      // For fix type, display plain code without syntax highlighting
      highlighted = escapedLine;
    }
    
    return `<div class="code-line"><span class="line-num">${paddedNum}</span><span class="code-text">${highlighted}</span></div>`;
  }).join('');
  
  if (hasMore) {
    html += `<div class="code-truncated">... ${totalLines - maxLines} more lines</div>`;
  }
  
  return html;
}

/**
 * Load healing logs from JSON file
 */
function loadHealingLogs() {
  const logsPath = path.join(process.cwd(), 'reports/results', 'healing-logs.json');
  try {
    if (fs.existsSync(logsPath)) {
      const logsData = fs.readFileSync(logsPath, 'utf8');
      return JSON.parse(logsData);
    }
  } catch (err) {
    console.warn(`⚠️  Could not load healing logs: ${err.message}`);
  }
  return null;
}

/**
 * Extract changes from healing logs - handles all types of changes
 * (selectors, text, URLs, architectural fixes, etc.)
 */
function extractLocatorChanges(healingLogs) {
  if (!healingLogs || !healingLogs.events) return [];
  
  const changes = [];
  const processedElements = new Set();
  
  healingLogs.events.forEach(event => {
    // Look for events that indicate actual changes were applied
    const isHealed = event.eventType === 'element_healed' || 
                     event.eventType === 'test_fixed_with_change' ||
                     event.eventType === 'locator_failure' || 
                     event.eventType === 'locator_found';
    
    if (!isHealed || !event.elementName) return;
    
    // Handle different types of changes
    const changeType = event.details?.changeType || 
                      (event.details?.decision === 'ARCHITECTURAL_FIX' ? 'architecture' : 'selector');
    
    // Extract change details based on event type
    let failedValue = resolveLocatorText(event.failedLocator, event.details?.oldValue) || 'N/A';
    let workingValue = resolveLocatorText(event.workingLocator, event.details?.newValue) || normalizeReportedValue(event.details?.replacement) || 'N/A';
    
    // Skip if both are N/A or same (no actual change)
    if ((failedValue === 'N/A' && workingValue === 'N/A') || 
        (failedValue === workingValue && changeType === 'selector')) {
      return;
    }
    
    const key = `${event.elementName}|${failedValue}|${workingValue}|${changeType}`;
    if (!processedElements.has(key)) {
      processedElements.add(key);
      changes.push({
        elementName: event.elementName,
        failedLocator: failedValue,
        workingLocator: workingValue,
        changeType: changeType,
        confidence: event.details?.confidence || null,
        decision: event.details?.decision || null,
        timestamp: event.timestamp,
        duration: event.duration
      });
    }
  });
  
  return changes;
}

/**
 * Extract all changes from healing logs (selectors, text, URLs, architecture, etc.)
 * This handles all types of Playwright test failures
 */
function extractAllSelectors(healingLogs) {
  if (!healingLogs || !healingLogs.events) return [];
  
  const selectors = [];
  const processedElements = new Set();
  
  healingLogs.events.forEach(event => {
    // Collect all healing events
    const isRelevant = event.eventType === 'element_healed' || 
                       event.eventType === 'test_fixed_with_change' ||
                       event.eventType === 'dom_architecture_detected' ||
                       event.eventType === 'healer_decision';
    
    if (!isRelevant || !event.elementName) return;
    
    // Determine change type
    let changeType = 'unknown';
    if (event.details?.changeType) {
      changeType = event.details.changeType; // selector, text, url, architecture
    } else if (event.eventType === 'dom_architecture_detected') {
      changeType = 'architecture';
    } else if (event.failedLocator && event.workingLocator && 
               event.failedLocator !== event.workingLocator) {
      changeType = 'selector';
    }
    
    // Extract failed and working values with fallbacks
    const failedValue = resolveLocatorText(event.failedLocator, event.details?.oldValue) || 
                       (event.eventType === 'dom_architecture_detected' ? 'Shadow DOM / Web Components' : 'Unknown');
    
    const workingValue = resolveLocatorText(event.workingLocator, event.details?.newValue) || normalizeReportedValue(event.details?.replacement) || 
                        (event.eventType === 'dom_architecture_detected' ? 'Architectural fixes applied' : 'Fixed');
    
    const key = `${event.elementName}|${failedValue}|${changeType}`;
    if (!processedElements.has(key)) {
      processedElements.add(key);
      
      const hasChanged = failedValue !== workingValue || changeType !== 'selector';
      
      const selectorObj = {
        elementName: event.elementName,
        failedLocator: failedValue,
        workingLocator: workingValue,
        changeType: changeType,
        eventType: event.eventType,
        hasChanged: hasChanged,
        confidence: event.details?.confidence || null,
        decision: event.details?.decision || null,
        timestamp: event.timestamp
      };
      
      selectors.push(selectorObj);
    }
  });
  
  return selectors;
}

/**
 * Categorize error type from error message - handles all Playwright failure types
 */
function categorizeErrorType(errorMessage) {
  if (!errorMessage) return 'Unknown Error';
  
  const msg = errorMessage.toLowerCase();
  
  // Locator/Selector errors
  if (msg.includes('locator') && msg.includes('timeout')) return 'Locator Timeout';
  if (msg.includes('getbyrole') || msg.includes('locator') || msg.includes('selector')) return 'Selector Error';
  if (msg.includes('element not found') || msg.includes('no element matches')) return 'Element Not Found';
  
  // Navigation errors
  if (msg.includes('navigation') || msg.includes('page.goto')) return 'Navigation Error';
  if (msg.includes('404') || msg.includes('not found')) return 'Page Not Found (404)';
  if (msg.includes('net::')) return 'Network Error';
  
  // Assertion errors
  if (msg.includes('assertion') || msg.includes('expect')) return 'Assertion Failed';
  if (msg.includes('timeout')) return 'Timeout Error';
  
  // Visibility/Interaction errors
  if (msg.includes('visible') || msg.includes('visibility')) return 'Visibility Error';
  if (msg.includes('click') && msg.includes('not visible')) return 'Element Not Visible';
  if (msg.includes('fill') || msg.includes('type')) return 'Input/Fill Error';
  
  // DOM/Architecture errors
  if (msg.includes('shadow') || msg.includes('shadow dom')) return 'Shadow DOM Error';
  if (msg.includes('iframe') || msg.includes('frame')) return 'iFrame Error';
  if (msg.includes('web component')) return 'Web Component Error';
  
  // Text content errors
  if (msg.includes('text') || msg.includes('content')) return 'Text Content Error';
  
  // Generic categorization
  if (msg.includes('error')) return 'General Error';
  if (msg.includes('fail')) return 'Test Failed';
  
  return 'Unknown Error';
}

/**
 * Extract and categorize error patterns from test results
 * Handles all types of Playwright test failures
 */
function extractErrorPatterns(tests) {
  const patterns = {};
  
  tests.forEach(test => {
    // Use smart categorization instead of just errorType field
    const errorType = categorizeErrorType(test.error || test.errorType || '');
    
    if (!patterns[errorType]) {
      patterns[errorType] = {
        count: 0,
        tests: [],
        examples: [],
        errorMessages: []
      };
    }
    patterns[errorType].count++;
    patterns[errorType].tests.push(test.title);
    
    // Collect unique error messages (up to 3 examples)
    if (patterns[errorType].examples.length < 3) {
      const errorMsg = test.error?.substring(0, 300) || test.errorType || 'Unknown error';
      if (!patterns[errorType].examples.includes(errorMsg)) {
        patterns[errorType].examples.push(errorMsg);
      }
    }
  });
  
  return patterns;
}

/**
 * Generate HTML report for healer session
 */
function generateHtmlReport(healingResults) {
  const reportDir = path.join(process.cwd(), 'reports/healer');
  
  // Ensure directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  // Load healing logs if available
  const healingLogs = loadHealingLogs();
  const locatorChanges = extractLocatorChanges(healingLogs);
  const allSelectors = extractAllSelectors(healingLogs);
  const errorPatterns = extractErrorPatterns(healingResults.tests);

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gemini Healer Report</title>
    <style>
        :root {
            --navy: #1e3a8a;
            --green: #10b981;
            --grey: #6b7280;
            --grey-light: #f3f4f6;
            --grey-border: #e5e7eb;
            --white: #ffffff;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --bg-error: #fee2e2;
            --border-error: #fecaca;
            --bg-success: #d1fae5;
            --border-success: #a7f3d0;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            min-height: 100vh;
            padding: 20px;
            color: var(--text-primary);
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #1e3a8a;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%);
            color: var(--white);
            padding: 40px 30px;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
        }

        .header p {
            font-size: 1em;
            opacity: 0.95;
        }

        .content {
            padding: 40px;
            background: var(--white);
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: var(--grey-light);
            border-left: 5px solid var(--navy);
            padding: 25px;
            border-radius: 6px;
            text-align: center;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.1);
        }

        .stat-card h3 {
            color: var(--navy);
            font-size: 2.5em;
            margin: 10px 0;
        }

        .stat-card p {
            color: var(--text-secondary);
            font-size: 0.9em;
            font-weight: 500;
        }

        .stat-card.success {
            border-left-color: var(--green);
        }

        .stat-card.success h3 {
            color: var(--green);
        }

        .results {
            margin-bottom: 30px;
            background: var(--white);
            padding: 20px;
            border-radius: 6px;
        }

        .results h2 {
            color: var(--navy);
            margin-bottom: 25px;
            font-size: 1.8em;
            border-bottom: 3px solid var(--navy);
            padding-bottom: 12px;
        }

        .test-result {
            background: var(--white);
            border: 1px solid var(--grey-border);
            border-radius: 6px;
            margin-bottom: 15px;
            overflow: hidden;
            transition: box-shadow 0.2s;
        }

        .test-result:hover {
            box-shadow: 0 4px 12px rgba(30, 58, 138, 0.08);
        }

        .test-result.success {
            border-left: 5px solid var(--green);
        }

        .test-result.failed {
            border-left: 5px solid #ef4444;
        }

        .test-header {
            background: var(--grey-light);
            padding: 18px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            user-select: none;
            transition: background 0.2s;
        }

        .test-header:hover {
            background: #e5e7eb;
        }

        .test-result.success .test-header {
            background: #f0fdf4;
        }

        .test-result.failed .test-header {
            background: #fef2f2;
        }

        .test-content {
            padding: 25px;
            display: none;
            border-top: 1px solid var(--grey-border);
        }

        .test-result.expanded .test-content {
            display: block;
            animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
            from {
                opacity: 0;
                transform: translateY(-10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .test-title {
            color: var(--text-primary);
            font-weight: 600;
            flex: 1;
        }

        .expand-icon {
            font-size: 1.2em;
            transition: transform 0.3s;
            color: var(--navy);
        }

        .test-result.expanded .expand-icon {
            transform: rotate(90deg);
        }

        .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.85em;
            font-weight: 600;
            margin-right: 15px;
        }

        .status-badge.success {
            background: var(--bg-success);
            color: #047857;
        }

        .status-badge.failed {
            background: var(--bg-error);
            color: #991b1b;
        }

        .status-badge.warning {
            background: #fef3c7;
            color: #92400e;
        }

        .subsection {
            margin: 15px 0;
            border: 1px solid var(--grey-border);
            border-radius: 6px;
            overflow: hidden;
        }

        .subsection-header {
            background: var(--grey-light);
            padding: 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
            user-select: none;
            transition: background 0.2s;
        }

        .subsection-header:hover {
            background: #e5e7eb;
        }

        .subsection-content {
            padding: 15px;
            display: none;
            border-top: 1px solid var(--grey-border);
            max-height: 600px;
            min-height: 150px;
            overflow: auto;
            resize: both;
            background: #f9fafb;
        }

        .subsection.expanded .subsection-content {
            display: block;
            animation: slideDown 0.3s ease-out;
        }

        .subsection-icon {
            font-size: 1.1em;
            transition: transform 0.3s;
            margin-right: 10px;
            color: var(--navy);
        }

        .subsection.expanded .subsection-icon {
            transform: rotate(90deg);
        }

        .error-text, .analysis-text, .fix-text {
            background: var(--grey-light);
            border: 1px solid var(--grey-border);
            border-radius: 6px;
            padding: 12px 15px;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            font-size: 0.9em;
            color: var(--text-primary);
            line-height: 1.8;
            max-height: 500px;
            overflow-y: auto;
            overflow-x: auto;
            resize: both;
        }

        .error-text {
            background: var(--bg-error);
            border-color: var(--border-error);
        }

        .analysis-text {
            background: #f0f9ff;
            border-color: #bae6fd;
        }

        .fix-text {
            background: var(--bg-success);
            border-color: var(--border-success);
        }

        .verification-box {
            border-radius: 6px;
            padding: 15px;
            margin-top: 15px;
            text-align: center;
            font-weight: 600;
        }

        .verification-box.success {
            background: var(--bg-success);
            border: 1px solid var(--border-success);
            color: #047857;
        }

        .verification-box.warning {
            background: #fef3c7;
            border: 1px solid #fcd34d;
            color: #92400e;
        }

        .verification-box.error {
            background: var(--bg-error);
            border: 1px solid var(--border-error);
            color: #991b1b;
        }

        .footer {
            background: #0f172a;
            border-top: 3px solid #0d9488;
            padding: 25px 40px;
            text-align: center;
            color: var(--white);
            font-size: 0.9em;
        }

        .footer p {
            margin: 8px 0;
        }

        /* TAB STYLING */
        .tabs-container {
            display: flex;
            border-bottom: 3px solid #0d9488;
            gap: 0;
            margin-bottom: 30px;
            background: var(--grey-light);
            border-radius: 8px 8px 0 0;
            overflow: hidden;
            flex-wrap: wrap;
        }

        .tab-button {
            flex: 1;
            min-width: 120px;
            padding: 16px 20px;
            border: none;
            background: var(--grey-light);
            color: var(--text-secondary);
            font-weight: 600;
            cursor: pointer;
            font-size: 0.9em;
            transition: all 0.3s ease;
            border-bottom: 3px solid transparent;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            user-select: none;
        }

        .tab-button:hover {
            background: #e5e7eb;
            color: var(--navy);
        }

        .tab-button.active {
            background: var(--white);
            color: var(--navy);
            border-bottom-color: #0d9488;
            box-shadow: 0 -2px 8px rgba(13, 148, 136, 0.1);
        }

        .tab-content {
            display: none;
            animation: fadeIn 0.3s ease-in;
        }

        .tab-content.active {
            display: block;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .locator-fix-grid {
            display: grid;
            gap: 15px;
        }

        .locator-fix-card {
            background: var(--white);
            border: 1px solid var(--grey-border);
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .locator-fix-header {
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            color: var(--white);
            padding: 15px 20px;
            font-weight: 600;
        }

        .locator-fix-body {
            padding: 20px;
        }

        .locator-comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-top: 15px;
        }

        .comparison-column {
            border-radius: 6px;
            padding: 15px;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            font-size: 0.85em;
            line-height: 1.6;
            word-break: break-all;
            white-space: pre-wrap;
        }

        .comparison-column.failed {
            background: var(--bg-error);
            border: 1px solid var(--border-error);
            color: #991b1b;
        }

        .comparison-column.working {
            background: var(--bg-success);
            border: 1px solid var(--border-success);
            color: #047857;
        }

        .comparison-label {
            font-weight: 600;
            margin-bottom: 8px;
            display: block;
            font-size: 0.9em;
        }

        .error-pattern-card {
            background: var(--white);
            border-left: 5px solid #ef4444;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 15px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .error-pattern-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 12px;
            border-bottom: 2px solid var(--grey-border);
        }

        .error-pattern-title {
            color: var(--navy);
            font-weight: 600;
            font-size: 1.05em;
        }

        .error-count-badge {
            background: #ef4444;
            color: var(--white);
            padding: 6px 12px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 0.9em;
        }

        .error-tests-list {
            margin-bottom: 12px;
        }

        .error-tests-list strong {
            color: var(--navy);
            display: block;
            margin-bottom: 8px;
        }

        .error-test-item {
            padding: 6px 12px;
            background: var(--grey-light);
            margin: 6px 0;
            border-radius: 4px;
            font-size: 0.9em;
            border-left: 3px solid #ef4444;
        }

        .error-example {
            background: var(--bg-error);
            border: 1px solid var(--border-error);
            padding: 12px;
            border-radius: 4px;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            font-size: 0.85em;
            color: #991b1b;
            line-height: 1.6;
            max-height: 150px;
            overflow-y: auto;
        }

        .selector-showcase {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 15px;
        }

        .selector-card {
            background: var(--white);
            border: 1px solid var(--grey-border);
            border-radius: 6px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .selector-card-header {
            background: var(--grey-light);
            padding: 12px 15px;
            border-bottom: 2px solid var(--navy);
            font-weight: 600;
            color: var(--navy);
        }

        .selector-card-body {
            padding: 15px;
        }

        .selector-type {
            display: inline-block;
            background: var(--navy);
            color: var(--white);
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 0.75em;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .selector-code {
            background: #f9fafb;
            border: 1px solid var(--grey-border);
            padding: 12px;
            border-radius: 4px;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            font-size: 0.85em;
            word-break: break-all;
            line-height: 1.6;
            max-height: 200px;
            overflow-y: auto;
        }

        .selector-usage {
            margin-top: 12px;
            padding-top: 12px;
            border-top: 1px solid var(--grey-border);
            font-size: 0.9em;
            color: var(--text-secondary);
        }

        .selector-usage strong {
            color: var(--navy);
        }

        .suite-group {
            margin-bottom: 30px;
            border: 2px solid #0d9488;
            border-radius: 8px;
            overflow: hidden;
        }

        .suite-header {
            background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
            color: var(--white);
            padding: 15px 20px;
            font-weight: 600;
            font-size: 1.1em;
        }

        .suite-tests {
            padding: 15px;
        }

        .test-item-line {
            padding: 8px 0;
            border-bottom: 1px solid var(--grey-border);
            font-size: 0.95em;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-word;
            color: var(--text-primary);
        }

        .test-item-line:last-child {
            border-bottom: none;
        }

        .code-line {
            display: flex;
            padding: 6px 0;
            border-left: 3px solid transparent;
            margin: 0;
            align-items: flex-start;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-all;
        }

        .error-text .code-line {
            border-left-color: #fca5a5;
        }

        .fix-text .code-line {
            border-left-color: #6ee7b7;
        }

        .analysis-text .test-item-line {
            white-space: normal;
            word-break: break-word;
        }

        .line-num {
            color: var(--grey);
            display: inline-block;
            min-width: 45px;
            text-align: right;
            margin-right: 15px;
            font-size: 0.85em;
            flex-shrink: 0;
            font-weight: 500;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            user-select: none;
            padding: 0 5px;
        }

        .code-text {
            flex: 1;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-all;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            overflow-wrap: break-word;
        }

        .code-truncated {
            padding: 8px 0;
            color: var(--grey);
            font-style: italic;
            font-size: 0.8em;
            text-align: center;
            border-top: 1px dashed var(--grey-border);
            margin-top: 4px;
        }

        .error-kw {
            color: #991b1b;
            font-weight: bold;
        }

        .error-warn {
            color: #dc2626;
            font-weight: bold;
        }

        .error-prep {
            color: #7c2d12;
            font-weight: 600;
        }

        .fix-keyword {
            color: var(--navy);
            font-weight: bold;
        }

        .fix-action {
            color: var(--green);
            font-weight: bold;
        }

        .fix-syntax {
            color: #6366f1;
            font-weight: 600;
        }

        .fix-string {
            color: #d946ef;
            font-weight: normal;
        }

        .log-stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }

        .log-stat-card {
            background: var(--grey-light);
            border-radius: 6px;
            padding: 15px;
            text-align: center;
            border: 1px solid var(--grey-border);
        }

        .log-stat-card h4 {
            color: var(--navy);
            margin-bottom: 8px;
            font-size: 0.9em;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .log-stat-card .value {
            font-size: 1.8em;
            font-weight: bold;
            color: var(--green);
        }

        ::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }

        ::-webkit-scrollbar-track {
            background: var(--grey-light);
        }

        ::-webkit-scrollbar-thumb {
            background: var(--grey);
            border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
            background: var(--navy);
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 1.8em;
            }
            .content {
                padding: 20px;
            }
            .summary {
                grid-template-columns: 1fr;
            }
            .locator-comparison {
                grid-template-columns: 1fr;
            }
            .tab-button {
                font-size: 0.75em;
                min-width: 100px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <span>✨</span>
                Self Healer report by Gemini
            </h1>
            <p>Automated Test Analysis & Fixing Session</p>
        </div>

        <div class="content">
            <!-- TAB NAVIGATION -->
            <div class="tabs-container">
                <button class="tab-button active" onclick="switchTab(event, 'overview')">📊 Overview</button>
                <button class="tab-button" onclick="switchTab(event, 'locators')">🔧 Locator Changes</button>
                <button class="tab-button" onclick="switchTab(event, 'errors')">⚠️ Error Patterns</button>
                <button class="tab-button" onclick="switchTab(event, 'selectors')">🎯 Selectors</button>
                <button class="tab-button" onclick="switchTab(event, 'results')">📋 Test Results</button>
            </div>

            <!-- TAB 1: OVERVIEW -->
            <div id="overview" class="tab-content active">
                <div class="summary">
                    <div class="stat-card">
                        <p>Tests Analyzed</p>
                        <h3>${healingResults.totalTests}</h3>
                    </div>
                    <div class="stat-card success">
                        <p>Tests Fixed</p>
                        <h3>${healingResults.fixedCount}</h3>
                    </div>
                    <div class="stat-card success">
                        <p>Tests Verified</p>
                        <h3>${healingResults.verifiedCount}</h3>
                    </div>
                    <div class="stat-card">
                        <p>Success Rate</p>
                        <h3>${healingResults.successRate}%</h3>
                    </div>
                </div>

                <div class="results" style="margin-top: 30px;">
                    <h2>📈 Session Summary</h2>
                    <div style="background: var(--grey-light); padding: 20px; border-radius: 6px; border-left: 5px solid var(--navy); line-height: 2;">
                        <p><strong style="color: var(--navy);">Session Duration:</strong> <span style="color: var(--grey);">${healingResults.duration}</span></p>
                        <p><strong style="color: var(--navy);">Total Tests Analyzed:</strong> <span style="color: var(--grey);">${healingResults.totalTests}</span></p>
                        <p><strong style="color: var(--navy);">Tests Fixed:</strong> <span style="color: var(--green);">${healingResults.fixedCount}</span></p>
                        <p><strong style="color: var(--navy);">Tests Verified:</strong> <span style="color: var(--green);">${healingResults.verifiedCount}</span></p>
                        <p><strong style="color: var(--navy);">Success Rate:</strong> <span style="color: var(--green);">${healingResults.successRate}%</span></p>
                        <p><strong style="color: var(--navy);">Generated:</strong> <span style="color: var(--grey);">${new Date().toLocaleString()}</span></p>
                    </div>
                </div>

                ${healingLogs ? `
                <div class="results" style="margin-top: 30px;">
                    <h2>📊 Healing Statistics</h2>
                    <div class="log-stats-grid">
                        <div class="log-stat-card">
                            <h4>Total Events</h4>
                            <div class="value">${healingLogs.statistics?.totalEvents || 0}</div>
                        </div>
                        <div class="log-stat-card">
                            <h4>Failed Locators</h4>
                            <div class="value">${healingLogs.statistics?.failedLocators || 0}</div>
                        </div>
                        <div class="log-stat-card">
                            <h4>Working Locators</h4>
                            <div class="value">${healingLogs.statistics?.workedLocators || 0}</div>
                        </div>
                        <div class="log-stat-card">
                            <h4>Elements Healed</h4>
                            <div class="value">${healingLogs.statistics?.elementsHealed || 0}</div>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- TAB 2: LOCATOR CHANGES -->
            <div id="locators" class="tab-content">
                <div class="results">
                    <h2>🔧 All Changes Applied</h2>
                    ${locatorChanges.length > 0 ? `
                        <div class="locator-fix-grid">
                            ${locatorChanges.map((change, idx) => {
                                // Determine change type icon
                                let icon = '⚙️';
                                let changeTypeLabel = 'CHANGE';
                                let changeTypeColor = '#6b7280';
                                
                                if (change.changeType === 'selector') {
                                  icon = '🎯';
                                  changeTypeLabel = 'SELECTOR';
                                  changeTypeColor = '#1e3a8a';
                                } else if (change.changeType === 'text') {
                                  icon = '📝';
                                  changeTypeLabel = 'TEXT';
                                  changeTypeColor = '#2563eb';
                                } else if (change.changeType === 'url') {
                                  icon = '🔗';
                                  changeTypeLabel = 'URL';
                                  changeTypeColor = '#7c3aed';
                                } else if (change.changeType === 'architecture') {
                                  icon = '🏗️';
                                  changeTypeLabel = 'ARCHITECTURE';
                                  changeTypeColor = '#ec4899';
                                }
                                
                                const confidenceSpan = change.confidence ? '<span>📊 ' + change.confidence + '% confidence</span>' : '';
                                const decisionInfo = change.decision ? '<strong>Decision:</strong> ' + change.decision + '<br>' : '';
                                const durationInfo = change.duration ? '<br><strong>Resolution:</strong> ' + change.duration + 'ms' : '';
                                
                                return '<div class="locator-fix-card">' +
                                  '<div class="locator-fix-header">' +
                                    '<div style="display: flex; gap: 10px; align-items: center;">' +
                                      '<span style="background: ' + changeTypeColor + '; color: white; padding: 4px 8px; border-radius: 3px; font-size: 0.75em; font-weight: 600;">' + icon + ' ' + changeTypeLabel + '</span>' +
                                      '<strong>' + escapeHtmlNode(change.elementName) + '</strong>' +
                                    '</div>' +
                                    '<div style="font-size: 0.85em; margin-top: 8px; opacity: 0.9; display: flex; gap: 15px; flex-wrap: wrap;">' +
                                      '<span>Fixed at ' + new Date(change.timestamp).toLocaleTimeString() + '</span>' +
                                      confidenceSpan +
                                    '</div>' +
                                  '</div>' +
                                  '<div class="locator-fix-body">' +
                                    '<div class="locator-comparison">' +
                                      '<div>' +
                                        '<span class="comparison-label">❌ Before (Failed)</span>' +
                                        '<div class="comparison-column failed">' + escapeHtmlNode(change.failedLocator) + '</div>' +
                                      '</div>' +
                                      '<div>' +
                                        '<span class="comparison-label">✅ After (Fixed)</span>' +
                                        '<div class="comparison-column working">' + escapeHtmlNode(change.workingLocator) + '</div>' +
                                      '</div>' +
                                    '</div>' +
                                    '<div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--grey-border); font-size: 0.9em; color: var(--text-secondary);">' +
                                      '<strong>Change Type:</strong> ' + changeTypeLabel + '<br>' +
                                      decisionInfo +
                                      durationInfo +
                                    '</div>' +
                                  '</div>' +
                                '</div>';
                            }).join('')}
                        </div>
                    ` : `
                        <div class="verification-box success" style="text-align: center; padding: 30px;">
                            ✅ No changes applied - All tests passed on first run!
                        </div>
                    `}
                </div>
            </div>

            <!-- TAB 3: ERROR PATTERNS -->
            <div id="errors" class="tab-content">
                <div class="results">
                    <h2>⚠️ Error Patterns Analysis</h2>
                    ${Object.keys(errorPatterns).length > 0 ? `
                        <div>
                            ${Object.entries(errorPatterns).map(([errorType, pattern]) => `
                                <div class="error-pattern-card">
                                    <div class="error-pattern-header">
                                        <span class="error-pattern-title">${escapeHtmlNode(errorType)}</span>
                                        <span class="error-count-badge">${pattern.count} test${pattern.count !== 1 ? 's' : ''}</span>
                                    </div>
                                    
                                    <div class="error-tests-list">
                                        <strong>Affected Tests:</strong>
                                        ${pattern.tests.map(test => `
                                            <div class="error-test-item">• ${escapeHtmlNode(test)}</div>
                                        `).join('')}
                                    </div>

                                    ${pattern.examples.length > 0 ? `
                                        <div style="margin-top: 12px;">
                                            <strong style="color: var(--navy); display: block; margin-bottom: 8px;">Example Error:</strong>
                                            <div class="error-example">
                                                ${escapeHtmlNode(pattern.examples[0])}
                                            </div>
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="verification-box success" style="text-align: center; padding: 30px;">
                            ✅ No error patterns detected - All tests clean!
                        </div>
                    `}
                </div>
            </div>

            <!-- TAB 4: SELECTORS -->
            <div id="selectors" class="tab-content">
                <div class="results">
                    <h2>🎯 All Changes & Selectors Analyzed</h2>
                    ${allSelectors.length > 0 ? `
                        <div class="selector-showcase">
                            ${allSelectors.map((selector, idx) => {
                                // Determine change type icon and label
                                let icon = '⚙️';
                                let typeLabel = selector.changeType.toUpperCase();
                                let typeColor = '#6b7280';
                                
                                if (selector.changeType === 'selector') {
                                  icon = '🎯';
                                  typeLabel = 'SELECTOR';
                                  typeColor = '#1e3a8a';
                                } else if (selector.changeType === 'text') {
                                  icon = '📝';
                                  typeLabel = 'TEXT';
                                  typeColor = '#2563eb';
                                } else if (selector.changeType === 'url') {
                                  icon = '🔗';
                                  typeLabel = 'URL';
                                  typeColor = '#7c3aed';
                                } else if (selector.changeType === 'architecture') {
                                  icon = '🏗️';
                                  typeLabel = 'ARCHITECTURE';
                                  typeColor = '#ec4899';
                                }
                                
                                const changedBadge = selector.hasChanged ? 
                                  '<span class="selector-type" style="background: var(--green);">✅ CHANGED</span>' : 
                                  '<span class="selector-type" style="background: #9ca3af;">⚪ NO CHANGE</span>';
                                
                                const confidenceBadge = selector.confidence ? 
                                  '<span class="selector-type" style="background: #f59e0b; font-size: 0.75em;">📊 ' + selector.confidence + '% confidence</span>' : 
                                  '';
                                
                                const changeContent = selector.hasChanged ?
                                  '<div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);"><strong>❌ Before (Failed):</strong></div>' +
                                  '<div class="selector-code" style="background: var(--bg-error); border-color: var(--border-error); color: #991b1b; margin-bottom: 10px;">' + escapeHtmlNode(selector.failedLocator) + '</div>' +
                                  '<div style="font-size: 0.9em; color: var(--text-secondary);"><strong>✅ After (Fixed):</strong></div>' +
                                  '<div class="selector-code" style="background: var(--bg-success); border-color: var(--border-success); color: #047857;">' + escapeHtmlNode(selector.workingLocator) + '</div>' :
                                  '<div style="margin-top: 10px; font-size: 0.9em; color: var(--text-secondary);"><strong>' + typeLabel + ':</strong></div>' +
                                  '<div class="selector-code">' + escapeHtmlNode(selector.workingLocator) + '</div>';
                                
                                const decisionInfo = selector.decision ? '<br><strong>Decision:</strong> ' + selector.decision : '';
                                
                                return '<div class="selector-card">' +
                                  '<div class="selector-card-header">' + escapeHtmlNode(selector.elementName) + '</div>' +
                                  '<div class="selector-card-body">' +
                                    '<div style="display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap;">' +
                                      '<span class="selector-type" style="background: ' + typeColor + ';">' + icon + ' ' + typeLabel + '</span>' +
                                      changedBadge +
                                      confidenceBadge +
                                    '</div>' +
                                    changeContent +
                                    '<div class="selector-usage" style="margin-top: 12px;">' +
                                      '<strong>Element:</strong> ' + escapeHtmlNode(selector.elementName) + '<br>' +
                                      '<strong>Type:</strong> ' + typeLabel + '<br>' +
                                      '<strong>Status:</strong> ' + (selector.hasChanged ? '✅ Fixed' : '✅ Working') + decisionInfo +
                                    '</div>' +
                                  '</div>' +
                                '</div>';
                            }).join('')}
                        </div>
                    ` : `
                        <div class="verification-box warning" style="text-align: center; padding: 30px;">
                            ℹ️ No change data available - Run the healer to collect healing information.
                        </div>
                    `}
                </div>
            </div>

            <!-- TAB 5: TEST RESULTS -->
            <div id="results" class="tab-content">
                <div class="results">
                    <h2>📋 Detailed Test Results</h2>
                    ${(() => {
                        const suites = {};
                        healingResults.tests.forEach(test => {
                            const suite = test.file || 'Unknown Suite';
                            if (!suites[suite]) {
                                suites[suite] = [];
                            }
                            suites[suite].push(test);
                        });

                        return Object.entries(suites).map(([suite, tests]) => `
                            <div class="suite-group">
                                <div class="suite-header">📦 ${suite}</div>
                                <div class="suite-tests">
                                    ${tests.map((test, testIdx) => {
                                        const statusClass = test.verified ? 'success' : 'failed';
                                        const statusText = test.verified ? '✅ FIXED & VERIFIED' : test.fixed ? '⚠️ FIXED (UNVERIFIED)' : '❌ NOT FIXED';
                                        const statusBadgeClass = test.verified ? 'success' : test.fixed ? 'warning' : 'failed';
                                        const errorPreview = stripAnsiCodes(test.error || 'No error details available');
                                        const analysisPreview = stripAnsiCodes(test.analysis || 'No analysis available');

                                        return `
                                            <div class="test-result ${statusClass}" data-test-id="${testIdx}">
                                                <div class="test-header">
                                                    <div>
                                                        <span class="status-badge ${statusBadgeClass}">${statusText}</span>
                                                        <span class="test-title">${test.title}</span>
                                                    </div>
                                                    <span class="expand-icon">▶</span>
                                                </div>
                                                <div class="test-content">
                                                    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--grey-border);">
                                                        <strong style="color: var(--navy);">Test Name:</strong> ${test.title}
                                                        <br><strong style="color: var(--navy); margin-top: 8px; display: block;">Error Type:</strong> <span style="color: var(--grey);">${test.errorType}</span>
                                                    </div>

                                                    <div class="subsection expanded">
                                                        <div class="subsection-header" onclick="toggleSubsection(this)">
                                                            <span><span class="subsection-icon">▶</span>❌ Error Details</span>
                                                        </div>
                                                        <div class="subsection-content">
                                                            <div class="error-text">${formatCodeWithLineNumbers(errorPreview, 'error', 100)}</div>
                                                        </div>
                                                    </div>

                                                    ${test.analysis ? `
                                                    <div class="subsection">
                                                        <div class="subsection-header" onclick="toggleSubsection(this)">
                                                            <span><span class="subsection-icon">▶</span>🤖 AI Analysis</span>
                                                        </div>
                                                        <div class="subsection-content">
                                                            <div class="error-text" style="background: #f0f9ff; border-color: #bae6fd;">
                                                                ${analysisPreview.split('\n').map(line => {
                                                                    const trimmed = line.trim();
                                                                    if (!trimmed) return '';
                                                                    // Remove leading bullet points and asterisks
                                                                    const cleaned = trimmed.replace(/^[\s•*\-]\s*/, '');
                                                                    return '<div class="test-item-line">' + escapeHtmlNode(cleaned) + '</div>';
                                                                }).join('')}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    ` : ''}

                                                    ${test.fixedCode ? `
                                                    <div class="subsection">
                                                        <div class="subsection-header" onclick="toggleSubsection(this)">
                                                            <span><span class="subsection-icon">▶</span>✅ ${test.fixed ? 'Applied' : 'Suggested'} Fix</span>
                                                        </div>
                                                        <div class="subsection-content">
                                                            <div class="fix-text">${formatCodeWithLineNumbers(stripAnsiCodes(test.fixedCode), 'fix', 100)}</div>
                                                        </div>
                                                    </div>
                                                    ` : ''}

                                                    ${test.verified ? `
                                                    <div class="verification-box success">
                                                        ✅ Test Re-run Passed - Error has been resolved!
                                                    </div>
                                                    ` : test.fixed ? `
                                                    <div class="verification-box warning">
                                                        ⚠️ Fix Applied - Manual verification recommended
                                                    </div>
                                                    ` : `
                                                    <div class="verification-box error">
                                                        ❌ Unable to fix this test - Review error details
                                                    </div>
                                                    `}
                                                </div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `).join('');
                    })()}
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🔧 <strong>Gemini-Powered Playwright Test Healer</strong></p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        function switchTab(event, tabName) {
            // Hide all tabs
            const tabs = document.querySelectorAll('.tab-content');
            tabs.forEach(tab => tab.classList.remove('active'));
            
            // Remove active class from all buttons
            const buttons = document.querySelectorAll('.tab-button');
            buttons.forEach(btn => btn.classList.remove('active'));
            
            // Show selected tab
            const selectedTab = document.getElementById(tabName);
            if (selectedTab) {
                selectedTab.classList.add('active');
            }
            
            // Mark button as active
            event.target.classList.add('active');
        }

        function toggleTestResult(headerElement) {
            const testResult = headerElement.parentElement;
            testResult.classList.toggle('expanded');
        }

        function toggleSubsection(headerElement) {
            const subsection = headerElement.parentElement;
            subsection.classList.toggle('expanded');
        }

        document.addEventListener('DOMContentLoaded', function() {
            const firstResult = document.querySelector('.test-result');
            if (firstResult) {
                firstResult.classList.add('expanded');
            }

            document.querySelectorAll('.subsection-header').forEach(header => {
                header.addEventListener('click', toggleSubsection);
            });

            document.querySelectorAll('.test-header').forEach(header => {
                header.addEventListener('click', function(e) {
                    if (e.target.closest('.subsection-header')) {
                        e.stopPropagation();
                        return;
                    }
                    toggleTestResult(this);
                });
            });
        });
    </script>
</body>
</html>`;

  const reportPath = path.join(reportDir, `healer-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
  fs.writeFileSync(reportPath, htmlContent, 'utf8');
  
  console.log(`\n📊 HTML Report generated: ${reportPath}`);
  
  // Generate index.html listing all reports
  generateReportIndex(reportDir);
  
  return reportPath;
}

/**
 * Generate an index.html file listing all available healer reports
 */
function generateReportIndex(reportDir) {
  try {
    const files = fs.readdirSync(reportDir)
      .filter(f => f.match(/^healer-report-.*\.html$/))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(reportDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);
    
    const reportList = files.map(f => {
      const date = new Date(f.time).toLocaleString();
      return `<tr>
        <td><a href="${f.name}" target="_blank">${f.name}</a></td>
        <td>${date}</td>
      </tr>`;
    }).join('\n');
    
    const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Healer Reports - Index</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 40px 20px; }
    .container { max-width: 900px; margin: 0 auto; }
    h1 { color: white; margin-bottom: 30px; text-align: center; }
    table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 40px rgba(0,0,0,0.2); width: 100%; }
    th, td { padding: 15px; text-align: left; border-bottom: 1px solid #eef2f5; }
    th { background: #f7f9fc; font-weight: 600; color: #333; }
    tr:hover { background: #f7f9fc; }
    a { color: #667eea; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
    .no-reports { color: white; text-align: center; padding: 50px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Healer Reports</h1>
    ${files.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>Report</th>
          <th>Generated</th>
        </tr>
      </thead>
      <tbody>
        ${reportList}
      </tbody>
    </table>
    ` : '<div class="no-reports"><h2>No reports available yet</h2></div>'}
  </div>
</body>
</html>`;
    
    const indexPath = path.join(reportDir, 'index.html');
    fs.writeFileSync(indexPath, indexContent, 'utf8');
    console.log(`📑 Report index updated: ${indexPath}`);
  } catch (err) {
    console.warn(`⚠️  Could not generate report index: ${err.message}`);
  }
}

export { generateHtmlReport, escapeHtmlNode, loadHealingLogs, extractLocatorChanges, extractAllSelectors, extractErrorPatterns, categorizeErrorType };
