/**
 * Healer Factory
 * Creates healer instances based on configuration
 * Implements Factory pattern for extensibility
 */

import { HealerConfig } from '../types/index.js';
import { BaseHealer } from './BaseHealer.js';
import { GeminiHealer } from './GeminiHealer.js';

export type HealerProvider = 'gemini';

/**
 * Factory class for creating healer instances
 */
export class HealerFactory {
  /**
   * Create a healer instance based on provider type
   */
  static createHealer(provider: HealerProvider, config: HealerConfig): BaseHealer {
    switch (provider) {
      case 'gemini':
        return new GeminiHealer(config);
      default:
        throw new Error(`Unknown healer provider: ${provider}`);
    }
  }

  /**
   * Get available healer providers
   */
  static getAvailableProviders(): HealerProvider[] {
    return ['gemini'];
  }

  /**
   * Validate provider is available
   */
  static isValidProvider(provider: string): provider is HealerProvider {
    return this.getAvailableProviders().includes(provider as HealerProvider);
  }
}
