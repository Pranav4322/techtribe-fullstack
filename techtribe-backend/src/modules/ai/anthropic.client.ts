import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/ApiError';

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  error?: { message: string };
}

export async function callClaude(userMessage: string, maxTokens = 1200): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  const data = (await res.json()) as AnthropicResponse;

  if (!res.ok) {
    logger.error(`Anthropic API error: ${data.error?.message || res.statusText}`);
    throw ApiError.internal('AI service is temporarily unavailable. Please try again shortly.');
  }

  const text = (data.content || []).map((b) => b.text || '').join('');
  if (!text) throw ApiError.internal('AI returned an empty response.');
  return text;
}
