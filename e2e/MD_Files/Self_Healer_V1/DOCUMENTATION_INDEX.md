# Gemini Healer - Documentation Index

## 📑 Complete Documentation Reference

This index provides a comprehensive map of all Gemini Healer documentation and features.

---

## 📚 Documentation Files

### 1. **CODE_EXPLANATION.md**
**Purpose:** Deep technical analysis of source code

**Sections:**
- [x] Overview and architecture
- [x] Complete file structure
- [x] gemini-healer.js detailed breakdown (1379 lines)
- [x] healer-report-generator.js detailed breakdown (794 lines)
- [x] Key features and capabilities
- [x] Data flow diagrams
- [x] Configuration details
- [x] Security implementation
- [x] Usage examples

**Best For:** Developers who want to understand internal implementation

**Read Time:** 45-60 minutes

---

### 2. **GEMINI_HEALER_GUIDE.md** (This File)
**Purpose:** Comprehensive practical guide

**Sections:**
- [x] Installation and setup
- [x] Quick start commands
- [x] Step-by-step workflow
- [x] Configuration reference
- [x] How it works (detailed)
- [x] Reports and output
- [x] Security features
- [x] Troubleshooting guide
- [x] Best practices
- [x] Workflow examples

**Best For:** Users setting up and using Gemini Healer

**Read Time:** 30-45 minutes

---

### 3. **QUICK_REFERENCE.md**
**Purpose:** Quick lookup for commands and syntax

**Sections:**
- [x] Command syntax
- [x] Environment variables
- [x] File locations
- [x] Exit codes
- [x] Configuration snippets
- [x] Common patterns
- [x] Troubleshooting checklist

**Best For:** Quick reference while working

**Read Time:** 5-10 minutes

---

## 🎯 Feature Index

### Core Features

#### Test Analysis & Detection
- Location: `gemini-healer.js` lines 550-700
- Function: `getFailedTests()`
- See: CODE_EXPLANATION.md → "Test Detection"

#### Error Classification
- Classification types: 7 categories
- See: GEMINI_HEALER_GUIDE.md → "Error Classification"
- Skipped types: Infrastructure issues

#### AI Analysis (Gemini API)
- Model: `gemini-2.5-flash`
- Location: `gemini-healer.js` lines 710-850
- Function: `analyzeWithGemini()`
- Temperature: 0.7
- Max tokens: 8192
- See: CODE_EXPLANATION.md → "AI Analysis"

#### Code Extraction
- Location: `gemini-healer.js` lines 860-950
- Function: `extractFixedCode()`
- See: CODE_EXPLANATION.md → "Code Extraction & Validation"

#### Fix Application
- Location: `gemini-healer.js` lines 960-1050
- Function: `applyFixes()`
- Atomic writes, backup creation
- See: CODE_EXPLANATION.md → "Fix Application"

#### Verification
- Location: `gemini-healer.js` lines 1110-1180
- Function: `verifyFix()`
- Re-runs Playwright tests
- See: CODE_EXPLANATION.md → "Verification"

#### HTML Report Generation
- Location: `healer-report-generator.js` lines 77-794
- Function: `generateHtmlReport()`
- Professional styling, interactive features
- See: CODE_EXPLANATION.md → "Report Generation"

---

### Security Features

#### Input Validation
- Path validation: `validateFilePath()` - lines 290-310
- Test file validation: `validateTestFileName()` - lines 315-320
- CLI parsing: `parseArgs()` - lines 210-250
- See: GEMINI_HEALER_GUIDE.md → "Security Features" → "Input Validation"

#### Code Security
- Code validation: `validateGeneratedCode()` - lines 325-360
- Syntax validation: `validateTypeScriptSyntax()` - lines 370-400
- Dangerous pattern scanning: 9 patterns checked
- See: GEMINI_HEALER_GUIDE.md → "Security Features" → "Code Security"

#### File Operations
- Atomic writes: `atomicFileWrite()` - lines 420-440
- Backup creation: `createBackup()` - lines 410-420
- Rollback: `rollbackFix()` - lines 1060-1100
- See: CODE_EXPLANATION.md → "Backup Management"

