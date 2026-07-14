const WORLD_WIDTH = 800;
const WORLD_HEIGHT = 500;

let scene;
const sprites = {}; // name -> sprite bundle

// Simple original iconography per location — no external art, just distinct
// Phaser-drawn shapes in our own palette.
function drawLocationMarker(targetScene, name, loc) {
  const { x, y } = loc;
  const g = targetScene.add.graphics();
  g.lineStyle(2, 0xe8a33d, 0.65);
  g.fillStyle(0x2b2318, 0.35);

  if (name === 'Map Stand') {
    g.fillRoundedRect(x - 32, y - 14, 64, 28, 4);
    g.strokeRoundedRect(x - 32, y - 14, 64, 28, 4);
  } else if (name === 'Guard Post') {
    g.beginPath();
    g.moveTo(x, y - 30);
    g.lineTo(x - 22, y + 14);
    g.lineTo(x + 22, y + 14);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (name === 'Tavern') {
    g.beginPath();
    g.moveTo(x, y - 24);
    g.lineTo(x - 26, y + 16);
    g.lineTo(x + 26, y + 16);
    g.closePath();
    g.fillPath();
    g.strokePath();
  } else if (name === 'Market') {
    g.fillRoundedRect(x - 34, y - 8, 68, 20, 3);
    g.strokeRoundedRect(x - 34, y - 8, 68, 20, 3);
    g.lineStyle(2, 0xe8a33d, 0.85);
    g.beginPath();
    g.moveTo(x - 34, y - 8);
    g.lineTo(x, y - 24);
    g.lineTo(x + 34, y - 8);
    g.strokePath();
  } else if (name === 'Fountain') {
    g.strokeCircle(x, y, 26);
    g.strokeCircle(x, y, 15);
  } else {
    g.strokeCircle(x, y, 20);
  }

  targetScene.add
    .text(x, y + 42, name, { fontFamily: 'Inter', fontSize: '12px', color: '#8b93a8' })
    .setOrigin(0.5);

  // Signature ambient touch: a slow-breathing lantern glow at the guard post.
  if (name === 'Guard Post') {
    const glow = targetScene.add.circle(x, y - 10, 70, 0xe8a33d, 0.12);
    targetScene.tweens.add({
      targets: glow,
      alpha: { from: 0.08, to: 0.22 },
      scale: { from: 0.9, to: 1.15 },
      duration: 2200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}

class TownScene extends Phaser.Scene {
  constructor(locations) {
    super('TownScene');
    this.locations = locations || {};
  }

  create() {
    scene = this;

    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x34302a);

    Object.entries(this.locations).forEach(([name, loc]) => drawLocationMarker(this, name, loc));

    connectWebSocket();
  }
}

function ensureSprite(agentState) {
  if (sprites[agentState.name]) return sprites[agentState.name];

  const colorHex = Phaser.Display.Color.HexStringToColor(agentState.color).color;

  const container = scene.add.container(agentState.x, agentState.y);
  const circle = scene.add.circle(0, 0, 22, colorHex);
  circle.setStrokeStyle(2, 0xe8dcc0, 0.6);
  const nameText = scene.add
    .text(0, 34, agentState.name, { fontFamily: 'Spectral', fontSize: '15px', fontStyle: '600', color: '#e8dcc0' })
    .setOrigin(0.5);
  const statusText = scene.add
    .text(0, -34, '', { fontFamily: 'Inter', fontSize: '11px', color: '#8b93a8' })
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
      fontFamily: 'Inter',
      fontSize: '13px',
      color: '#2b2318',
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
  entry.bubbleBg.fillStyle(0xe8dcc0, 0.96);
  entry.bubbleBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
  entry.bubbleBg.lineStyle(1.5, 0xe8a33d, 0.8);
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

function handleTick(state) {
  document.getElementById('tickCount').textContent = `tick ${state.tick}`;
  state.agents.forEach(updateAgent);
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

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
    <p class="persona">${escapeHtml(data.persona)}</p>
    <div class="plan-label">Currently at</div>
    <p class="plan">${escapeHtml(data.location)}</p>
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

window.addEventListener('DOMContentLoaded', async () => {
  let locations = {};
  try {
    const res = await fetch('/api/locations');
    locations = await res.json();
  } catch (err) {
    console.error('failed to load locations', err);
  }

  new Phaser.Game({
    type: Phaser.AUTO,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    parent: 'gameContainer',
    backgroundColor: '#1b2032',
    scene: new TownScene(locations),
  });
});