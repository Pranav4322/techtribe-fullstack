import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { ApiError } from '../../utils/ApiError';

// Groq's Chat Completions API is OpenAI-compatible, so the request/response
// shape here matches OpenAI's format exactly — only the base URL, API key,
// and model name differ. Groq has a genuinely free tier (no card required).
interface GroqChoice {
  message?: { content?: string };
}

interface GroqResponse {
  choices?: GroqChoice[];
  error?: { message: string };
}

export async function callAI(userMessage: string, maxTokens = 1200): Promise<string> {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: env.GROQ_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  const data = (await res.json()) as GroqResponse;

  if (!res.ok) {
    logger.error(`Groq API error: ${data.error?.message || res.statusText}`);
    throw ApiError.internal('AI service is temporarily unavailable. Please try again shortly.');
  }

  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw ApiError.internal('AI returned an empty response.');
  return text;
}
