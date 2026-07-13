// Both Groq and OpenAI expose an OpenAI-compatible Chat Completions API, so
// this one function handles the actual HTTP call for either provider —
// only the base URL, key, and model differ between them.
interface ChatCompletionChoice {
  message?: { content?: string };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: { message: string; metadata?: { retry_after_seconds?: number } };
}

async function singleAttempt(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  userMessage: string;
  maxTokens: number;
}): Promise<{ text: string } | { retryAfterMs: number; errorText: string }> {
  const res = await fetch(opts.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: opts.maxTokens,
      messages: [{ role: 'user', content: opts.userMessage }]
    })
  });

  const data = (await res.json()) as ChatCompletionResponse;

  if (res.status === 429) {
    const retrySeconds = data.error?.metadata?.retry_after_seconds || 3;
    return { retryAfterMs: Math.min(retrySeconds * 1000, 8000), errorText: `HTTP 429: ${data.error?.message || 'Rate limited'}` };
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data.error?.message || res.statusText} — ${JSON.stringify(data).slice(0, 500)}`);
  }

  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from AI provider.');
  return { text };
}

/**
 * Free-tier models are shared across many users and occasionally return a
 * brief 429 (rate limited) — this is normal, expected behavior, not a real
 * failure. Retry once after the provider's suggested backoff before giving
 * up, so a momentary hiccup doesn't fail the whole request.
 */
export async function chatCompletion(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  userMessage: string;
  maxTokens: number;
}): Promise<string> {
  const first = await singleAttempt(opts);
  if ('text' in first) return first.text;

  await new Promise((resolve) => setTimeout(resolve, first.retryAfterMs));

  const second = await singleAttempt(opts);
  if ('text' in second) return second.text;

  throw new Error(second.errorText);
}
