// Lightweight AI provider wrappers used by Vercel API routes.
// Tries to use installed SDKs when available and falls back to HTTP calls.

export async function generateWithGoogle(prompt) {
  let GoogleGenAI = null;
  try {
    GoogleGenAI = (await import('@google/genai')).GoogleGenAI;
  } catch (e) {
    GoogleGenAI = null;
  }
  if (!GoogleGenAI) throw new Error('Google GenAI client not installed');
  const client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await client.models.generateContent({ model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash', contents: prompt });
  return response.text || JSON.stringify(response);
}

function extractSdkResponseText(resp) {
  if (!resp) return '';
  if (typeof resp === 'string') return resp;
  if (resp.output_text) return resp.output_text;
  if (resp.completion) return resp.completion;
  if (resp.completion_text) return resp.completion_text;
  if (resp.output && Array.isArray(resp.output)) {
    return resp.output.map(o => (o.text || (o.content && o.content.map(c => c.text || c).join('')) || '')).join('\n\n');
  }
  if (Array.isArray(resp.choices) && resp.choices[0]) {
    const c = resp.choices[0];
    if (c.message && typeof c.message.content === 'string') return c.message.content;
    if (c.text) return c.text;
  }
  try { return JSON.stringify(resp); } catch (e) { return String(resp); }
}

export async function generateWithClaude(prompt) {
  const key = process.env.CLAUDE_API_KEY;
  if (!key) throw new Error('CLAUDE_API_KEY not set');
  const model = process.env.CLAUDE_MODEL || 'claude-2.1';

  // Try SDK first
  try {
    const mod = await import('anthropic');
    const Anthropic = mod.default || mod.Anthropic || mod;
    let client = null;
    try { client = new Anthropic({ apiKey: key }); } catch (e) { client = Anthropic; }

    if (client && client.responses && typeof client.responses.create === 'function') {
      const resp = await client.responses.create({ model, input: prompt, max_tokens: 800, temperature: 0.7 });
      return extractSdkResponseText(resp);
    }
    if (client && typeof client.complete === 'function') {
      const resp = await client.complete({ model, prompt, max_tokens_to_sample: 800, temperature: 0.7 });
      return extractSdkResponseText(resp);
    }
    if (client && client.completions && typeof client.completions.create === 'function') {
      const resp = await client.completions.create({ model, prompt, max_tokens_to_sample: 800, temperature: 0.7 });
      return extractSdkResponseText(resp);
    }
  } catch (e) {
    // SDK not available or failed — fall through to HTTP
  }

  // HTTP fallback
  const anthropicVersion = process.env.CLAUDE_API_VERSION || '2023-10-01';
  const isMessagesModel = String(model).toLowerCase().startsWith('claude-opus');

  if (isMessagesModel) {
    const url = `https://api.anthropic.com/v1/messages`;
    const body = { model, messages: [{ role: 'user', content: prompt }], max_tokens: 800, temperature: 0.7 };
    const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'Anthropic-Version': anthropicVersion }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`Claude Messages API error: ${resp.status}`);
    const json = await resp.json();
    if (json.output && typeof json.output === 'string') return json.output;
    if (json.message && json.message.content) return typeof json.message.content === 'string' ? json.message.content : Array.isArray(json.message.content) ? json.message.content.map(c => c.text || c).join('\n\n') : JSON.stringify(json.message.content);
    if (Array.isArray(json.content)) return json.content.map(c => c.text || JSON.stringify(c)).join('\n\n');
    if (Array.isArray(json.choices) && json.choices[0] && json.choices[0].message) return json.choices[0].message.content || JSON.stringify(json.choices[0].message);
    return JSON.stringify(json);
  }

  // Legacy complete
  const url = `https://api.anthropic.com/v1/complete`;
  const body = { model, prompt, max_tokens_to_sample: 800, temperature: 0.7 };
  const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'Anthropic-Version': anthropicVersion }, body: JSON.stringify(body) });
  if (!resp.ok) throw new Error(`Claude API error: ${resp.status}`);
  const json = await resp.json();
  return json.completion || json.completion_text || json.output || JSON.stringify(json);
}
