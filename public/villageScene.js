/* global THREE, Character3D */
// Full procedural Clash-of-Clans-style isometric village (no cropped concept art).

const WORLD = {
  // locations as world X / Z — shared with backend via locations.js (x,y → x,z)
  townHall: { x: 0.2, z: -1.8 },
  fountain: { x: -0.3, z: 1.4 },
  mapStand: { x: -2.0, z: 0.6 },
  market: { x: -3.2, z: -0.2 },
  guardPost: { x: 3.4, z: -2.0 },
  bardsTent: { x: 3.0, z: 2.2 },
  barracks: { x: 2.2, z: -0.8 },
};

function m(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.65,
    metalness: 0.05,
    flatShading: false,
    ...extra,
  });
}

function mesh(geo, color, parent, x = 0, y = 0, z = 0) {
  const obj = new THREE.Mesh(geo, typeof color === 'number' ? m(color) : color);
  obj.position.set(x, y, z);
  obj.castShadow = true;
  obj.receiveShadow = true;
  parent.add(obj);
  return obj;
}

function buildVillage(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // --- Terrain: bright grass island ---
  mesh(new THREE.CylinderGeometry(7.2, 7.4, 0.35, 48), 0x4db84a, root, 0, -0.18, 0);
  mesh(new THREE.CylinderGeometry(6.6, 6.6, 0.08, 48), 0x5ecf5a, root, 0, 0.02, 0);

  // grass color patches
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2 + Math.random();
    const r = 1.5 + Math.random() * 4;
    mesh(
      new THREE.CircleGeometry(0.4 + Math.random() * 0.5, 12),
      0x6ee068,
      root,
      Math.cos(a) * r,
      0.04,
      Math.sin(a) * r
    ).rotation.x = -Math.PI / 2;
  }

  // flower dots
  for (let i = 0; i < 30; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1 + Math.random() * 5;
    const col = [0xff6b6b, 0xffe066, 0xffffff, 0xff9ecd][i % 4];
    mesh(new THREE.SphereGeometry(0.04, 6, 6), col, root, Math.cos(a) * r, 0.06, Math.sin(a) * r);
  }

  // --- Water + dock (left) ---
  const water = mesh(new THREE.CircleGeometry(2.4, 32), m(0x4fc3f7, { roughness: 0.25, metalness: 0.15 }), root, -5.6, 0.0, 1.2);
  water.rotation.x = -Math.PI / 2;
  water.receiveShadow = false;
  // dock
  mesh(new THREE.BoxGeometry(1.4, 0.1, 0.55), 0x8b5a2b, root, -4.6, 0.08, 1.2);
  mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), 0x6b4226, root, -5.2, -0.05, 1.0);
  mesh(new THREE.BoxGeometry(0.12, 0.4, 0.12), 0x6b4226, root, -5.2, -0.05, 1.4);
  // boat
  const boat = new THREE.Group();
  boat.position.set(-5.5, 0.05, 1.8);
  root.add(boat);
  mesh(new THREE.CapsuleGeometry(0.18, 0.55, 4, 8), 0xa0522d, boat, 0, 0, 0).rotation.z = Math.PI / 2;

  // --- Stone plaza under fountain ---
  mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.06, 24), 0xa8a8a8, root, WORLD.fountain.x, 0.03, WORLD.fountain.z);

  // dirt paths (simple strips)
  const paths = [
    [WORLD.townHall, WORLD.fountain],
    [WORLD.fountain, WORLD.market],
    [WORLD.fountain, WORLD.mapStand],
    [WORLD.fountain, WORLD.guardPost],
    [WORLD.fountain, WORLD.bardsTent],
    [WORLD.townHall, WORLD.barracks],
    [WORLD.barracks, WORLD.guardPost],
  ];
  paths.forEach(([a, b]) => {
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    const midX = (a.x + b.x) / 2;
    const midZ = (a.z + b.z) / 2;
    const p = mesh(new THREE.BoxGeometry(0.45, 0.04, len), 0xc9a06a, root, midX, 0.03, midZ);
    p.rotation.y = Math.atan2(dx, dz);
  });

  // --- Buildings ---
  buildTownHall(root, WORLD.townHall.x, WORLD.townHall.z);
  buildMarket(root, WORLD.market.x, WORLD.market.z);
  buildMapStand(root, WORLD.mapStand.x, WORLD.mapStand.z);
  buildGuardPost(root, WORLD.guardPost.x, WORLD.guardPost.z);
  buildBardsTent(root, WORLD.bardsTent.x, WORLD.bardsTent.z);
  buildBarracks(root, WORLD.barracks.x, WORLD.barracks.z);
  buildFountain(root, WORLD.fountain.x, WORLD.fountain.z);

  // --- Perimeter fence ---
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const r = 5.8;
    const px = Math.cos(a) * r;
    const pz = Math.sin(a) * r;
    // skip water side
    if (px < -5) continue;
    mesh(new THREE.BoxGeometry(0.12, 0.45, 0.12), 0x9a9a9a, root, px, 0.22, pz);
    if (i % 2 === 0) mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), 0x8b5a2b, root, px, 0.32, pz);
  }

  // gate with blue banner near front
  mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), 0x888888, root, -1.1, 0.45, 5.5);
  mesh(new THREE.BoxGeometry(0.25, 0.9, 0.25), 0x888888, root, 1.1, 0.45, 5.5);
  mesh(new THREE.BoxGeometry(2.2, 0.15, 0.15), 0x6b4226, root, 0, 0.85, 5.5);
  mesh(new THREE.BoxGeometry(0.4, 0.35, 0.05), 0x4a8fd9, root, 0, 0.7, 5.55);

  // --- Trees & rocks ---
  const treeSpots = [
    [-4.5, -2.5], [-3.8, 3.2], [-1.5, -3.8], [1.2, -4.0], [4.5, -3.2],
    [5.2, 0.5], [4.8, 3.5], [-0.5, 4.5], [2.5, 4.2], [-4.0, 0.5],
    [5.5, -1.2], [-2.8, -3.5],
  ];
  treeSpots.forEach(([tx, tz], i) => buildTree(root, tx, tz, i % 2 === 0 ? 'pine' : 'round'));

  [[-3.5, 2.8], [1.8, 3.5], [4.2, 1.5], [-1.8, -2.5], [3.5, -3.5]].forEach(([rx, rz]) => {
    const rock = mesh(new THREE.SphereGeometry(0.18 + Math.random() * 0.1, 10, 8), 0x8e9aab, root, rx, 0.12, rz);
    rock.scale.set(1.2, 0.7, 1);
  });

  // lanterns
  [[-2.5, 0.2], [1.5, 1.0], [2.5, 2.0]].forEach(([lx, lz]) => {
    mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 8), 0x6b4226, root, lx, 0.28, lz);
    const glow = mesh(new THREE.SphereGeometry(0.1, 10, 8), m(0xffcc66, { emissive: 0xffaa33, emissiveIntensity: 0.6 }), root, lx, 0.58, lz);
    glow.castShadow = false;
  });

  return root;
}

