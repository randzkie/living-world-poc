const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 460;

let scene;
const sprites = {}; // name -> sprite bundle
const rosterLocationEls = {}; // name -> DOM element showing "at X"

const chronicleEntries = [];
const CHRONICLE_MAX = 40;

// Worn dirt paths radiating from the well, drawn under everything else —
// a cheap, no-assets way to make the layout read as a real town rather than
// scattered icons. (Tilemap-style ground detail, just procedurally drawn.)
function drawPaths(targetScene, locations) {
  const hub = locations['The Old Well'];
  if (!hub) return;
  const g = targetScene.add.graphics();

  g.lineStyle(14, 0xcbb37a, 0.45);
  Object.entries(locations).forEach(([name, loc]) => {
    if (name === 'The Old Well') return;
    g.beginPath();
    g.moveTo(hub.x, hub.y);
    g.lineTo(loc.x, loc.y);
    g.strokePath();
  });

  g.lineStyle(3, 0xe4d3a0, 0.5);
  Object.entries(locations).forEach(([name, loc]) => {
    if (name === 'The Old Well') return;
    g.beginPath();
    g.moveTo(hub.x, hub.y);
    g.lineTo(loc.x, loc.y);
    g.strokePath();
  });
}

// Original iconography per location — heraldic wine/gold on stone-grey,
// no external art assets. Icon choice matches each location's flavor.
function drawLocationMarker(targetScene, name, loc) {
  const { x, y } = loc;
  const g = targetScene.add.graphics();
  g.lineStyle(2, 0x6b1f2a, 0.75);
  g.fillStyle(0x2b2013, 0.16);

  if (name === "Cartographer's Stall") {
    g.fillRoundedRect(x - 32, y - 14, 64, 28, 4);
    g.strokeRoundedRect(x - 32, y - 14, 64, 28, 4);
    g.lineStyle(2, 0xb8860b, 0.8);
    g.beginPath();
    g.moveTo(x - 18, y - 2);
    g.lineTo(x + 18, y - 6);
    g.strokePath();
  } else if (name === 'The Watchtower') {
    g.beginPath();
    g.moveTo(x, y - 30);
    g.lineTo(x - 22, y + 14);
    g.lineTo(x + 22, y + 14);
    g.closePath();
    g.fillPath();
    g.strokePath();
    // small pennant
    g.fillStyle(0x6b1f2a, 0.9);
    g.beginPath();
    g.moveTo(x, y - 30);
    g.lineTo(x + 16, y - 26);
    g.lineTo(x, y - 22);
    g.closePath();
    g.fillPath();
  } else if (name === 'The Weary Boar') {
    g.beginPath();
    g.moveTo(x, y - 24);
    g.lineTo(x - 26, y + 16);
    g.lineTo(x + 26, y + 16);
    g.closePath();
    g.fillPath();
    g.strokePath();
    // hanging tavern sign
    g.lineStyle(2, 0x6b1f2a, 0.7);
    g.strokeCircle(x, y - 40, 8);
  } else if (name === 'Market Row') {
    g.fillRoundedRect(x - 34, y - 8, 68, 20, 3);
    g.strokeRoundedRect(x - 34, y - 8, 68, 20, 3);
    g.lineStyle(2, 0x6b1f2a, 0.9);
    g.beginPath();
    g.moveTo(x - 34, y - 8);
    g.lineTo(x, y - 24);
    g.lineTo(x + 34, y - 8);
    g.strokePath();
  } else if (name === 'The Old Well') {
    g.strokeCircle(x, y, 26);
    g.strokeCircle(x, y, 15);
  } else {
    g.strokeCircle(x, y, 20);
  }

  targetScene.add
    .text(x, y + 42, name, { fontFamily: 'Cinzel', fontSize: '11px', color: '#4a3a24' })
    .setOrigin(0.5);

  // Signature ambient touch: an organic, flickering torch glow at the
  // watchtower — a chain of short randomized tweens instead of a clean
  // mechanical pulse, so it reads more like real firelight.
  if (name === 'The Watchtower') {
    g.fillStyle(0x2b2013, 0.6);
    g.fillRect(x - 3, y - 44, 6, 14);

    const glow = targetScene.add.circle(x, y - 44, 34, 0xd9a441, 0.22);
    function flicker() {
      targetScene.tweens.add({
        targets: glow,
        alpha: 0.12 + Math.random() * 0.24,
        scale: 0.85 + Math.random() * 0.4,
        duration: 140 + Math.random() * 220,
        ease: 'Sine.easeInOut',
        onComplete: flicker,
      });
    }
    flicker();
  }
}

