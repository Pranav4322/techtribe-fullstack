import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/ApiError';
import { chatCompletion } from './chatCompletion.client';

/**
 * Tries OpenRouter first (free-tier models — primary provider). If that call
 * fails for any reason (rate limit, outage, bad key, etc.) and an OpenAI key
 * is configured, automatically retries with OpenAI before giving up.
 */
export async function callAI(userMessage: string, maxTokens = 1200): Promise<string> {
  try {
    return await chatCompletion({
      baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
      apiKey: env.OPENROUTER_API_KEY,
      model: env.OPENROUTER_MODEL,
      userMessage,
      maxTokens
    });
  } catch (openRouterErr) {
    logger.warn(`OpenRouter call failed, falling back to OpenAI: ${(openRouterErr as Error).message}`);

    if (!env.OPENAI_API_KEY) {
      logger.error(`AI request failed and no OpenAI fallback key is configured: ${(openRouterErr as Error).message}`);
      throw ApiError.internal('AI service is temporarily unavailable. Please try again shortly.');
    }

    try {
      return await chatCompletion({
        baseUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: env.OPENAI_API_KEY,
        model: env.OPENAI_MODEL,
        userMessage,
        maxTokens
      });
    } catch (openaiErr) {
      logger.error(`OpenAI fallback also failed: ${(openaiErr as Error).message}`);
      throw ApiError.internal('AI service is temporarily unavailable. Please try again shortly.');
    }
  }
}