function buildTownHall(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.BoxGeometry(1.6, 0.9, 1.3), 0xd8c8a8, g, 0, 0.45, 0);
  mesh(new THREE.BoxGeometry(1.7, 0.25, 1.4), 0x9a9a9a, g, 0, 0.12, 0);
  // orange roof
  const roof = mesh(new THREE.ConeGeometry(1.35, 0.75, 4), 0xe67e22, g, 0, 1.2, 0);
  roof.rotation.y = Math.PI / 4;
  // door
  mesh(new THREE.BoxGeometry(0.28, 0.4, 0.08), 0x6b4226, g, 0, 0.28, 0.66);
  // windows
  mesh(new THREE.BoxGeometry(0.18, 0.18, 0.06), 0x87ceeb, g, -0.45, 0.55, 0.66);
  mesh(new THREE.BoxGeometry(0.18, 0.18, 0.06), 0x87ceeb, g, 0.45, 0.55, 0.66);
  mesh(new THREE.BoxGeometry(0.2, 0.08, 0.2), 0xe67e22, g, 0.55, 1.35, -0.3); // chimney
}

function buildMarket(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.BoxGeometry(1.0, 0.35, 0.7), 0x8b5a2b, g, 0, 0.2, 0);
  // striped awning
  mesh(new THREE.BoxGeometry(1.15, 0.08, 0.85), 0xe74c3c, g, 0, 0.55, 0);
  mesh(new THREE.BoxGeometry(0.2, 0.08, 0.85), 0xffffff, g, -0.35, 0.56, 0);
  mesh(new THREE.BoxGeometry(0.2, 0.08, 0.85), 0xffffff, g, 0, 0.56, 0);
  mesh(new THREE.BoxGeometry(0.2, 0.08, 0.85), 0xffffff, g, 0.35, 0.56, 0);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), 0x6b4226, g, -0.45, 0.35, -0.3);
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.55, 6), 0x6b4226, g, 0.45, 0.35, -0.3);
  // goods
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), 0xf2d9a0, g, -0.2, 0.42, 0.15);
  mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), 0xf2d9a0, g, 0.15, 0.42, 0.1);
}

