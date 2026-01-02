#!/usr/bin/env node

/**
 * Gemini Healer - HTML Report Generator (Enhanced)
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
      highlighted = escapedLine
        .replace(/\b(test|it|describe|expect|async|await)\b/g, '<span class="fix-keyword">$1</span>')
        .replace(/\b(page\.|locator|click|fill|type|goto|navigate|waitFor)\b/g, '<span class="fix-action">$1</span>')
        .replace(/\b(const|let|var|function|return|if|else|for|while)\b/g, '<span class="fix-syntax">$1</span>')
        .replace(/('.*?'|".*?"|`.*?`)/g, '<span class="fix-string">$1</span>');
    }
    
    return `<div class="code-line"><span class="line-num">${paddedNum}</span><span class="code-text">${highlighted}</span></div>`;
  }).join('');
  
  if (hasMore) {
    html += `<div class="code-truncated">... ${totalLines - maxLines} more lines</div>`;
  }
  
  return html;
}

/**
 * Generate HTML report for healer session
 */
function generateHtmlReport(healingResults) {
  const reportDir = path.join(process.cwd(), 'test-results');
  
  // Ensure directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

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
            max-width: 1200px;
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
            word-break: break-word;
            white-space: pre-wrap;
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
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-word;
            resize: both;
        }

        .error-text {
            background: var(--bg-error);
            border-color: var(--border-error);
        }

        .fix-text {
            background: var(--bg-success);
            border-color: var(--border-success);
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
        }

        .test-item-line:last-child {
            border-bottom: none;
        }

        .test-item-bullet {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid var(--grey-border);
        }

        .test-item-bullet:last-child {
            border-bottom: none;
        }

        .bullet-point {
            margin-right: 12px;
            color: #0d9488;
            font-weight: bold;
            min-width: 20px;
        }

        .bullet-content {
            flex: 1;
            word-break: break-word;
        }

        .code-line {
            display: flex;
            padding: 2px 0;
            border-left: 3px solid transparent;
            margin: 0;
            align-items: flex-start;
        }

        .error-text .code-line {
            border-left-color: #fca5a5;
        }

        .fix-text .code-line {
            border-left-color: #6ee7b7;
        }

        .line-num {
            color: var(--grey);
            display: inline-block;
            min-width: 40px;
            text-align: right;
            margin-right: 12px;
            font-size: 0.85em;
            flex-shrink: 0;
            font-weight: 500;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
            user-select: none;
        }

        .code-text {
            flex: 1;
            white-space: pre-wrap;
            word-wrap: break-word;
            word-break: break-word;
            font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
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

        /* Syntax highlighting classes */
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

        /* Scrollbar styling */
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

        /* Responsive design */
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

            <div class="results">
                <h2>📋 Test Results</h2>
                ${(() => {
                    // Group tests by file/suite
                    const suites = {};
                    healingResults.tests.forEach(test => {
                        const suite = test.file || 'Unknown Suite';
                        if (!suites[suite]) {
                            suites[suite] = [];
                        }
                        suites[suite].push(test);
                    });

                    // Generate HTML for each suite
                    return Object.entries(suites).map(([suite, tests]) => `
                        <div class="suite-group">
                            <div class="suite-header">📦 ${suite}</div>
                            <div class="suite-tests">
                                ${tests.map((test, testIdx) => {
                                    const statusClass = test.verified ? 'success' : 'failed';
                                    const statusText = test.verified ? '✅ FIXED & VERIFIED' : test.fixed ? '⚠️ FIXED (UNVERIFIED)' : '❌ NOT FIXED';
                                    const statusBadgeClass = test.verified ? 'success' : test.fixed ? 'warning' : 'failed';
                                    const errorPreview = test.error || 'No error details available';
                                    const analysisPreview = test.analysis || 'No analysis available';

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
                                                        <div style="padding: 10px; border-radius: 4px;">
                                                            ${escapeHtmlNode(analysisPreview).split('\n').map(line => 
                                                                line.trim() ? `<div class="test-item-line">• ${line}</div>` : ''
                                                            ).join('')}
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
                                                        <div class="fix-text">${formatCodeWithLineNumbers(test.fixedCode, 'fix', 100)}</div>
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

            <div class="results">
                <h2>📊 Session Summary</h2>
                <div style="background: var(--grey-light); padding: 20px; border-radius: 6px; border-left: 5px solid var(--navy); line-height: 2;">
                    <p><strong style="color: var(--navy);">Session Duration:</strong> <span style="color: var(--grey);">${healingResults.duration}</span></p>
                    <p><strong style="color: var(--navy);">Total Tests Analyzed:</strong> <span style="color: var(--grey);">${healingResults.totalTests}</span></p>
                    <p><strong style="color: var(--navy);">Tests Fixed:</strong> <span style="color: var(--green);">${healingResults.fixedCount}</span></p>
                    <p><strong style="color: var(--navy);">Tests Verified:</strong> <span style="color: var(--green);">${healingResults.verifiedCount}</span></p>
                    <p><strong style="color: var(--navy);">Success Rate:</strong> <span style="color: var(--green);">${healingResults.successRate}%</span></p>
                    <p><strong style="color: var(--navy);">Generated:</strong> <span style="color: var(--grey);">${new Date().toLocaleString()}</span></p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🔧 <strong>Gemini-Powered Playwright Test Healer</strong></p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        // Toggle test result visibility
        function toggleTestResult(headerElement) {
            const testResult = headerElement.parentElement;
            testResult.classList.toggle('expanded');
        }

        // Toggle subsection visibility
        function toggleSubsection(headerElement) {
            const subsection = headerElement.parentElement;
            subsection.classList.toggle('expanded');
        }

        // Initialize on DOM load
        document.addEventListener('DOMContentLoaded', function() {
            // Auto-expand first test result
            const firstResult = document.querySelector('.test-result');
            if (firstResult) {
                firstResult.classList.add('expanded');
            }

            // Add click handlers to all subsection headers
            document.querySelectorAll('.subsection-header').forEach(header => {
                header.addEventListener('click', toggleSubsection);
            });

            // Add click handlers to all test headers
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
  return reportPath;
}

export { generateHtmlReport, escapeHtmlNode };
