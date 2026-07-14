const { pool } = require('./db');
const { embed, toVectorLiteral } = require('./embeddings');

// Rough importance heuristic by memory type — avoids an extra LLM call per
// memory just to rate importance. Reflections outrank routine chatter,
// mirroring how the Stanford generative-agents paper weights them.
const IMPORTANCE_BY_TYPE = {
  reflection: 8,
  dialogue: 5,
  action: 4,
  observation: 3,
};

async function addMemory(agentId, type, content) {
  const vector = await embed(content);
  const importance = IMPORTANCE_BY_TYPE[type] ?? 5;
  await pool.query(
    `INSERT INTO memories (agent_id, type, content, importance, embedding)
     VALUES ($1, $2, $3, $4, $5::vector)`,
    [agentId, type, content, importance, toVectorLiteral(vector)]
  );
}

async function getRecentMemories(agentId, limit = 5) {
  const { rows } = await pool.query(
    `SELECT id, type, content, importance, created_at
     FROM memories WHERE agent_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [agentId, limit]
  );
  return rows;
}

async function getRecentMemoriesByType(agentId, type, limit = 5) {
  const { rows } = await pool.query(
    `SELECT id, type, content, importance, created_at
     FROM memories WHERE agent_id = $1 AND type = $2
     ORDER BY created_at DESC LIMIT $3`,
    [agentId, type, limit]
  );
  return rows;
}

async function getRelevantMemories(agentId, situationText, limit = 5) {
  const vector = await embed(situationText);
  const { rows } = await pool.query(
    `SELECT id, type, content, importance, created_at,
            1 - (embedding <=> $2::vector) AS similarity
     FROM memories
     WHERE agent_id = $1
     ORDER BY embedding <=> $2::vector
     LIMIT $3`,
    [agentId, toVectorLiteral(vector), limit]
  );
  return rows;
}

// Blends recency + importance + relevance into one ranked list, the way the
// architecture doc describes. Two queries, merged and re-scored in JS rather
// than one complex weighted SQL query — simpler to read and tweak.
async function getBlendedMemories(agentId, situationText, limit = 6) {
  const [recent, relevant] = await Promise.all([
    getRecentMemories(agentId, limit * 2),
    getRelevantMemories(agentId, situationText, limit * 2),
  ]);

  const now = Date.now();
  const HALF_LIFE_MS = 1000 * 60 * 30; // recency decays over ~30 minutes

  function score(row) {
    const ageMs = now - new Date(row.created_at).getTime();
    const recencyScore = Math.exp(-ageMs / HALF_LIFE_MS);
    const importanceScore = (row.importance || 5) / 10;
    const relevanceScore = row.similarity != null ? row.similarity : 0.3;
    return recencyScore * 0.3 + importanceScore * 0.3 + relevanceScore * 0.4;
  }

  const byId = new Map();
  for (const row of [...recent, ...relevant]) {
    const s = score(row);
    const existing = byId.get(row.id);
    if (!existing || s > existing._score) {
      byId.set(row.id, { ...row, _score: s });
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b._score - a._score)
    .slice(0, limit);
}

// How many non-reflection memories have piled up since the last reflection —
// used to decide when it's time to reflect again.
async function countSinceLastReflection(agentId) {
  const lastReflection = await pool.query(
    `SELECT created_at FROM memories
     WHERE agent_id = $1 AND type = 'reflection'
     ORDER BY created_at DESC LIMIT 1`,
    [agentId]
  );
  const since = lastReflection.rows[0] ? lastReflection.rows[0].created_at : new Date(0);
  const count = await pool.query(
    `SELECT COUNT(*) FROM memories
     WHERE agent_id = $1 AND type != 'reflection' AND created_at > $2`,
    [agentId, since]
  );
  return parseInt(count.rows[0].count, 10);
}

module.exports = {
  addMemory,
  getRecentMemories,
  getRecentMemoriesByType,
  getRelevantMemories,
  getBlendedMemories,
  countSinceLastReflection,
};
