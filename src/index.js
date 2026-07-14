const config = require('./config');
const { pool } = require('./db');
const { World } = require('./world');
const { Agent } = require('./agents');
const { LOCATIONS } = require('./locations');
const { createServer } = require('./server');

const AGENT_SETUP = {
  Mira: {
    homeLocation: "Cartographer's Stall",
    color: '#4f9d8a',
    role: 'Map Seller',
    persona:
      'A curious street vendor who sells old maps. Friendly but nosy, always asking questions about strangers.',
  },
  Tomas: {
    homeLocation: 'The Watchtower',
    color: '#a24b52',
    role: 'Town Guard',
    persona:
      'A tired night guard who has worked this post for 20 years. Gruff, dry humor, secretly lonely.',
  },
  Elyas: {
    homeLocation: 'The Weary Boar',
    color: '#8b6bc4',
    role: 'Traveling Bard',
    persona:
      'A traveling bard collecting local rumors and stories for his next song. Charming, nosy in a different way than Mira, easily distracted by anything interesting.',
  },
};

const agents = Object.entries(AGENT_SETUP).map(
  ([name, setup]) => new Agent({ name, persona: setup.persona, homeLocation: setup.homeLocation })
);

for (const agent of agents) {
  const setup = AGENT_SETUP[agent.name];
  agent.color = setup.color;
  agent.role = setup.role;
  const pos = LOCATIONS[agent.homeLocation];
  agent.x = pos.x;
  agent.y = pos.y;
}

const world = new World();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

      // Location is now the real source of truth for position — no more
      // random jitter, the canvas coordinates come straight from LOCATIONS.
      const pos = LOCATIONS[agent.location];
      agent.x = pos.x;
      agent.y = pos.y;

      const dialogue = result.dialogue ? ` — "${result.dialogue}"` : '';
      console.log(`${agent.name} @ ${agent.location}: ${result.action}${dialogue}`);
      console.log(`  (plan: ${agent.currentPlan})`);

      tickAgentStates.push({
        name: agent.name,
        x: agent.x,
        y: agent.y,
        color: agent.color,
        location: agent.location,
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
        location: agent.location,
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
    world.setAgentLocation(agent.name, agent.location);
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