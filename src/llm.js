const config = require('./config');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callLLM(messages, { retries = 2 } = {}) {
  if (!config.CLOUDFLARE_ACCOUNT_ID || !config.CLOUDFLARE_API_TOKEN) {
    throw new Error(
      'Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. Copy .env.example to .env and fill both in ' +
        '(Cloudflare dashboard → Workers AI → Use REST API → Create Workers AI API Token).'
    );
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/ai/run/${config.CLOUDFLARE_MODEL}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      max_tokens: 600,
    }),
  });

  // Back off and retry on rate limiting, same as before.
  if (response.status === 429 && retries > 0) {
    await sleep(3000);
    return callLLM(messages, { retries: retries - 1 });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloudflare Workers AI error ${response.status}: ${text}`);
  }

  const data = await response.json();

  if (data.success === false) {
    throw new Error('Cloudflare Workers AI error: ' + JSON.stringify(data.errors));
  }

  // The /ai/run endpoint normally wraps text output at result.response.
  // Fall back to an OpenAI-shaped result too, in case the model/endpoint differs.
  const result = data.result || {};
  const content =
    (typeof result.response === 'string' && result.response) ||
    (result.choices &&
      result.choices[0] &&
      result.choices[0].message &&
      result.choices[0].message.content) ||
    null;

  if (!content) {
    throw new Error('Cloudflare Workers AI returned no content: ' + JSON.stringify(data));
  }

  return content;
}

module.exports = { callLLM };