class TownScene extends Phaser.Scene {
  constructor(locations) {
    super('TownScene');
    this.locations = locations || {};
  }

  create() {
    scene = this;

    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x7a9b5e);
    this.add.ellipse(WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 20, 360, 220, 0x8dae70, 0.5);

    drawPaths(this, this.locations);
    Object.entries(this.locations).forEach(([name, loc]) => drawLocationMarker(this, name, loc));

    connectWebSocket();
  }
}

function ensureSprite(agentState) {
  if (sprites[agentState.name]) return sprites[agentState.name];

  const colorHex = Phaser.Display.Color.HexStringToColor(agentState.color).color;

  const container = scene.add.container(agentState.x, agentState.y);
  const circle = scene.add.circle(0, 0, 22, colorHex);
  circle.setStrokeStyle(2, 0xf5ecd2, 0.9);
  const nameText = scene.add
    .text(0, 34, agentState.name, { fontFamily: 'Spectral', fontSize: '15px', fontStyle: '600', color: '#2b2013' })
    .setOrigin(0.5);
  const statusText = scene.add
    .text(0, -34, '', { fontFamily: 'Spectral', fontSize: '11px', color: '#4a3a24' })
    .setOrigin(0.5);

  container.add([circle, nameText, statusText]);

  circle.setInteractive({ useHandCursor: true });
  circle.on('pointerdown', () => openInspector(agentState.name));
  circle.on('pointerover', () => circle.setScale(1.12));
  circle.on('pointerout', () => circle.setScale(1));

  const bubbleContainer = scene.add.container(agentState.x, agentState.y - 55).setAlpha(0);
  const bubbleBg = scene.add.graphics();
  const bubbleText = scene.add
    .text(0, 0, '', {
      fontFamily: 'Spectral',
      fontSize: '13px',
      color: '#2b2013',
      wordWrap: { width: 180 },
      align: 'center',
    })
    .setOrigin(0.5);
  bubbleContainer.add([bubbleBg, bubbleText]);

  const entry = { container, circle, nameText, statusText, bubbleContainer, bubbleBg, bubbleText, lastLocation: null };
  sprites[agentState.name] = entry;
  return entry;
}

function drawBubble(entry, text) {
  entry.bubbleText.setText(text);
  const bounds = entry.bubbleText.getBounds();
  const w = bounds.width + 24;
  const h = bounds.height + 16;

  entry.bubbleBg.clear();
  entry.bubbleBg.fillStyle(0xf5ecd2, 0.98);
  entry.bubbleBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  entry.bubbleBg.lineStyle(1.5, 0xb8860b, 0.9);
  entry.bubbleBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
}

function updateAgent(agentState) {
  const entry = ensureSprite(agentState);
  const moved = entry.lastLocation !== null && entry.lastLocation !== agentState.location;
  entry.lastLocation = agentState.location;

  scene.tweens.add({
    targets: entry.container,
    x: agentState.x,
    y: agentState.y,
    duration: moved ? 1400 : 700,
    ease: 'Sine.easeInOut',
  });
  scene.tweens.add({
    targets: entry.bubbleContainer,
    x: agentState.x,
    y: agentState.y - 55,
    duration: moved ? 1400 : 700,
    ease: 'Sine.easeInOut',
  });

  if (agentState.dialogue) {
    drawBubble(entry, agentState.dialogue);
    entry.bubbleContainer.setAlpha(0).setScale(0.85);
    scene.tweens.add({ targets: entry.bubbleContainer, alpha: 1, scale: 1, duration: 220, ease: 'Back.easeOut' });
    scene.time.delayedCall(4500, () => {
      scene.tweens.add({ targets: entry.bubbleContainer, alpha: 0, duration: 400 });
    });
    entry.statusText.setText('');
  } else if (moved) {
    entry.statusText.setText(`walks to ${agentState.location}`);
  } else {
    entry.statusText.setText(agentState.action === 'wait' ? `waits at ${agentState.location}` : '');
  }
}

// --- Village Chronicle ---

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function pushChronicle(tick, text) {
  chronicleEntries.push({ tick, text });
  if (chronicleEntries.length > CHRONICLE_MAX) chronicleEntries.shift();
  renderChronicle();
}