function buildMapStand(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.BoxGeometry(0.85, 0.3, 0.55), 0x8b5a2b, g, 0, 0.18, 0);
  mesh(new THREE.BoxGeometry(1.0, 0.06, 0.7), 0x4a8fd9, g, 0, 0.48, 0);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 6), 0x6b4226, g, -0.38, 0.28, -0.22);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 6), 0x6b4226, g, 0.38, 0.28, -0.22);
  // map scrolls
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), 0xf2d9a0, g, -0.15, 0.38, 0.1).rotation.z = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8), 0xf2d9a0, g, 0.15, 0.38, 0.05).rotation.z = Math.PI / 2;
}

function buildGuardPost(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  // stilts
  [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]].forEach(([px, pz]) => {
    mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.1, 8), 0x8b5a2b, g, px, 0.55, pz);
  });
  mesh(new THREE.BoxGeometry(0.85, 0.55, 0.85), 0xc4a574, g, 0, 1.2, 0);
  const roof = mesh(new THREE.ConeGeometry(0.75, 0.45, 4), 0x4a8fd9, g, 0, 1.7, 0);
  roof.rotation.y = Math.PI / 4;
  // flag
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 6), 0xeeeeee, g, 0.35, 1.95, 0);
  mesh(new THREE.BoxGeometry(0.25, 0.16, 0.02), 0x4a8fd9, g, 0.48, 2.05, 0);
  // platform rail
  mesh(new THREE.BoxGeometry(0.9, 0.08, 0.9), 0x6b4226, g, 0, 0.95, 0);
}

function buildBardsTent(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.ConeGeometry(0.7, 1.1, 10), 0x9b5cff, g, 0, 0.55, 0);
  mesh(new THREE.ConeGeometry(0.25, 0.2, 8), 0xf0c96a, g, 0, 1.15, 0);
  // doorway flap
  mesh(new THREE.BoxGeometry(0.25, 0.4, 0.05), 0x6e3ad4, g, 0, 0.25, 0.45);
  // campfire
  mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.08, 10), 0x555555, g, 0.7, 0.04, 0.3);
  const flame = mesh(new THREE.SphereGeometry(0.12, 10, 8), m(0xff7722, { emissive: 0xff4400, emissiveIntensity: 0.8 }), g, 0.7, 0.18, 0.3);
  flame.castShadow = false;
  g.userData.flame = flame;
  // crates
  mesh(new THREE.BoxGeometry(0.25, 0.2, 0.25), 0x8b5a2b, g, -0.55, 0.1, 0.35);
}

function buildBarracks(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.BoxGeometry(1.3, 0.7, 0.9), 0xc4a574, g, 0, 0.35, 0);
  const roof = mesh(new THREE.ConeGeometry(1.0, 0.5, 4), 0x4a8fd9, g, 0, 0.95, 0);
  roof.rotation.y = Math.PI / 4;
  mesh(new THREE.BoxGeometry(0.22, 0.35, 0.06), 0x6b4226, g, 0, 0.25, 0.46);
  // archery target
  mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 6), 0x8b5a2b, g, 0.9, 0.35, 0.5);
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 16), 0xffffff, g, 0.9, 0.55, 0.55).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 16), 0xe74c3c, g, 0.9, 0.55, 0.56).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.07, 12), 0xffe066, g, 0.9, 0.55, 0.57).rotation.x = Math.PI / 2;
}

function buildFountain(parent, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.2, 20), 0xa8a8a8, g, 0, 0.12, 0);
  mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.12, 20), 0x4fc3f7, g, 0, 0.22, 0);
  mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 10), 0x9a9a9a, g, 0, 0.4, 0);
  const spout = mesh(new THREE.SphereGeometry(0.12, 12, 10), m(0x81d4fa, { transparent: true, opacity: 0.7 }), g, 0, 0.62, 0);
  spout.castShadow = false;
}

