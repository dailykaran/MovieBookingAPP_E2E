/**
 * ReportGenerator - OOP Self-Heal HTML Report Generator
 * Generates professional HTML reports with styling from reference implementation
 * Color Scheme: Navy Blue (#1e3a8a), Green (#10b981), Grey (#6b7280)
 */

import fs from 'fs';
import path from 'path';
import { TestInfo, HealingResult } from '../types/index.js';

interface HealingReport {
  timestamp: string;
  duration: string;
  provider: string;
  totalTests: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  successRate: number;
  tests: Array<{
    filePath: string;
    error: string;
    errorType: string;
    analysis: string;
    suggestedFix: string;
    success: boolean;
    timestamp: string;
    aiProvider?: string;
    classification?: {
      type: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      severityScore: number;
      category: string;
    };
    confidence?: number;
    rootCauseAnalysis?: string;
    recommendedApproach?: string;
  }>;
}

/**
 * ReportGenerator class - Generates HTML reports for healing sessions
 */
export class ReportGenerator {
  private reportDir: string;

  /**
   * Initialize report generator
   */
  constructor(reportDir: string = path.join(process.cwd(), 'test-results')) {
    this.reportDir = reportDir;
    this.ensureReportDirectory();
  }

  /**
   * Ensure report directory exists
   */
  private ensureReportDirectory(): void {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Format code with line numbers and syntax highlighting
   */
  private formatCodeWithLineNumbers(code: string, type: 'error' | 'fix' = 'error', maxLines: number = 10): string {
    if (!code) return '<span style="color: #6b7280;">No content available</span>';

    const lines = code.split('\n').slice(0, maxLines);
    const totalLines = code.split('\n').length;
    const hasMore = totalLines > maxLines;
    const lineNumWidth = Math.max(2, totalLines.toString().length);

    let html = lines
      .map((line, idx) => {
        const lineNum = idx + 1;
        const paddedNum = lineNum.toString().padStart(lineNumWidth, ' ');
        const escapedLine = this.escapeHtml(line || ' ');

        let highlighted = escapedLine;

        if (type === 'error') {
          highlighted = escapedLine
            .replace(
              /\b(Error|TypeError|AssertionError|ReferenceError|FAIL)\b/g,
              '<span class="error-kw">$1</span>'
            )
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
      })
      .join('');

    if (hasMore) {
      html += `<div class="code-truncated">... ${totalLines - maxLines} more lines</div>`;
    }

    return html;
  }

  /**
   * Generate CSS styles for the HTML report
   */
  private generateStyles(): string {
    return `
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
        }

        .analysis-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            padding: 18px;
            line-height: 1.7;
        }

        .analysis-content {
            color: #374151;
            font-size: 0.95em;
        }

        .analysis-box h4 {
            font-size: 1.1em;
            margin-bottom: 15px;
        }
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
        }
    `;
  }

  /**
   * Generate JavaScript for interactivity
   */
  private generateScript(): string {
    return `
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
    `;
  }

  /**
   * Generate HTML report
   */
  generateReport(report: HealingReport): string {
    const testResultsHtml = report.tests
      .map((test, idx) => {
        const statusClass = test.success ? 'success' : 'failed';
        const statusText = test.success ? '✅ HEALED & VERIFIED' : '❌ HEALING FAILED';
        const statusBadgeClass = test.success ? 'success' : 'failed';

        return `
            <div class="test-result ${statusClass}">
                <div class="test-header">
                    <div>
                        <span class="status-badge ${statusBadgeClass}">${statusText}</span>
                        <span class="test-title">${this.escapeHtml(test.filePath)}</span>
                    </div>
                    <span class="expand-icon">▶</span>
                </div>
                <div class="test-content">
                    <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid var(--grey-border);">
                        <strong style="color: var(--navy);">Test File:</strong> ${this.escapeHtml(test.filePath)}
                        <br><strong style="color: var(--navy); margin-top: 8px; display: block;">Error Type:</strong> <span style="color: var(--grey);">${this.escapeHtml(test.errorType)}</span>
                        <br><strong style="color: var(--navy); margin-top: 8px; display: block;">Healed At:</strong> <span style="color: var(--grey);">${new Date(test.timestamp).toLocaleString()}</span>
                    </div>

                    <div class="subsection expanded">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>❌ Error Details</span>
                        </div>
                        <div class="subsection-content">
                            <div class="error-text">${this.formatCodeWithLineNumbers(test.error, 'error', 15)}</div>
                        </div>
                    </div>

                    ${test.analysis ? `
                    <div class="subsection">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>🤖 AI Analysis & Summary</span>
                        </div>
                        <div class="subsection-content">
                            <div class="analysis-box">
                                <h4 style="color: var(--navy); margin: 0 0 12px 0; font-size: 1.1em;">Root Cause Analysis</h4>
                                <div class="analysis-content">
                                    ${this.escapeHtml(test.analysis)
                                        .split('\n')
                                        .map(line => {
                                            if (!line.trim()) return '';
                                            // Style different types of analysis lines
                                            if (line.includes('Issue:') || line.includes('Problem:')) {
                                                return `<div style="margin: 10px 0; padding: 10px; background: #fef2f2; border-left: 3px solid #ef4444; border-radius: 3px;"><strong style="color: #991b1b;">⚠️ ${this.escapeHtml(line)}</strong></div>`;
                                            } else if (line.includes('Solution:') || line.includes('Fix:')) {
                                                return `<div style="margin: 10px 0; padding: 10px; background: #f0fdf4; border-left: 3px solid #10b981; border-radius: 3px;"><strong style="color: #047857;">✅ ${this.escapeHtml(line)}</strong></div>`;
                                            } else if (line.includes('Reason:') || line.includes('Why:')) {
                                                return `<div style="margin: 10px 0; padding: 10px; background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 3px;"><strong style="color: #1e40af;">ℹ️ ${this.escapeHtml(line)}</strong></div>`;
                                            } else if (line.includes('•') || line.includes('-')) {
                                                return `<div style="margin: 8px 0 8px 20px; color: #4b5563;">• ${this.escapeHtml(line.replace(/^[\s•-]+/, ''))}</div>`;
                                            } else if (line.trim().length > 0) {
                                                return `<div style="margin: 8px 0; color: #374151; line-height: 1.6;">${this.escapeHtml(line)}</div>`;
                                            }
                                            return '';
                                        })
                                        .join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${test.classification ? `
                    <div class="subsection">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>📊 Error Classification</span>
                        </div>
                        <div class="subsection-content">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px;">
                                <div style="padding: 12px; background: #f0fdf4; border-radius: 4px; border-left: 3px solid #10b981;">
                                    <div style="font-size: 0.85em; color: #6b7280;">Error Type</div>
                                    <div style="font-weight: bold; color: #047857; font-size: 1.1em;">${this.escapeHtml(test.classification.type)}</div>
                                </div>
                                <div style="padding: 12px; background: #eff6ff; border-radius: 4px; border-left: 3px solid #3b82f6;">
                                    <div style="font-size: 0.85em; color: #6b7280;">Severity</div>
                                    <div style="font-weight: bold; color: #1e40af; font-size: 1.1em;">${this.escapeHtml(test.classification.severity)} (${test.classification.severityScore}/100)</div>
                                </div>
                                <div style="padding: 12px; background: #fef3c7; border-radius: 4px; border-left: 3px solid #f59e0b;">
                                    <div style="font-size: 0.85em; color: #6b7280;">Category</div>
                                    <div style="font-weight: bold; color: #92400e; font-size: 1.1em;">${this.escapeHtml(test.classification.category)}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${test.rootCauseAnalysis ? `
                    <div class="subsection">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>🔍 Detailed Root Cause</span>
                        </div>
                        <div class="subsection-content">
                            <div style="padding: 15px; background: #f9fafb; border-radius: 4px; border: 1px solid #e5e7eb; line-height: 1.7; color: #374151;">
                                ${this.escapeHtml(test.rootCauseAnalysis)
                                    .split('\n')
                                    .map(line => line.trim() ? `<div style="margin: 8px 0;">${this.escapeHtml(line)}</div>` : '')
                                    .join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${test.recommendedApproach ? `
                    <div class="subsection">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>💡 Recommended Approach</span>
                        </div>
                        <div class="subsection-content">
                            <div style="padding: 15px; background: #f0fdf4; border-radius: 4px; border: 1px solid #d1fae5; line-height: 1.7; color: #1f2937;">
                                ${this.escapeHtml(test.recommendedApproach)
                                    .split('\n')
                                    .map((line, idx) => {
                                        if (!line.trim()) return '';
                                        if (line.includes('Step') || /^\d+\./.test(line)) {
                                            return `<div style="margin: 10px 0; padding: 10px 0; border-bottom: 1px solid #d1fae5;"><strong style="color: #047857;">📍 ${this.escapeHtml(line)}</strong></div>`;
                                        }
                                        return `<div style="margin: 6px 0 6px 20px;">• ${this.escapeHtml(line)}</div>`;
                                    })
                                    .join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${test.confidence ? `
                    <div class="subsection">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>🎯 Fix Confidence & Metrics</span>
                        </div>
                        <div class="subsection-content">
                            <div style="padding: 15px; background: #f8fafc; border-radius: 4px;">
                                <div style="margin-bottom: 12px;">
                                    <div style="font-size: 0.9em; color: #6b7280; margin-bottom: 4px;">Confidence Level</div>
                                    <div style="display: flex; align-items: center; gap: 10px;">
                                        <div style="flex: 1; background: #e5e7eb; height: 8px; border-radius: 4px; overflow: hidden;">
                                            <div style="background: ${test.confidence >= 80 ? '#10b981' : test.confidence >= 60 ? '#f59e0b' : '#ef4444'}; width: ${test.confidence}%; height: 100%;"></div>
                                        </div>
                                        <div style="font-weight: bold; color: var(--navy); min-width: 50px;">${test.confidence}%</div>
                                    </div>
                                </div>
                                <div style="font-size: 0.85em; color: #6b7280; padding: 8px 0;">
                                    ${test.confidence >= 80 ? '✅ High confidence fix' : test.confidence >= 60 ? '⚠️ Medium confidence fix' : '❌ Low confidence - manual review recommended'}
                                </div>
                            </div>
                        </div>
                    </div>
                    ` : ''}

                    ${test.suggestedFix ? `
                    <div class="subsection">
                        <div class="subsection-header" onclick="toggleSubsection(this)">
                            <span><span class="subsection-icon">▶</span>✅ Applied Fix</span>
                        </div>
                        <div class="subsection-content">
                            <div class="fix-text">${this.formatCodeWithLineNumbers(test.suggestedFix, 'fix', 15)}</div>
                        </div>
                    </div>
                    ` : ''}


                    <div class="verification-box ${test.success ? 'success' : 'error'}">
                        ${test.success ? '✅ Test has been successfully healed!' : '❌ Healing did not resolve the issue'}
                    </div>
                </div>
            </div>
        `;
      })
      .join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OOP Self-Healer Report</title>
    <style>
        ${this.generateStyles()}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <span>✨</span>
                OOP Self-Healer Report
            </h1>
            <p>Automated Test Analysis & Fixing Session</p>
        </div>

        <div class="content">
            <div class="summary">
                <div class="stat-card">
                    <p>Tests Healed</p>
                    <h3>${report.totalTests}</h3>
                </div>
                <div class="stat-card success">
                    <p>Success Count</p>
                    <h3>${report.successCount}</h3>
                </div>
                <div class="stat-card">
                    <p>Failed Count</p>
                    <h3>${report.failedCount}</h3>
                </div>
                <div class="stat-card success">
                    <p>Success Rate</p>
                    <h3>${report.successRate}%</h3>
                </div>
            </div>

            <div class="results">
                <h2>📋 Healing Results</h2>
                <div class="suite-group">
                    <div class="suite-header">📦 Test Files Healed</div>
                    <div class="suite-tests">
                        ${testResultsHtml}
                    </div>
                </div>
            </div>

            <div class="results">
                <h2>📊 Session Summary</h2>
                <div style="background: var(--grey-light); padding: 20px; border-radius: 6px; border-left: 5px solid var(--navy); line-height: 2;">
                    <p><strong style="color: var(--navy);">Provider:</strong> <span style="color: var(--grey);">${this.escapeHtml(report.provider)}</span></p>
                    <p><strong style="color: var(--navy);">Session Duration:</strong> <span style="color: var(--grey);">${report.duration}</span></p>
                    <p><strong style="color: var(--navy);">Total Tests Healed:</strong> <span style="color: var(--grey);">${report.totalTests}</span></p>
                    <p><strong style="color: var(--navy);">Successfully Healed:</strong> <span style="color: var(--green);">${report.successCount}</span></p>
                    <p><strong style="color: var(--navy);">Failed:</strong> <span style="color: #ef4444;">${report.failedCount}</span></p>
                    <p><strong style="color: var(--navy);">Skipped:</strong> <span style="color: var(--grey);">${report.skippedCount}</span></p>
                    <p><strong style="color: var(--navy);">Success Rate:</strong> <span style="color: var(--green);">${report.successRate}%</span></p>
                    <p><strong style="color: var(--navy);">Generated:</strong> <span style="color: var(--grey);">${new Date(report.timestamp).toLocaleString()}</span></p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>🔧 <strong>OOP Self-Healer with ${report.provider} AI</strong></p>
            <p>Report generated on ${new Date().toLocaleString()}</p>
        </div>
    </div>

    <script>
        ${this.generateScript()}
    </script>
</body>
</html>`;

    return htmlContent;
  }

  /**
   * Save report to file
   */
  saveReport(report: HealingReport): string {
    const htmlContent = this.generateReport(report);
    const reportPath = path.join(
      this.reportDir,
      `healer-report-${new Date().toISOString().replace(/[:.]/g, '-')}.html`
    );

    fs.writeFileSync(reportPath, htmlContent, 'utf8');
    console.log(`\n📊 HTML Report generated: ${reportPath}`);

    return reportPath;
  }
}