function renderChronicle() {
  const list = document.getElementById('chronicle');
  if (!chronicleEntries.length) {
    list.innerHTML = '<li class="chronicle-empty">Waiting for the first events…</li>';
    return;
  }
  list.innerHTML = chronicleEntries
    .map(
      (e) =>
        `<li class="chronicle-entry"><span class="chronicle-tick">t${e.tick}</span>${escapeHtml(e.text)}</li>`
    )
    .join('');
}

// --- Townsfolk roster ---

function updateRosterLocation(name, loc) {
  const el = rosterLocationEls[name];
  if (el) el.textContent = `at ${loc}`;
}

async function loadRoster() {
  try {
    const res = await fetch('/api/agents');
    const list = await res.json();
    const container = document.getElementById('roster');
    container.innerHTML = '';
    list.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'roster-card';
      card.innerHTML = `
        <span class="roster-dot" style="background:${a.color}"></span>
        <div>
          <div class="roster-name">${escapeHtml(a.name)}</div>
          <div class="roster-role">${escapeHtml(a.role || '')}</div>
          <div class="roster-location">at ${escapeHtml(a.location || '…')}</div>
        </div>
      `;
      card.addEventListener('click', () => openInspector(a.name));
      container.appendChild(card);
      rosterLocationEls[a.name] = card.querySelector('.roster-location');
    });
  } catch (err) {
    console.error('failed to load roster', err);
  }
}

// --- WebSocket + tick handling ---

function handleTick(state) {
  document.getElementById('tickCount').textContent = `tick ${state.tick}`;
  state.agents.forEach((agentState) => {
    updateAgent(agentState);
    updateRosterLocation(agentState.name, agentState.location);

    if (agentState.dialogue) {
      pushChronicle(state.tick, `${agentState.name} says: "${agentState.dialogue}"`);
    } else if (agentState.action === 'move') {
      pushChronicle(state.tick, `${agentState.name} walks to ${agentState.location}`);
    }
  });
}

function setConnectionStatus(connected) {
  const dot = document.getElementById('connDot');
  const label = document.getElementById('connLabel');
  dot.classList.toggle('connected', connected);
  label.textContent = connected ? 'live' : 'reconnecting…';
}

function connectWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  const ws = new WebSocket(`${proto}://${location.host}`);

  ws.addEventListener('open', () => setConnectionStatus(true));
  ws.addEventListener('close', () => {
    setConnectionStatus(false);
    setTimeout(connectWebSocket, 2000);
  });
  ws.addEventListener('error', () => ws.close());
  ws.addEventListener('message', (event) => {
    try {
      const state = JSON.parse(event.data);
      if (state.type === 'tick') handleTick(state);
    } catch (err) {
      console.error('bad message from server', err);
    }
  });
}

// --- Inspector panel ---

function renderInspector(data) {
  const panel = document.getElementById('inspector');
  const memoriesHtml = data.memories.length
    ? data.memories
        .map(
          (m) => `
        <li class="memory memory-${escapeHtml(m.type)}">
          <span class="memory-type">${escapeHtml(m.type)}</span>
          <span class="memory-content">${escapeHtml(m.content)}</span>
        </li>`
        )
        .join('')
    : '<li class="memory-empty">No memories yet.</li>';

  panel.innerHTML = `
    <h2>${escapeHtml(data.name)}</h2>
    <span class="location-tag">${escapeHtml(data.location)}</span>
    <p class="persona">${data.role ? `<strong>${escapeHtml(data.role)}</strong> — ` : ''}${escapeHtml(data.persona)}</p>
    <div class="plan-label">Current plan</div>
    <p class="plan">${escapeHtml(data.plan)}</p>
    <div class="plan-label">Recent memories</div>
    <ul class="memories">${memoriesHtml}</ul>
  `;
}

async function openInspector(name) {
  const panel = document.getElementById('inspector');
  panel.innerHTML = '<div class="inspector-loading">Reading their thoughts…</div>';
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(name)}/memories`);
    if (!res.ok) throw new Error('request failed');
    const data = await res.json();
    renderInspector(data);
  } catch (err) {
    panel.innerHTML = '<div class="inspector-empty">Could not load — try clicking again.</div>';
  }
}

// --- Boot ---

window.addEventListener('DOMContentLoaded', async () => {
  let locations = {};
  try {
    const res = await fetch('/api/locations');
    locations = await res.json();
  } catch (err) {
    console.error('failed to load locations', err);
  }

  loadRoster();

  new Phaser.Game({
    type: Phaser.AUTO,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    parent: 'gameContainer',
    backgroundColor: '#7a9b5e',
    scene: new TownScene(locations),
  });
});