#### Audit Logging
- Audit log function: `auditLog()` - lines 350-375
- Logs all file operations
- JSON format with timestamp
- See: GEMINI_HEALER_GUIDE.md → "Audit Log"

#### HTML Escaping
- Function: `escapeHtmlNode()` - healer-report-generator.js lines 13-25
- Prevents XSS attacks
- All user content escaped

---

### Configuration Options

#### API Configuration
```
GEMINI_API_KEY              Required - API authentication
```
See: GEMINI_HEALER_GUIDE.md → "Configuration" → "Environment Variables"

#### Behavior Configuration
```
HEALER_AUTO_FIX            Default auto-fix behavior
HEALER_VERBOSE             Default verbose logging
```
See: GEMINI_HEALER_GUIDE.md → "Quick Start" → "Basic Commands"

#### Performance Configuration
```
HEALER_MAX_RETRIES         Default: 3 retries
HEALER_API_TIMEOUT         Default: 60000ms (60s)
HEALER_API_RATE_LIMIT      Default: 5 calls/minute
HEALER_MAX_FILE_SIZE       Default: 1048576 bytes (1MB)
```
See: GEMINI_HEALER_GUIDE.md → "Configuration" → "Performance"

#### Storage Configuration
```
HEALER_BACKUP_DIR          Default: .healer-backups
HEALER_AUDIT_LOG           Default: .healer-audit.log
BACKUP_RETENTION_DAYS      Default: 7 days
MAX_BACKUPS_PER_FILE       Default: 5 per file
```
See: GEMINI_HEALER_GUIDE.md → "Configuration" → "Backup & Storage"

---

## 🔧 Functions Reference

### gemini-healer.js

#### Validation Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `checkDependencies()` | 60-100 | Verify npm packages |
| `validateConfiguration()` | 110-150 | Validate env vars |
| `validateEnvironment()` | 160-220 | Pre-flight checks |
| `validateFilePath()` | 290-310 | Path validation |
| `validateTestFileName()` | 315-320 | File name validation |
| `validateGeneratedCode()` | 325-360 | Security scanning |
| `validateTypeScriptSyntax()` | 370-400 | Syntax validation |
| `validateTestResultsSchema()` | 610-630 | JSON validation |

#### Utility Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `parseArgs()` | 210-250 | CLI argument parsing |
| `showHelp()` | 252-290 | Display help message |
| `auditLog()` | 350-375 | Log operations |
| `createBackup()` | 410-420 | Create file backup |
| `atomicFileWrite()` | 425-450 | Safe file writing |
| `rateLimitAndWait()` | 485-510 | Rate limiting |
| `cleanupOldBackups()` | 515-560 | Backup cleanup |

#### Test Analysis Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `getFailedTests()` | 550-700 | Extract failed tests |
| `extractTestInfo()` | 705-750 | Parse error details |
| `readTestFile()` | 755-790 | Read test content |
| `shouldHealTest()` | 465-480 | Conditional healing |

#### AI & Analysis Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `generateAnalysisPrompt()` | 795-850 | Create Gemini prompt |
| `analyzeWithGemini()` | 855-900 | Call Gemini API |
| `extractFixedCode()` | 905-950 | Parse AI response |

#### Fix Application Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `applyFixes()` | 955-1050 | Apply code fixes |
| `rollbackFix()` | 1055-1100 | Revert changes |
| `verifyFix()` | 1105-1180 | Re-run test |

#### Display Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `displayAnalysis()` | 1185-1210 | Print analysis |
| `displayFixedCode()` | 1215-1270 | Print fixed code |
| `displayHealingSummary()` | 1275-1320 | Print summary |
| `generateErrorReport()` | 565-595 | Create error report |

#### Main Function
| Function | Lines | Purpose |
|----------|-------|---------|
| `heal()` | 1325-1379 | Main workflow |

---

### healer-report-generator.js

#### Report Functions
| Function | Lines | Purpose |
|----------|-------|---------|
| `escapeHtmlNode()` | 13-25 | HTML escape content |
| `formatCodeWithLineNumbers()` | 27-75 | Format code blocks |
| `generateHtmlReport()` | 77-794 | Generate HTML report |

---

## 📊 Report Reference

