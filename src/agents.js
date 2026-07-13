const { ensureAgent } = require('./db');
const { callLLM } = require('./llm');
const {
  addMemory,
  getRecentMemories,
  getBlendedMemories,
  countSinceLastReflection,
} = require('./memoryStore');
const { reflect } = require('./reflection');
const config = require('./config');

// With more agents, the shared event log fills up faster with everyone else's
// actions — widen the windows so nobody "forgets" what just happened after
// only one or two ticks.
const PERCEPTION_WINDOW = 8;
const MEMORY_WINDOW = 6;

class Agent {
  constructor({ name, persona }) {
    this.id = null; // set by init(), once we know the persisted DB id
    this.name = name;
    this.persona = persona;
    this.currentPlan = '(no plan yet)';
  }

  // Must be called once before act() — looks up or creates this agent's row
  // in Postgres so memory persists across process restarts.
  async init() {
    this.id = await ensureAgent(this.name, this.persona);
  }

  async buildPrompt(world) {
    const perceivedEvents = world.formatRecentEventsExcluding(this.name, PERCEPTION_WINDOW);

    // The most recent own action, fetched directly (not from the blended set)
    // so the anti-repetition check always compares against the true last line,
    // even if relevance/importance scoring would have ranked it lower.
    const lastOwnRows = await getRecentMemories(this.id, 1);
    const lastOwnText = lastOwnRows[0] ? lastOwnRows[0].content : '(nothing yet — this is your first move)';

    const situationText = `${perceivedEvents}\nCurrent plan: ${this.currentPlan}`;
    const blended = await getBlendedMemories(this.id, situationText, MEMORY_WINDOW);
    const ownMemoriesText = blended.length
      ? blended.map((m) => `- [${m.type}] ${m.content}`).join('\n')
      : '(no memories yet)';

    return [
      {
        role: 'system',
        content: `You are roleplaying as a character named ${this.name} inside a small simulated world.
Persona: ${this.persona}

You only know what is written below. You have no knowledge of the world beyond this.
Stay fully in character.
IMPORTANT: Never repeat your previous dialogue or action almost word-for-word. If a topic feels resolved, stuck, or you already said something similar recently, change the subject, actually answer a question you were asked, or switch to a different action (move, wait, interact) instead of repeating yourself.
Respond ONLY with valid JSON, no extra text, in this exact shape:
{"action": "speak|move|wait|interact", "target": "who or what, or empty string", "dialogue": "what you say out loud, or empty string", "plan": "your next intention in one short sentence, updated from your current plan", "reason": "one short sentence, your private reasoning"}`,
      },
      {
        role: 'user',
        content: `Your last action was: ${lastOwnText}
(Do not repeat this almost word-for-word — say or do something meaningfully different.)

Recent things you noticed nearby:
${perceivedEvents}

Relevant memories (a mix of recent, important, and related to your current situation):
${ownMemoriesText}

Your current plan: ${this.currentPlan}

Decide what you do right now.`,
      },
    ];
  }

  async act(world) {
    const messages = await this.buildPrompt(world);
    const raw = await callLLM(messages);

    let parsed;
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(match ? match[0] : raw.trim());
    } catch (err) {
      parsed = {
        action: 'wait',
        target: '',
        dialogue: '',
        reason: `(could not parse model output: ${raw.slice(0, 80)})`,
      };
    }

    // Defensive defaults — free/small models sometimes omit a field or two.
    if (!parsed.action) parsed.action = parsed.dialogue ? 'speak' : 'wait';
    parsed.target = parsed.target || '';
    parsed.dialogue = parsed.dialogue || '';
    parsed.reason = parsed.reason || '';

    if (parsed.plan) {
      this.currentPlan = parsed.plan;
    }

    const description = parsed.dialogue
      ? `${parsed.action} — "${parsed.dialogue}"`
      : `${parsed.action}${parsed.target ? ' toward ' + parsed.target : ''}`;

    const memoryType = parsed.dialogue ? 'dialogue' : 'action';
    await addMemory(this.id, memoryType, description);
    world.addEvent(this.name, description);

    // Check if it's time to reflect — this is what lets the agent notice
    // "I already offered this twice" instead of just repeating recent lines.
    const sinceReflection = await countSinceLastReflection(this.id);
    if (sinceReflection >= config.REFLECTION_EVERY) {
      const insights = await reflect(this);
      if (insights.length) {
        console.log(`  [${this.name} reflects: ${insights.join(' | ')}]`);
      }
    }

    return parsed;
  }
}

module.exports = { Agent };
