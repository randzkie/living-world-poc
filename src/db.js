const { Pool } = require('pg');
const config = require('./config');

const pool = new Pool({ connectionString: config.DATABASE_URL });

// Looks up an agent by name, creating it on first run. Reusing the same name
// across runs means memory persists between process restarts — that's the
// whole point of Phase 2.
async function ensureAgent(name, persona) {
  const existing = await pool.query('SELECT id FROM agents WHERE name = $1', [name]);
  if (existing.rows[0]) {
    await pool.query('UPDATE agents SET persona = $2 WHERE id = $1', [existing.rows[0].id, persona]);
    return existing.rows[0].id;
  }
  const inserted = await pool.query(
    'INSERT INTO agents (name, persona) VALUES ($1, $2) RETURNING id',
    [name, persona]
  );
  return inserted.rows[0].id;
}

module.exports = { pool, ensureAgent };
