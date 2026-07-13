const { callLLM } = require('./llm');
const { getRecentMemories, addMemory } = require('./memoryStore');

async function reflect(agent) {
  const recent = await getRecentMemories(agent.id, 10);
  const memoryText = recent
    .slice()
    .reverse()
    .map((r) => `- [${r.type}] ${r.content}`)
    .join('\n');

  const messages = [
    {
      role: 'system',
      content: `You are ${agent.name}. Persona: ${agent.persona}

Reflect on your recent memories below. Produce 1-3 short, higher-level insights —
things you've learned, decided, or now believe, especially anything worth
remembering so you don't repeat yourself or re-offer the same thing twice.
Respond ONLY as a JSON array of short strings, e.g. ["insight one", "insight two"].
No extra text.`,
    },
    { role: 'user', content: `Your recent memories:\n${memoryText}` },
  ];

  const raw = await callLLM(messages);

  let insights;
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    insights = JSON.parse(match ? match[0] : raw.trim());
  } catch (err) {
    insights = [];
  }

  const saved = [];
  for (const insight of (insights || []).slice(0, 3)) {
    if (typeof insight === 'string' && insight.trim()) {
      await addMemory(agent.id, 'reflection', insight.trim());
      saved.push(insight.trim());
    }
  }

  return saved;
}

module.exports = { reflect };
