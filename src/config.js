require('dotenv').config();

module.exports = {
  CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
  CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN || '',
  CLOUDFLARE_MODEL: process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-8b-instruct',
  CLOUDFLARE_EMBED_MODEL: process.env.CLOUDFLARE_EMBED_MODEL || '@cf/baai/bge-base-en-v1.5',

  DATABASE_URL:
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/livingworld',

  TICKS: parseInt(process.env.TICKS || '10', 10),
  TICK_DELAY_MS: parseInt(process.env.TICK_DELAY_MS || '3000', 10),
  REFLECTION_EVERY: parseInt(process.env.REFLECTION_EVERY || '6', 10),
  PORT: parseInt(process.env.PORT || '3000', 10),
};
