const config = require('./config');
const { pool } = require('./db');
const { World } = require('./world');
const { Agent } = require('./agents');
const { createServer } = require('./server');

// Phase 4: same three characters, now with a live browser view. Each has a
// "home" position in a simple town-square layout and a color for the canvas.
// This is illustrative (not real pathfinding) — Phase 3's real map/movement
// is still on the roadmap.
const AGENT_LAYOUT = {
  Mira: { x: 200, y: 320, color: '#4f9d8a' },
  Tomas: { x: 560, y: 180, color: '#a24b52' },
  Elyas: { x: 400, y: 420, color: '#8b6bc4' },
};

const agents = [
  new Agent({
    name: 'Mira',
    persona:
      'A curious street vendor who sells old maps. Friendly but nosy, always asking questions about strangers.',
  }),
  new Agent({
    name: 'Tomas',
    persona:
      'A tired night guard who has worked this post for 20 years. Gruff, dry humor, secretly lonely.',
  }),
  new Agent({
    name: 'Elyas',
    persona:
      'A traveling bard collecting local rumors and stories for his next song. Charming, nosy in a different way than Mira, easily distracted by anything interesting.',
  }),
];

for (const agent of agents) {
  const layout = AGENT_LAYOUT[agent.name] || { x: 400, y: 300, color: '#999999' };
  agent.x = layout.x;
  agent.y = layout.y;
  agent.color = layout.color;
}

const world = new World();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Small illustrative wander around each agent's home spot when it "moves" —
// not real pathfinding, just enough to make the canvas feel alive.
function jitterPosition(agent) {
  const home = AGENT_LAYOUT[agent.name];
  const dx = (Math.random() - 0.5) * 120;
  const dy = (Math.random() - 0.5) * 80;
  agent.x = Math.max(60, Math.min(740, home.x + dx));
  agent.y = Math.max(60, Math.min(440, home.y + dy));
}

async function checkDatabaseReady() {
  let client;
  try {
    client = await pool.connect();
  } catch (err) {
    if (err.code === '3D000') {
      console.error('Postgres is reachable, but the "livingworld" database doesn\'t exist yet.');
      console.error(
        "This usually means Postgres initialized before this project's schema could run " +
          '(e.g. a leftover Docker volume, or you connected to a different local Postgres install).'
      );
    } else {
      console.error('Could not connect to Postgres. Is it running?');
      console.error('Try: npm run db:up');
    }
    console.error('Fix: npm run db:reset   (wipes the local dev volume and reinitializes cleanly)');
    console.error(`Details: ${err.message}`);
    process.exit(1);
  }

  try {
    const { rows } = await client.query("SELECT to_regclass('public.agents') AS reg");
    if (!rows[0].reg) {
      console.error('Connected to Postgres, but the schema is missing (no "agents" table).');
      console.error('Fix: npm run db:reset   (wipes the local dev volume and reinitializes cleanly)');
      process.exit(1);
    }
  } finally {
    client.release();
  }
}

async function runTick(tickNumber, broadcast) {
  console.log(`\n--- tick ${tickNumber} ---`);
  const tickAgentStates = [];

  for (const agent of agents) {
    try {
      const result = await agent.act(world);
      if (result.action === 'move') jitterPosition(agent);

      const dialogue = result.dialogue ? ` — "${result.dialogue}"` : '';
      console.log(`${agent.name}: ${result.action}${dialogue}`);
      console.log(`  (plan: ${agent.currentPlan})`);

      tickAgentStates.push({
        name: agent.name,
        x: agent.x,
        y: agent.y,
        color: agent.color,
        action: result.action,
        dialogue: result.dialogue,
        plan: agent.currentPlan,
      });
    } catch (err) {
      console.error(`${agent.name} failed to act: ${err.message}`);
      tickAgentStates.push({
        name: agent.name,
        x: agent.x,
        y: agent.y,
        color: agent.color,
        action: 'error',
        dialogue: '',
        plan: agent.currentPlan,
      });
    }
  }

  broadcast({ type: 'tick', tick: tickNumber, agents: tickAgentStates });
}

async function main() {
  await checkDatabaseReady();

  for (const agent of agents) {
    await agent.init();
  }

  const { server, broadcast } = createServer(agents);
  server.listen(config.PORT, () => {
    console.log(`Living World viewer running — open http://localhost:${config.PORT} in your browser`);
  });

  console.log(
    `Starting simulation — ${agents.length} agents, model: ${config.CLOUDFLARE_MODEL}` +
      (config.TICKS > 0 ? `, stopping after ${config.TICKS} ticks` : ', running until stopped (Ctrl+C)')
  );

  let i = 1;
  while (config.TICKS === 0 || i <= config.TICKS) {
    await runTick(i, broadcast);
    await sleep(config.TICK_DELAY_MS);
    i++;
  }

  console.log('\nTick limit reached. Memory is saved — the viewer keeps running so you can look around.');
  console.log('Press Ctrl+C to stop the server.');
}

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await pool.end();
  process.exit(0);
});

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await pool.end();
  process.exit(1);
});