/* global VillageWorld */
const chronicleEntries = [];
const CHRONICLE_MAX = 40;
const rosterLocationEls = {};

let village;

const ROLE_AVATAR = { merchant: '🗺️', guard: '🛡️', bard: '🎵' };

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

// --- Character roster ---

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
      card.className = 'char-card';
      const stats = a.stats || { hp: 100, atk: 10, def: 10 };
      const avatar = ROLE_AVATAR[a.npcType] || '👤';
      card.innerHTML = `
        <div class="char-avatar char-avatar--${escapeHtml(a.npcType || 'merchant')}" style="--accent:${escapeHtml(a.color)}">${avatar}</div>
        <div class="char-body">
          <div class="char-name">${escapeHtml(a.name)}</div>
          <div class="char-role">${escapeHtml(a.role || '')}</div>
          <div class="char-stats">
            <span class="stat" title="Health">❤ ${stats.hp}</span>
            <span class="stat" title="Attack">⚔ ${stats.atk}</span>
            <span class="stat" title="Defense">🛡 ${stats.def}</span>
          </div>
          <p class="char-blurb">${escapeHtml(a.blurb || a.persona || '')}</p>
          <div class="char-location roster-location">at ${escapeHtml(a.location || '…')}</div>
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

// --- WebSocket ---

function handleTick(state) {
  document.getElementById('tickCount').textContent = `tick ${state.tick}`;
  state.agents.forEach((agentState) => {
    village.updateAgent(agentState);
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

// --- Inspector ---

function renderInspector(data) {
  const panel = document.getElementById('inspector-body');
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
  const panel = document.getElementById('inspector-body');
  panel.innerHTML = '<div class="inspector-loading">Reading their thoughts…</div>';
  document.querySelectorAll('.char-card').forEach((c) => c.classList.remove('selected'));
  const card = [...document.querySelectorAll('.char-card')].find(
    (c) => c.querySelector('.char-name')?.textContent === name
  );
  if (card) card.classList.add('selected');

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

window.addEventListener('DOMContentLoaded', () => {
  loadRoster();

  const container = document.getElementById('gameContainer');
  village = new VillageWorld(container);
  village.onClickAgent = openInspector;
  village.ready();
});
