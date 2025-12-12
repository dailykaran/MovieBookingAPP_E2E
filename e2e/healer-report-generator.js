#!/usr/bin/env node

/**
 * Gemini Healer - HTML Report Generator
 * Generates professional HTML reports for test healing sessions
 */

import fs from 'fs';
import path from 'path';

/**
 * Helper function to escape HTML special characters
 */
function escapeHtmlNode(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate HTML report for healer session
 */
function generateHtmlReport(healingResults) {
  const timestamp = new Date().toISOString();
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
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 10px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
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
            font-size: 1.1em;
            opacity: 0.9;
        }
        .content {
            padding: 30px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            border-left: 5px solid #667eea;
            padding: 20px;
            border-radius: 5px;
            text-align: center;
        }
        .stat-card h3 {
            color: #667eea;
            font-size: 2.5em;
            margin: 10px 0;
        }
        .stat-card p {
            color: #666;
            font-size: 0.95em;
        }
        .results {
            margin-bottom: 30px;
        }
        .results h2 {
            color: #333;
            margin-bottom: 20px;
            font-size: 1.8em;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .test-result {
            background: #f8f9fa;
            border: 1px solid #e0e0e0;
            border-radius: 5px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .test-result.success {
            border-left: 5px solid #28a745;
            background: #f0f8f5;
        }
        .test-result.failed {
            border-left: 5px solid #dc3545;
            background: #fdf8f7;
        }
        .test-header {
            background: #f0f0f0;
            padding: 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-weight: 600;
        }
        .test-result.success .test-header {
            background: #e8f5e9;
        }
        .test-result.failed .test-header {
            background: #ffebee;
        }
        .test-content {
            padding: 15px;
            display: none;
        }
        .test-result.expanded .test-content {
            display: block;
        }
        .alignment-flow {
            display: grid;
            grid-template-columns: 1fr auto 1fr auto 1fr;
            gap: 10px;
            align-items: start;
            margin: 20px 0;
        }
        .flow-section {
            background: #f8f9fa;
            border: 2px solid #e0e0e0;
            border-radius: 5px;
            padding: 12px;
        }
        .flow-section.error {
            background: #fff5f5;
            border-color: #ffcccc;
        }
        .flow-section.analysis {
            background: #f0f4ff;
            border-color: #cce0ff;
        }
        .flow-section.fix {
            background: #f0f8f5;
            border-color: #c3e6cb;
        }
        .flow-arrow {
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5em;
            color: #667eea;
            font-weight: bold;
        }
        .flow-title {
            font-size: 0.85em;
            font-weight: 600;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .flow-content {
            font-size: 0.85em;
            line-height: 1.4;
            color: #333;
            max-height: 150px;
            overflow-y: auto;
        }
        .error-section {
            margin: 15px 0;
        }
        .error-section h4 {
            color: #dc3545;
            margin-bottom: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .error-text {
            background: white;
            border: 1px solid #ffcccc;
            border-radius: 3px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
            color: #666;
        }
        .analysis-section {
            margin: 15px 0;
        }
        .analysis-section h4 {
            color: #0056b3;
            margin-bottom: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .analysis-text {
            background: white;
            border: 1px solid #cce0ff;
            border-radius: 3px;
            padding: 10px;
            font-size: 0.9em;
            color: #333;
            line-height: 1.5;
        }
        .fix-section {
            margin: 15px 0;
        }
        .fix-section h4 {
            color: #28a745;
            margin-bottom: 10px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .fix-text {
            background: #f5f5f5;
            border: 1px solid #c3e6cb;
            border-radius: 3px;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            overflow-x: auto;
            color: #333;
        }
        .connection-line {
            text-align: center;
            color: #999;
            font-size: 0.8em;
            margin: 5px 0;
        }
        .status-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 600;
        }
        .status-badge.success {
            background: #d4edda;
            color: #155724;
        }
        .status-badge.failed {
            background: #f8d7da;
            color: #721c24;
        }
        .status-badge.warning {
            background: #fff3cd;
            color: #856404;
        }
        .expand-icon {
            font-size: 1.2em;
            transition: transform 0.2s;
        }
        .test-result.expanded .expand-icon {
            transform: rotate(90deg);
        }
        .footer {
            background: #f8f9fa;
            border-top: 1px solid #e0e0e0;
            padding: 20px 30px;
            text-align: center;
            color: #666;
            font-size: 0.9em;
        }
        .icon {
            font-size: 1.5em;
        }
        code {
            background: #f0f0f0;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <span class="icon">🔧</span>
                Gemini Healer Report
            </h1>
            <p>Automated Test Healing & Fixing Session</p>
        </div>

        <div class="content">
            <div class="summary">
                <div class="stat-card">
                    <p>Tests Analyzed</p>
                    <h3>${healingResults.totalTests}</h3>
                </div>
                <div class="stat-card">
                    <p>Tests Fixed</p>
                    <h3>${healingResults.fixedCount}</h3>
                </div>
                <div class="stat-card">
                    <p>Tests Verified</p>
                    <h3>${healingResults.verifiedCount}</h3>
                </div>
                <div class="stat-card">
                    <p>Success Rate</p>
                    <h3>${healingResults.successRate}%</h3>
                </div>
            </div>

            <div class="results">
                <h2>📋 Healing Results</h2>
                ${healingResults.tests.map((test, idx) => `
                    <div class="test-result ${test.verified ? 'success' : 'failed'}">
                        <div class="test-header" onclick="this.parentElement.classList.toggle('expanded')">
                            <div style="flex: 1;">
                                <span class="status-badge ${test.verified ? 'success' : 'failed'}">
                                    ${test.verified ? '✅ FIXED & VERIFIED' : test.fixed ? '⚠️ FIXED (UNVERIFIED)' : '❌ NOT FIXED'}
                                </span>
                                <span style="margin-left: 15px; font-weight: 600;">${test.file}</span>
                            </div>
                            <span class="expand-icon">▶</span>
                        </div>
                        <div class="test-content">
                            <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #ddd;">
                                <strong style="color: #333;">Test Name:</strong> ${test.title}
                            </div>

                            <!-- Aligned Flow: Error → Analysis → Fix -->
                            <div class="alignment-flow">
                                <div class="flow-section error">
                                    <div class="flow-title">❌ Error</div>
                                    <div class="flow-content">${escapeHtmlNode(test.error.substring(0, 200)).replace(/\n/g, '<br>')}</div>
                                </div>
                                <div class="flow-arrow">→</div>
                                <div class="flow-section analysis">
                                    <div class="flow-title">🤖 Analysis</div>
                                    <div class="flow-content">${test.analysis ? escapeHtmlNode(test.analysis.substring(0, 200)).replace(/\n/g, '<br>') : 'No analysis available'}</div>
                                </div>
                                <div class="flow-arrow">→</div>
                                <div class="flow-section fix">
                                    <div class="flow-title">✅ Fix</div>
                                    <div class="flow-content">${test.fixed ? '✅ Applied successfully' : test.fixedCode ? '📝 Ready to apply' : '❌ Not fixed'}</div>
                                </div>
                            </div>

                            <!-- Detailed Sections -->
                            <hr style="margin: 20px 0; border: none; border-top: 2px solid #e0e0e0;">

                            <div class="error-section">
                                <h4>❌ Original Error Details</h4>
                                <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                                    <span style="background: #f0f0f0; padding: 5px 10px; border-radius: 3px; font-size: 0.85em; font-weight: 600; color: #666;">Type: ${test.errorType}</span>
                                </div>
                                <div class="error-text">${escapeHtmlNode(test.error.substring(0, 800))}</div>
                            </div>

                            ${test.analysis ? `
                            <div class="analysis-section">
                                <h4>🤖 Gemini AI Analysis</h4>
                                <div class="analysis-text">${escapeHtmlNode(test.analysis.substring(0, 1000)).replace(/\n/g, '<br>')}</div>
                                <div class="connection-line" style="margin-top: 10px; font-style: italic; color: #0056b3;">
                                    ↓ Analysis informs the fix below ↓
                                </div>
                            </div>
                            ` : ''}

                            ${test.fixed ? `
                            <div class="fix-section">
                                <h4>✅ Applied Fix</h4>
                                <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 3px; padding: 10px; margin-bottom: 10px; font-size: 0.9em; color: #155724;">
                                    ✓ Fix has been applied to address the error above
                                </div>
                                <div class="fix-text">${escapeHtmlNode(test.fixedCode ? test.fixedCode.substring(0, 800) : 'Code applied successfully')}${test.fixedCode && test.fixedCode.length > 800 ? '\n...' : ''}</div>
                            </div>
                            ` : test.fixedCode ? `
                            <div class="fix-section">
                                <h4>✅ Suggested Fix (Not Applied)</h4>
                                <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 3px; padding: 10px; margin-bottom: 10px; font-size: 0.9em; color: #856404;">
                                    ⚠️ Fix suggested by Gemini to resolve the error - Ready for manual review
                                </div>
                                <div class="fix-text">${escapeHtmlNode(test.fixedCode.substring(0, 800))}${test.fixedCode.length > 800 ? '\n...' : ''}</div>
                            </div>
                            ` : ''}

                            ${test.verified ? `
                            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 3px; padding: 10px; margin-top: 15px; color: #155724; text-align: center;">
                                <strong>✅ Test Re-run Passed</strong> - Error has been resolved and fix is verified!
                            </div>
                            ` : test.fixed ? `
                            <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 3px; padding: 10px; margin-top: 15px; color: #856404; text-align: center;">
                                <strong>⚠️ Fix Applied But Not Verified</strong> - Manual verification recommended
                            </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="results">
                <h2>📊 Summary</h2>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; line-height: 1.8;">
                    <p><strong>Session Duration:</strong> ${healingResults.duration}</p>
                    <p><strong>Total Tests Analyzed:</strong> ${healingResults.totalTests}</p>
                    <p><strong>Tests Fixed:</strong> ${healingResults.fixedCount}</p>
                    <p><strong>Tests Verified:</strong> ${healingResults.verifiedCount}</p>
                    <p><strong>Success Rate:</strong> ${healingResults.successRate}%</p>
                    <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🔧 Gemini-Powered Playwright Test Healer | Report generated on ${new Date().toLocaleString()}</p>
            <p style="margin-top: 10px; color: #999;">This report was automatically generated after test healing operations.</p>
        </div>
    </div>

    <script>
        // Auto-expand first test result
        const firstResult = document.querySelector('.test-result');
        if (firstResult) {
            firstResult.classList.add('expanded');
        }
    </script>
</body>
</html>`;

  const reportPath = path.join(reportDir, `healer-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
  fs.writeFileSync(reportPath, htmlContent, 'utf8');
  
  console.log(`\n📊 HTML Report generated: ${reportPath}`);
  return reportPath;
}

export { generateHtmlReport, escapeHtmlNode };
