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
      // 1. Read original file
      const originalContent = readFileSync(filePath, 'utf8');

      // 2. Validate syntax of replacement code
      const syntaxCheck = this.#validateSyntax(patch.replacement);
      if (!syntaxCheck.valid) {
        return {
          success: false,
          file: patch.file,
          reason: `Syntax error in replacement code: ${syntaxCheck.error}`,
        };
      }

      // 3. Verify 'original' string exists at claimed line range
      const lines = originalContent.split('\n');
      const contentBetweenLines = lines.slice(patch.lineStart - 1, patch.lineEnd).join('\n');

      if (!contentBetweenLines.includes(patch.original.trim())) {
        return {
          success: false,
          file: patch.file,
          reason: `Original string not found at lines ${patch.lineStart}-${patch.lineEnd}`,
        };
      }

      // 4. Apply string replacement
      const patchedContent = originalContent.replace(patch.original, patch.replacement);

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
      new vm.Script(code, { filename: 'sandbox-check.js' });
      return { valid: true };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }
}