function buildTree(parent, x, z, type) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  parent.add(g);
  mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.45, 8), 0x6b4226, g, 0, 0.22, 0);
  if (type === 'pine') {
    mesh(new THREE.ConeGeometry(0.45, 0.7, 8), 0x2d8a3e, g, 0, 0.7, 0);
    mesh(new THREE.ConeGeometry(0.35, 0.55, 8), 0x3aa04a, g, 0, 1.05, 0);
    mesh(new THREE.ConeGeometry(0.22, 0.4, 8), 0x45b84f, g, 0, 1.35, 0);
  } else {
    mesh(new THREE.SphereGeometry(0.45, 14, 12), 0x45b84f, g, 0, 0.75, 0);
    mesh(new THREE.SphereGeometry(0.3, 12, 10), 0x5ecf5a, g, 0.2, 0.9, 0.1);
  }
}

class VillageWorld {
  constructor(container) {
    this.container = container;
    this.agents = new Map();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.onClickAgent = null;
    this._wanderTimers = new Map();
    this._flames = [];

    this._buildScene();
    this._buildLabels();
    this._bindEvents();
    this._animate();
  }

  _buildScene() {
    const w = this.container.clientWidth || 720;
    const h = this.container.clientHeight || 480;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 18, 32);

    const aspect = w / h;
    const view = 6.2;
    this.camera = new THREE.OrthographicCamera(
      (-view * aspect) / 2,
      (view * aspect) / 2,
      view / 2,
      -view / 2,
      0.1,
      80
    );
    // classic isometric 45° look
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0.4, 0);

    this.scene.add(new THREE.AmbientLight(0xfff5e6, 0.7));
    const sun = new THREE.DirectionalLight(0xfff8ee, 1.15);
    sun.position.set(8, 14, 6);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 2;
    sun.shadow.camera.far = 40;
    sun.shadow.camera.left = -12;
    sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 12;
    sun.shadow.camera.bottom = -12;
    sun.shadow.bias = -0.0005;
    this.scene.add(sun);
    this.scene.add(new THREE.HemisphereLight(0x87ceeb, 0x4a7a3a, 0.35));

    this.village = buildVillage(this.scene);
    this.village.traverse((obj) => {
      if (obj.userData?.flame) this._flames.push(obj.userData.flame);
    });

    this.pickMeshes = [];
  }

  _buildLabels() {
    this.labelsLayer = document.createElement('div');
    this.labelsLayer.className = 'world-labels';
    this.container.appendChild(this.labelsLayer);
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._resize());
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.pickMeshes, true);
      if (!hits.length) return;
      let obj = hits[0].object;
      while (obj && !obj.userData.agentName) obj = obj.parent;
      if (obj?.userData.agentName && this.onClickAgent) this.onClickAgent(obj.userData.agentName);
    });
  }

  _resize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    if (!w || !h) return;
    const aspect = w / h;
    const view = 6.2;
    this.camera.left = (-view * aspect) / 2;
    this.camera.right = (view * aspect) / 2;
    this.camera.top = view / 2;
    this.camera.bottom = -view / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // Backend still sends x,y — we treat them as world X,Z
  mapToWorld(sx, sy) {
    return { x: sx, z: sy };
  }

  worldToScreen(wx, wz) {
    const v = new THREE.Vector3(wx, 0.85, wz);
    v.project(this.camera);
    const rect = this.renderer.domElement.getBoundingClientRect();
    return {
      x: ((v.x + 1) / 2) * rect.width,
      y: ((-v.y + 1) / 2) * rect.height,
    };
  }

  ensureAgent(agentState) {
    if (this.agents.has(agentState.name)) return this.agents.get(agentState.name);

    const character = new Character3D(agentState.npcType || 'merchant', agentState.name);
    const { x, z } = this.mapToWorld(agentState.x, agentState.y);
    character.group.position.set(x, 0, z);
    character.group.scale.setScalar(1.05);
    character.group.traverse((child) => {
      if (child.isMesh) {
        child.userData.agentName = agentState.name;
        this.pickMeshes.push(child);
      }
    });
    this.scene.add(character.group);

    const label = document.createElement('div');
    label.className = 'agent-label';
    label.innerHTML = `<span class="agent-name">${agentState.name}</span><span class="agent-status"></span>`;
    this.labelsLayer.appendChild(label);

    const bubble = document.createElement('div');
    bubble.className = 'agent-bubble';
    bubble.style.display = 'none';
    this.labelsLayer.appendChild(bubble);

    const entry = {
      name: agentState.name,
      npcType: agentState.npcType || 'merchant',
      character,
      label,
      statusEl: label.querySelector('.agent-status'),
      bubble,
      anchor: { x: agentState.x, y: agentState.y },
      current: { x, z },
      isMoving: false,
      lastLocation: null,
      dialogueTimer: 0,
    };

    this.agents.set(agentState.name, entry);
    this._scheduleWander(entry);
    return entry;
  }

  _scheduleWander(entry) {
    const existing = this._wanderTimers.get(entry.name);
    if (existing) clearTimeout(existing);

    const radius = { merchant: 0.7, guard: 0.5, bard: 0.85 }[entry.npcType] || 0.6;
    const timer = setTimeout(() => {
      if (entry.isMoving) {
        this._scheduleWander(entry);
        return;
      }
      const { x: ax, z: az } = this.mapToWorld(entry.anchor.x, entry.anchor.y);
      this._startMove(
        entry,
        ax + (Math.random() - 0.5) * radius * 2,
        az + (Math.random() - 0.5) * radius * 1.3,
        1.2 + Math.random() * 0.7,
        true
      );
    }, 1100 + Math.random() * 2200);

    this._wanderTimers.set(entry.name, timer);
  }

  _startMove(entry, tx, tz, duration, isWander = false) {
    entry.isMoving = true;
    entry.isWander = isWander;
    entry.moveFrom = { ...entry.current };
    entry.moveTo = { x: tx, z: tz };
    entry.moveElapsed = 0;
    entry.moveDuration = duration;
    entry.character.setState('walk');
    entry.character.faceDirection(tx - entry.current.x, tz - entry.current.z);
  }

  updateAgent(agentState) {
    const entry = this.ensureAgent(agentState);
    const moved = entry.lastLocation !== null && entry.lastLocation !== agentState.location;
    entry.lastLocation = agentState.location;
    entry.anchor = { x: agentState.x, y: agentState.y };

    const { x, z } = this.mapToWorld(agentState.x, agentState.y);

    if (moved) {
      const t = this._wanderTimers.get(entry.name);
      if (t) clearTimeout(t);
      this._startMove(entry, x, z, 2.0, false);
    } else if (!entry.isMoving) {
      // keep soft anchor pull without restarting walk every tick
      const dist = Math.hypot(x - entry.current.x, z - entry.current.z);
      if (dist > 1.2) this._startMove(entry, x, z, 0.8, false);
    }

    if (agentState.dialogue) {
      entry.bubble.textContent = agentState.dialogue;
      entry.bubble.style.display = 'block';
      entry.dialogueTimer = 4.5;
      entry.statusEl.textContent = '';
    } else if (moved) {
      entry.statusEl.textContent = `→ ${agentState.location}`;
      entry.statusTimer = 2.2;
    } else if (agentState.action === 'wait' || agentState.action === 'interact') {
      entry.statusEl.textContent = '…';
      entry.character.triggerInteract();
      entry.statusTimer = 1.8;
    } else {
      entry.statusEl.textContent = '';
    }
  }

  _animate() {
    requestAnimationFrame(() => this._animate());
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    this._flames.forEach((flame) => {
      flame.scale.setScalar(0.9 + Math.sin(t * 8) * 0.15);
      flame.position.y = 0.18 + Math.sin(t * 10) * 0.03;
    });

    this.agents.forEach((entry) => {
      if (entry.moveTo) {
        entry.moveElapsed = (entry.moveElapsed || 0) + dt;
        const p = Math.min(1, entry.moveElapsed / (entry.moveDuration || 1));
        const ease = p * p * (3 - 2 * p);
        entry.current.x = entry.moveFrom.x + (entry.moveTo.x - entry.moveFrom.x) * ease;
        entry.current.z = entry.moveFrom.z + (entry.moveTo.z - entry.moveFrom.z) * ease;
        entry.character.group.position.set(entry.current.x, 0, entry.current.z);

        if (p >= 1) {
          entry.isMoving = false;
          entry.character.setState('idle');
          if (entry.isWander) this._scheduleWander(entry);
          else this._scheduleWander(entry);
        }
      }

      entry.character.update(dt, t);

      const pos = this.worldToScreen(entry.current.x, entry.current.z);
      entry.label.style.transform = `translate(${pos.x}px, ${pos.y}px)`;
      entry.bubble.style.transform = `translate(${pos.x}px, ${pos.y - 64}px)`;

      if (entry.dialogueTimer > 0) {
        entry.dialogueTimer -= dt;
        if (entry.dialogueTimer <= 0) entry.bubble.style.display = 'none';
      }
      if (entry.statusTimer > 0) {
        entry.statusTimer -= dt;
        if (entry.statusTimer <= 0) entry.statusEl.textContent = '';
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  ready() {
    connectWebSocket();
  }
}

window.VillageWorld = VillageWorld;
window.VILLAGE_WORLD = WORLD;
