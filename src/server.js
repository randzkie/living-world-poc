const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { getRecentMemories } = require('./memoryStore');
const { LOCATIONS } = require('./locations');

// Wires up the HTTP server (serves the Phaser frontend + a small REST API
// for the inspector panel) and a WebSocket server (pushes tick updates).
// Takes the live `agents` array so routes can look up each agent's DB id.
function createServer(agents) {
  const app = express();
  app.use(express.static(path.join(__dirname, '..', 'public')));

  // Static reference data for the frontend to draw landmarks — fetched once
  // on load, not part of the per-tick broadcast.
  app.get('/api/locations', (req, res) => {
    res.json(LOCATIONS);
  });

  app.get('/api/agents', (req, res) => {
    res.json(agents.map((a) => ({ name: a.name, persona: a.persona, color: a.color })));
  });

  // On-demand detail for the inspector panel — not pushed every tick, only
  // fetched when someone clicks a character in the browser.
  app.get('/api/agents/:name/memories', async (req, res) => {
    const agent = agents.find((a) => a.name === req.params.name);
    if (!agent) {
      res.status(404).json({ error: 'Unknown agent' });
      return;
    }
    try {
      const rows = await getRecentMemories(agent.id, 8);
      res.json({
        name: agent.name,
        persona: agent.persona,
        plan: agent.currentPlan,
        location: agent.location,
        memories: rows.map((m) => ({ type: m.type, content: m.content, createdAt: m.created_at })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  // Newly connected clients immediately get the last known state, instead of
  // waiting up to TICK_DELAY_MS for the next broadcast.
  let latestState = null;
  wss.on('connection', (ws) => {
    if (latestState) {
      ws.send(JSON.stringify(latestState));
    }
  });

  function broadcast(state) {
    latestState = state;
    const payload = JSON.stringify(state);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(payload);
    });
  }

  return { server, broadcast };
}

module.exports = { createServer };