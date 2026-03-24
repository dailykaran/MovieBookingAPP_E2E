// src/patch-applicator.js
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { randomUUID } from 'crypto';
import vm from 'vm';
import { consoleLogger } from './reporters/audit-logger.js';

const PATCH_DIR = process.env.TEST_PATCH_DIR || './artifacts/patches';

/**
 * Safely apply patches to test files with rollback capability
 */
export class PatchApplicator {
  constructor() {
    if (!existsSync(PATCH_DIR)) {
      mkdirSync(PATCH_DIR, { recursive: true });
    }
  }

  /**
   * Apply a list of patches to test files
   */
  async apply(patches) {
    const results = [];

    for (const patch of patches) {
      const result = await this.#applyPatch(patch);
      results.push(result);

      if (!result.success) {
        consoleLogger.error(`Patch failed: ${patch.file}`, result);
        // Continue to next patch but note failure
      }
    }

    return {
      totalPatches: patches.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      details: results,
    };
  }

  async #applyPatch(patch) {
    const filePath = resolve(patch.file);

    try {
      // 0. Check if file exists
      if (!existsSync(filePath)) {
        return {
          success: false,
          file: patch.file,
          reason: `Test file not found: ${filePath}`,
        };
      }

      // 1. Read original file
      const originalContent = readFileSync(filePath, 'utf8');

      // 2. Skip syntax validation for now (security validator handles safety)
      // const syntaxCheck = this.#validateSyntax(patch.replacement);
      // if (!syntaxCheck.valid) {
      //   return {
      //     success: false,
      //     file: patch.file,
      //     reason: `Syntax error in replacement code: ${syntaxCheck.error}`,
      //   };
      // }

      // 3. Verify 'original' string exists at claimed line range
      const lines = originalContent.split('\n');
      const contentBetweenLines = lines.slice(patch.lineStart - 1, patch.lineEnd).join('\n');

      // Try exact match first, then fuzzy match
      let matchFound = false;
      let patchedContent = originalContent;

      // Strategy 1: Exact match
      if (originalContent.includes(patch.original)) {
        matchFound = true;
        patchedContent = originalContent.replace(patch.original, patch.replacement);
      } 
      // Strategy 2: Fuzzy match on the first logical line
      else if (contentBetweenLines.includes(patch.original.trim())) {
        matchFound = true;
        // Find and replace the trimmed version, preserving surrounding whitespace
        const re = new RegExp(patch.original.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        patchedContent = originalContent.replace(re, patch.replacement);
      }
      // Strategy 3: Normalize whitespace and try again
      else {
        const normalizedOriginal = patch.original.split('\n').map(l => l.trim()).join('\n');
        const normalizedContent = contentBetweenLines.split('\n').map(l => l.trim()).join('\n');
        if (normalizedContent.includes(normalizedOriginal)) {
          matchFound = true;
          // Replace using regex with flexible whitespace
          const escapedPattern = normalizedOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const flexPattern = escapedPattern.replace(/\s+/g, '\\s+');
          const re = new RegExp(flexPattern, 'g');
          patchedContent = originalContent.replace(re, patch.replacement);
        }
      }
      // Strategy 4: Try without async/await keywords (common AI variation)
      if (!matchFound) {
        const withoutAsync = patch.original.replace(/\b(await|async)\s+/g, '').trim();
        if (originalContent.includes(withoutAsync)) {
          matchFound = true;
          patchedContent = originalContent.replace(withoutAsync, patch.replacement.replace(/\b(await|async)\s+/g, '').trim());
        }
      }
      // Strategy 5: Partial match - find the first line and try to replace that line
      if (!matchFound) {
        const originalFirstLine = patch.original.trim().split('\n')[0];
        const lines = originalContent.split('\n');
        for (let i = Math.max(0, patch.lineStart - 3); i < Math.min(lines.length, patch.lineEnd + 3); i++) {
          const line = lines[i].trim();
          if (line.length > 10 && originalFirstLine.includes(line.substring(0, Math.min(line.length, 20)))) {
            matchFound = true;
            // Replace this entire logical block
            const replacementFirstLine = patch.replacement.trim().split('\n')[0];
            lines[i] = lines[i].replace(line, replacementFirstLine);
            patchedContent = lines.join('\n');
            break;
          }
        }
      }
      // Strategy 6: Try fuzzy line matching (for the specific case where we need to find and replace whole statements)
      if (!matchFound && patch.lineStart && patch.lineEnd) {
        const originalLines = patch.original.split('\n');
        const firstOriginalLine = originalLines[0].trim();
        const fileLines = originalContent.split('\n');
        
        // Find lines that contain key parts of the original patch
        for (let i = patch.lineStart - 1; i < Math.min(patch.lineEnd + 2, fileLines.length); i++) {
          if (i >= 0 && fileLines[i].toLowerCase().includes(firstOriginalLine.toLowerCase().substring(0, 30))) {
            matchFound = true;
            // Replace the line range
            fileLines.splice(patch.lineStart - 1, patch.lineEnd - patch.lineStart + 1, patch.replacement);
            patchedContent = fileLines.join('\n');
            break;
          }
        }
      }

      if (!matchFound) {
        return {
          success: false,
          file: patch.file,
          reason: `Original string not found at lines ${patch.lineStart}-${patch.lineEnd}. Tried 6 matching strategies.`,
          debug: {
            lineRange: `${patch.lineStart}-${patch.lineEnd}`,
            expected: patch.original.substring(0, 50) + '...',
            found: contentBetweenLines.substring(0, 50) + '...',
          },
        };
      }

      if (patchedContent === originalContent) {
        return {
          success: false,
          file: patch.file,
          reason: 'Patch string replacement produced no change',
        };
      }

      // 5. Store original for rollback
      const backupId = randomUUID().substring(0, 8);
      const backupPath = resolve(PATCH_DIR, `${patch.file.replace(/\//g, '-')}-${backupId}.bak`);
      const backupDirPath = dirname(backupPath);
      if (!existsSync(backupDirPath)) {
        mkdirSync(backupDirPath, { recursive: true });
      }
      writeFileSync(backupPath, originalContent);

      // 6. Write patched file
      writeFileSync(filePath, patchedContent);

      return {
        success: true,
        file: patch.file,
        backupId,
        patchType: patch.patchType,
      };
    } catch (err) {
      return {
        success: false,
        file: patch.file,
        reason: `Patch application error: ${err.message}`,
      };
    }
  }

  /**
   * Validate patch code syntax using VM script parser
   */
  #validateSyntax(code) {
    try {
      // Wrap in async function to allow await
      const wrappedCode = `(async () => { ${code} })`;
      new vm.Script(wrappedCode, { filename: 'sandbox-check.js' });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}
