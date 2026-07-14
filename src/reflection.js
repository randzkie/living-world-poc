const { callLLM } = require('./llm');
const { getRecentMemories, getRecentMemoriesByType, addMemory } = require('./memoryStore');

async function reflect(agent) {
  const recent = await getRecentMemories(agent.id, 10);
  const memoryText = recent
    .slice()
    .reverse()
    .map((r) => `- [${r.type}] ${r.content}`)
    .join('\n');

  const priorReflections = await getRecentMemoriesByType(agent.id, 'reflection', 5);
  const priorReflectionsText = priorReflections.length
    ? priorReflections.map((r) => `- ${r.content}`).join('\n')
    : '(none yet)';

  const messages = [
    {
      role: 'system',
      content: `You are ${agent.name}. Persona: ${agent.persona}

Reflect on your recent memories below. Produce 1-3 short, higher-level insights —
things you've learned, decided, or now believe, especially anything worth
remembering so you don't repeat yourself or re-offer the same thing twice.
Do not restate insights you've already noted (listed below) — if nothing new
comes to mind, it's fine to return fewer insights, even zero.
Respond ONLY as a JSON array of short strings, e.g. ["insight one", "insight two"].
No extra text.`,
    },
    {
      role: 'user',
      content: `Insights you've already noted:
${priorReflectionsText}

Your recent memories:
${memoryText}`,
    },
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
