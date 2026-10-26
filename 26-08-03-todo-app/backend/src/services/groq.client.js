const {
  GROQ_API_KEY,
  GROQ_MODEL,
  GROQ_BASE_URL,
  GROQ_TIMEOUT_MS,
} = require('../config/constants');
const ApiError = require('../utils/apiError');

function isConfigured() {
  return Boolean(GROQ_API_KEY);
}

/**
 * Calls Groq's OpenAI-compatible chat completions endpoint in JSON mode and
 * returns the parsed JSON object.
 *
 * Error mapping matters here: a Groq 401 must NOT be forwarded as a 401, because
 * the frontend treats any 401 as "your session expired" and logs the user out.
 */
async function chatJson({ system, user, temperature = 0.2, maxTokens = 600 }) {
  if (!isConfigured()) {
    throw ApiError.unavailable('AI features are not configured (set GROQ_API_KEY on the server)');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw new ApiError(504, 'The AI took too long to respond');
    console.error('[groq] network error:', err.message);
    throw ApiError.badGateway('Could not reach the AI service');
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.error(`[groq] ${res.status}: ${body.slice(0, 300)}`);
    if (res.status === 429) {
      throw ApiError.tooManyRequests('AI rate limit reached - try again in a moment');
    }
    if (res.status === 401 || res.status === 403) {
      throw ApiError.unavailable('The AI service rejected the server API key');
    }
    throw ApiError.badGateway('The AI service returned an error');
  }

  const payload = await res.json();
  const content = payload.choices?.[0]?.message?.content;
  try {
    return JSON.parse(content);
  } catch {
    throw ApiError.badGateway('The AI returned an unreadable response');
  }
}

module.exports = { chatJson, isConfigured };
