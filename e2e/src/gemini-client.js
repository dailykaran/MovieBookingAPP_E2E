// src/gemini-client.js
import { VertexAI } from '@google-cloud/vertexai';
import { readFileSync } from 'fs';
import { AuditLogger } from './reporters/audit-logger.js';

const logger = new AuditLogger();

/**
 * Wrapper around Vertex AI Gemini client
 */
export class GeminiHealingClient {
  #vertexAI;
  #model;
  #config;

  constructor(config = {}) {
    this.#config = {
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION || 'us-central1',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8192', 10),
      temperature: parseFloat(process.env.GEMINI_TEMPERATURE || '0.2'),
      topP: parseFloat(process.env.GEMINI_TOP_P || '0.85'),
      ...config,
    };

    this.#vertexAI = new VertexAI({
      project: this.#config.project,
      location: this.#config.location,
    });

    this.#model = this.#vertexAI.getGenerativeModel({
      model: this.#config.model,
      generationConfig: {
        maxOutputTokens: this.#config.maxTokens,
        temperature: this.#config.temperature,
        topP: this.#config.topP,
        responseMimeType: 'application/json', // Force JSON output
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
      ],
    });
  }

  /**
   * Send a multimodal healing request (text + optional screenshot).
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @param {string|null} screenshotPath  – base64 PNG path
   * @returns {Promise<object>}           – parsed JSON response
   */
  async requestHealing(systemPrompt, userPrompt, screenshotPath = null) {
    const parts = [{ text: userPrompt }];

    if (screenshotPath) {
      try {
        const imageData = readFileSync(screenshotPath, { encoding: 'base64' });
        parts.unshift({
          inlineData: { mimeType: 'image/png', data: imageData },
        });
      } catch (err) {
        logger.warn('Failed to read screenshot', { path: screenshotPath, error: err.message });
        // Continue without image
      }
    }

    const request = {
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts }],
    };

    logger.info('Gemini request dispatched', {
      model: this.#config.model,
      hasScreenshot: !!screenshotPath,
      maxTokens: this.#config.maxTokens,
    });

    try {
      const result = await this.#model.generateContent(request);
      const raw = result.response.candidates[0]?.content?.parts[0]?.text ?? '{}';

      const parsed = JSON.parse(raw);
      logger.info('Gemini response received', {
        confidence: parsed.confidence,
        patchCount: parsed.patches?.length ?? 0,
      });

      return parsed;
    } catch (err) {
      logger.error('Gemini request failed', {
        error: err.message,
        model: this.#config.model,
      });
      throw err;
    }
  }
}