### HTML Report Structure
- Header: Branding and title
- Summary: 4 metric cards
- Test Results: Grouped by suite
- Test Details: Expandable content
  - Error Details
  - AI Analysis
  - Applied Fix
  - Verification Status
- Session Summary: Metrics and stats
- Footer: Branding and timestamp

See: CODE_EXPLANATION.md → "Report Structure"

### HTML Report Styling
- Color Scheme: Navy (#1e3a8a), Green (#10b981), Grey (#6b7280)
- Responsive: Mobile-friendly
- Interactive: Expandable sections, resizable content
- Syntax Highlighting: Error and fix code blocks

See: CODE_EXPLANATION.md → "CSS Color Scheme"

### Report File Locations
```
test-results/healer-report-{timestamp}.html         # Main report
test-results/healer-error-report-{timestamp}.json   # Error details
.healer-audit.log                                    # Audit trail
.healer-backups/                                     # Test file backups
```

---

## 🔄 Workflow & Data Flow

### Step-by-Step Workflow
1. **Pre-flight Checks** - Validate dependencies and environment
2. **Test Analysis** - Extract failing tests
3. **AI Analysis** - Send to Gemini, get root cause
4. **Code Extraction** - Parse fixed code from response
5. **Fix Application** - Apply fix with backup
6. **Verification** - Re-run test to confirm
7. **Report Generation** - Create HTML and error reports

See: GEMINI_HEALER_GUIDE.md → "How It Works"

### Complete Data Flow
See: CODE_EXPLANATION.md → "Data Flow" (diagram with ASCII art)

---

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

| Issue | Solution | Reference |
|-------|----------|-----------|
| API key not found | Create .env file | GEMINI_HEALER_GUIDE.md → "Troubleshooting" |
| API timeout | Increase timeout value | GEMINI_HEALER_GUIDE.md → "Common Issues" |
| Rate limit exceeded | Reduce API calls/minute | GEMINI_HEALER_GUIDE.md → "Common Issues" |
| File size exceeded | Increase max file size | GEMINI_HEALER_GUIDE.md → "Common Issues" |
| No test results | Run tests first | GEMINI_HEALER_GUIDE.md → "Common Issues" |
| Dangerous patterns | Check Gemini response | CODE_EXPLANATION.md → "Code Security" |
| Test still failing | Review analysis manually | GEMINI_HEALER_GUIDE.md → "Troubleshooting" |

---

## 💾 File Locations Reference

### Configuration Files
```
.env                        Your API key and settings
.env.example               Template configuration
playwright.config.ts       Playwright setup
```

### Generated Files
```
test-results/results.json                   Playwright test results
test-results/healer-report-{ts}.html       Healing report
test-results/healer-error-report-{ts}.json Error details
.healer-backups/                           Backup directory
.healer-audit.log                          Audit trail
```

### Source Code
```
gemini-healer.js                1379 lines - Main healing engine
healer-report-generator.js      794 lines  - Report generation
package.json                    Dependencies and scripts
```

### Tests
```
tests/                          Test files
tests/*.spec.ts               Playwright test files
```

---

## 📈 Metrics & Performance

### API Performance Metrics
- Temperature: 0.7 (balanced creativity/consistency)
- Max tokens: 8192 (output length)
- Timeout: 60 seconds (configurable)
- Rate limit: 5 calls/minute (configurable)
- Retry attempts: 3 (configurable)

### File Performance Metrics
- Max test file size: 1MB (configurable)
- Backup retention: 7 days (configurable)
- Max backups per file: 5 (configurable)

### Report Generation
- HTML report: Single file with CSS/JS
- Error report: JSON format
- Report size: Typically 500KB - 2MB
- Load time: < 1 second

---

## 🔑 Key Concepts

### Atomic File Writing
Safe file writing that prevents corruption:
1. Write to temporary file
2. Verify content matches
3. Copy to target location
4. Delete temporary file

See: CODE_EXPLANATION.md → "Atomic File Write"

### Rate Limiting
Prevents API quota exhaustion:
- Tracks API calls in 60-second window
- Waits if limit exceeded
- Default: 5 calls/minute

See: CODE_EXPLANATION.md → "Rate Limiting"

### Exponential Backoff
Smart retry mechanism:
- 1st retry: 1 second
- 2nd retry: 2 seconds
- 3rd retry: 4 seconds

See: CODE_EXPLANATION.md → "Retry Mechanism"

### Error Classification
7 categories:
- timeout
- strict_mode
- assertion
- not_found
- unknown
- network (skip)
- infrastructure (skip)

See: GEMINI_HEALER_GUIDE.md → "Error Classification"

---

## ⚡ Quick Access by Role

### For New Users
1. Start: GEMINI_HEALER_GUIDE.md → "Installation & Setup"
2. Learn: GEMINI_HEALER_GUIDE.md → "Quick Start"
3. Run: QUICK_REFERENCE.md → "Command Syntax"
4. Review: Check generated HTML report

### For Developers
1. Architecture: CODE_EXPLANATION.md → "Architecture"
2. Functions: CODE_EXPLANATION.md → "Functions Reference"
3. Data Flow: CODE_EXPLANATION.md → "Data Flow"
4. Source: gemini-healer.js and healer-report-generator.js

### For DevOps/CI-CD
1. Setup: GEMINI_HEALER_GUIDE.md → "Installation"
2. Config: GEMINI_HEALER_GUIDE.md → "Configuration"
3. Integration: GEMINI_HEALER_GUIDE.md → "Continuous Integration"
4. Monitoring: GEMINI_HEALER_GUIDE.md → "Audit Log"

### For Support/Troubleshooting
1. Check: GEMINI_HEALER_GUIDE.md → "Troubleshooting"
2. Logs: Review .healer-audit.log
3. Report: Check healer-error-report-*.json
4. Code: Review CODE_EXPLANATION.md → "Security"

---

## 📚 Learning Path

**Beginner (30 minutes):**
1. GEMINI_HEALER_GUIDE.md → "Installation & Setup"
2. GEMINI_HEALER_GUIDE.md → "Quick Start"
3. QUICK_REFERENCE.md

**Intermediate (60 minutes):**
1. Above + GEMINI_HEALER_GUIDE.md → "How It Works"
2. GEMINI_HEALER_GUIDE.md → "Security Features"
3. GEMINI_HEALER_GUIDE.md → "Best Practices"

**Advanced (90+ minutes):**
1. All above
2. CODE_EXPLANATION.md (full deep dive)
3. Review source code (gemini-healer.js, healer-report-generator.js)
4. Understand data flow diagrams

---

## 🆘 Getting Help

### Resources
- Google Generative AI Docs: https://ai.google.dev/
- Playwright Documentation: https://playwright.dev/
- API Key: https://makersuite.google.com/app/apikey

### Documentation to Check
1. GEMINI_HEALER_GUIDE.md → "Troubleshooting"
2. QUICK_REFERENCE.md → "Error Codes"
3. CODE_EXPLANATION.md → "Security"
4. .healer-audit.log for operation history

### When Stuck
1. Check `.healer-audit.log` for recent operations
2. Run with `-v` flag for verbose output
3. Review HTML report for error details
4. Check healer-error-report-*.json
5. Re-read relevant guide sections

---

## 📋 Documentation Checklist

- [x] CODE_EXPLANATION.md - Technical deep dive
- [x] GEMINI_HEALER_GUIDE.md - User guide
- [x] QUICK_REFERENCE.md - Quick lookup
- [x] DOCUMENTATION_INDEX.md - This file
- [x] Installation instructions
- [x] Configuration guide
- [x] Troubleshooting guide
- [x] Security documentation
- [x] API reference
- [x] Examples and workflows

---

## 🔗 Quick Links

### Commands
- `node gemini-healer.js --help` - Show help
- `node gemini-healer.js --auto-fix` - Heal with fixes
- `node gemini-healer.js -v` - Verbose mode

### Files to Check
- `.env` - Configuration
- `test-results/healer-report-*.html` - Results
- `.healer-audit.log` - Operation history
- `.healer-backups/` - Test file backups

### Configuration
- See: GEMINI_HEALER_GUIDE.md → "Configuration"
- See: QUICK_REFERENCE.md → "Environment Variables"

---

**Last Updated:** January 2, 2026  
**Version:** 1.0  
**Status:** Complete Documentation

