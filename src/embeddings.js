const config = require('./config');

async function embed(text) {
  if (!config.CLOUDFLARE_ACCOUNT_ID || !config.CLOUDFLARE_API_TOKEN) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN. Check your .env.');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${config.CLOUDFLARE_ACCOUNT_ID}/ai/run/${config.CLOUDFLARE_EMBED_MODEL}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.CLOUDFLARE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: [text] }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding error ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const vector = data.result && data.result.data && data.result.data[0];

  if (!vector) {
    throw new Error('Embedding returned no vector: ' + JSON.stringify(data));
  }

  return vector;
}

// pgvector wants a literal string like '[0.1,0.2,...]' for the ::vector cast.
function toVectorLiteral(arr) {
  return `[${arr.join(',')}]`;
}

module.exports = { embed, toVectorLiteral };
