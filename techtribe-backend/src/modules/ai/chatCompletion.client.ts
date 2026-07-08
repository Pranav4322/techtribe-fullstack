// Both Groq and OpenAI expose an OpenAI-compatible Chat Completions API, so
// this one function handles the actual HTTP call for either provider —
// only the base URL, key, and model differ between them.
interface ChatCompletionChoice {
  message?: { content?: string };
}

interface ChatCompletionResponse {
  choices?: ChatCompletionChoice[];
  error?: { message: string };
}

export async function chatCompletion(opts: {
  baseUrl: string;
  apiKey: string;
  model: string;
  userMessage: string;
  maxTokens: number;
}): Promise<string> {
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

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${data.error?.message || res.statusText} — ${JSON.stringify(data).slice(0, 500)}`);
  }

  const text = data.choices?.[0]?.message?.content || '';
  if (!text) throw new Error('Empty response from AI provider.');
  return text;
}
