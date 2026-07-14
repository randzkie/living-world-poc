const { ensureAgent } = require('./db');
const { callLLM } = require('./llm');
const {
  addMemory,
  getRecentMemories,
  getBlendedMemories,
  countSinceLastReflection,
} = require('./memoryStore');
const { reflect } = require('./reflection');
const { LOCATIONS } = require('./locations');
const config = require('./config');

const PERCEPTION_WINDOW = 8;
const MEMORY_WINDOW = 6;

const LOCATION_LIST_TEXT = Object.entries(LOCATIONS)
  .map(([name, loc]) => `- ${name}: ${loc.description}`)
  .join('\n');

class Agent {
  constructor({ name, persona, homeLocation }) {
    this.id = null;
    this.name = name;
    this.persona = persona;
    this.homeLocation = homeLocation;
    this.location = homeLocation;
    this.currentPlan = '(no plan yet)';
  }

  async init() {
    this.id = await ensureAgent(this.name, this.persona);
  }

  async buildPrompt(world) {
    const peopleHere = world.getAgentsAt(this.location, this.name);
    const eventsHere = world.formatRecentEventsAt(this.location, this.name, PERCEPTION_WINDOW);

    const lastOwnRows = await getRecentMemories(this.id, 4);
    const lastOwnText = lastOwnRows.length
      ? lastOwnRows.map((r) => `- ${r.content}`).join('\n')
      : '(nothing yet — this is your first move)';

    const situationText = `At ${this.location}. ${eventsHere}\nCurrent plan: ${this.currentPlan}`;
    const blended = await getBlendedMemories(this.id, situationText, MEMORY_WINDOW);
    const ownMemoriesText = blended.length
      ? blended.map((m) => `- [${m.type}] ${m.content}`).join('\n')
      : '(no memories yet)';

    return [
      {
        role: 'system',
        content: `You are roleplaying as a character named ${this.name} inside a small lively village.
Persona: ${this.persona}

You only know what is written below. You have no knowledge of the village beyond this.
Stay fully in character.
IMPORTANT: Never repeat your previous dialogue or action almost word-for-word. If a topic feels resolved, stuck, or you already said something similar recently, change the subject, actually answer a question you were asked, or switch to a different action instead of repeating yourself.

The village has these locations:
${LOCATION_LIST_TEXT}

You can only see and hear what happens at your current location — nothing from
elsewhere in the village reaches you. To go somewhere else, use action "move" with
target set to EXACTLY one of the location names above (not your current location).

Respond ONLY with valid JSON, no extra text, in this exact shape:
{"action": "speak|move|wait|interact", "target": "a location name if moving, a person's name if speaking to them, or empty string", "dialogue": "what you say out loud, or empty string", "plan": "your next intention in one short sentence, updated from your current plan", "reason": "one short sentence, your private reasoning"}`,
      },
      {
        role: 'user',
        content: `You are currently at: ${this.location}
People here with you right now: ${peopleHere.length ? peopleHere.join(', ') : '(no one else)'}

Things you already said or did recently — do not repeat any of these almost word-for-word:
${lastOwnText}

Recent things that happened here:
${eventsHere}

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

    if (!parsed.action) parsed.action = parsed.dialogue ? 'speak' : 'wait';
    parsed.target = parsed.target || '';
    parsed.dialogue = parsed.dialogue || '';
    parsed.reason = parsed.reason || '';

    if (parsed.plan) {
      this.currentPlan = parsed.plan;
    }

    // Movement is now real: the target must be a valid location that isn't
    // where the agent already is. Anything else falls back to "wait" rather
    // than silently teleporting or ignoring a bad destination.
    if (parsed.action === 'move') {
      if (parsed.target && LOCATIONS[parsed.target] && parsed.target !== this.location) {
        this.location = parsed.target;
      } else {
        parsed.action = 'wait';
        if (!parsed.reason || parsed.reason === 'testing') {
          parsed.reason = '(tried to move but gave no valid new destination)';
        }
      }
    }

    world.setAgentLocation(this.name, this.location);

    const description = parsed.dialogue
      ? `${parsed.action} — "${parsed.dialogue}"`
      : `${parsed.action}${parsed.action === 'move' ? ' to ' + this.location : ''}`;

    const memoryType = parsed.dialogue ? 'dialogue' : 'action';
    await addMemory(this.id, memoryType, description);
    world.addEvent(this.name, this.location, description);

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