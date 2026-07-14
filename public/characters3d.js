/* global THREE */
// Clash-of-Clans-style cartoon villagers: oversized heads, soft rounded bodies,
// expressive faces — not boxy "assembled shape" silhouettes.

const COLORS = {
  skin: 0xffc8a0,
  skinBlush: 0xff9a8a,
  hairBrown: 0x5a3726,
  hairGrey: 0xb0b0b0,
  hairDark: 0x2a1a12,
  hairAuburn: 0xa84828,
  green: 0x3ecf6a,
  greenDeep: 0x2a9e4e,
  cream: 0xfff0d8,
  blue: 0x4a8fd9,
  blueDeep: 0x2f6cb0,
  purple: 0x9b5cff,
  purpleDeep: 0x6e3ad4,
  leather: 0x8a5a32,
  leatherDark: 0x5c3a1e,
  metal: 0xc5d0dc,
  metalDark: 0x7a8898,
  wood: 0xb07848,
  parchment: 0xf2d9a0,
  white: 0xfff8ef,
  eyeWhite: 0xffffff,
  iris: 0x3a2a1a,
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.05,
    flatShading: false,
    ...opts,
  });
}

function addMesh(geo, color, parent, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
  const mesh = new THREE.Mesh(geo, typeof color === 'number' ? mat(color) : color);
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function capsule(r, len, color, parent, x, y, z) {
  // CapsuleGeometry(radius, length, capSegments, radialSegments)
  return addMesh(new THREE.CapsuleGeometry(r, len, 6, 10), color, parent, x, y, z);
}

function roundHead(parent, skin, hairColor, style) {
  const head = new THREE.Group();
  head.position.y = 0.52;
  parent.add(head);

  // big cartoon head
  addMesh(new THREE.SphereGeometry(0.22, 24, 20), skin, head, 0, 0.08, 0, 1.05, 1.08, 0.98);

  // cheeks / soft jaw
  addMesh(new THREE.SphereGeometry(0.07, 12, 10), mat(COLORS.skinBlush), head, -0.14, 0.02, 0.1, 1, 0.85, 0.8);
  addMesh(new THREE.SphereGeometry(0.07, 12, 10), mat(COLORS.skinBlush), head, 0.14, 0.02, 0.1, 1, 0.85, 0.8);

  // nose
  addMesh(new THREE.SphereGeometry(0.035, 10, 8), skin, head, 0, 0.04, 0.2, 0.9, 1.1, 1.2);

  // eyes
  const eyeGeo = new THREE.SphereGeometry(0.045, 12, 10);
  addMesh(eyeGeo, COLORS.eyeWhite, head, -0.075, 0.1, 0.175, 1, 1.15, 0.6);
  addMesh(eyeGeo, COLORS.eyeWhite, head, 0.075, 0.1, 0.175, 1, 1.15, 0.6);
  addMesh(new THREE.SphereGeometry(0.022, 10, 8), COLORS.iris, head, -0.075, 0.1, 0.2);
  addMesh(new THREE.SphereGeometry(0.022, 10, 8), COLORS.iris, head, 0.075, 0.1, 0.2);
  // eye shine
  addMesh(new THREE.SphereGeometry(0.008, 6, 6), COLORS.white, head, -0.065, 0.115, 0.215);
  addMesh(new THREE.SphereGeometry(0.008, 6, 6), COLORS.white, head, 0.085, 0.115, 0.215);

  // brows
  const brow = mat(hairColor);
  addMesh(new THREE.CapsuleGeometry(0.012, 0.05, 4, 6), brow, head, -0.075, 0.155, 0.17, 1.4, 1, 1).rotation.z = 0.15;
  addMesh(new THREE.CapsuleGeometry(0.012, 0.05, 4, 6), brow, head, 0.075, 0.155, 0.17, 1.4, 1, 1).rotation.z = -0.15;

  // smile
  const smile = addMesh(
    new THREE.TorusGeometry(0.045, 0.01, 8, 16, Math.PI),
    mat(0xc45a4a),
    head,
    0,
    -0.02,
    0.195
  );
  smile.rotation.x = Math.PI;
  smile.rotation.z = Math.PI;

  // hair / hat by style
  if (style === 'mira') {
    addMesh(new THREE.SphereGeometry(0.2, 20, 16), hairColor, head, 0, 0.18, -0.02, 1.15, 0.85, 1.1);
    // bun
    addMesh(new THREE.SphereGeometry(0.09, 14, 12), hairColor, head, 0, 0.32, -0.06);
    addMesh(new THREE.SphereGeometry(0.05, 10, 8), hairColor, head, 0, 0.36, -0.04);
    // bangs
    addMesh(new THREE.SphereGeometry(0.08, 12, 10), hairColor, head, -0.12, 0.18, 0.12, 0.9, 0.7, 0.6);
    addMesh(new THREE.SphereGeometry(0.08, 12, 10), hairColor, head, 0.12, 0.18, 0.12, 0.9, 0.7, 0.6);
  } else if (style === 'tomas') {
    // metal helmet
    addMesh(new THREE.SphereGeometry(0.2, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.6), COLORS.metal, head, 0, 0.16, 0, 1.15, 1, 1.15);
    addMesh(new THREE.TorusGeometry(0.2, 0.035, 8, 20), COLORS.metalDark, head, 0, 0.12, 0, 1.05, 1, 1.05);
    // grey beard
    addMesh(new THREE.SphereGeometry(0.12, 14, 12), COLORS.hairGrey, head, 0, -0.06, 0.12, 1.1, 0.9, 0.85);
  } else {
    // purple hood
    const hood = addMesh(
      new THREE.SphereGeometry(0.24, 20, 16, 0, Math.PI * 2, 0, Math.PI / 1.5),
      COLORS.purpleDeep,
      head,
      0,
      0.14,
      -0.02,
      1.15,
      1.05,
      1.2
    );
    hood.rotation.x = -0.15;
    // dark hair under hood
    addMesh(new THREE.SphereGeometry(0.18, 16, 12), COLORS.hairDark, head, 0, 0.14, -0.04, 1.1, 0.8, 1);
    // short beard
    addMesh(new THREE.SphereGeometry(0.08, 12, 10), COLORS.hairDark, head, 0, -0.04, 0.14, 1.2, 0.8, 0.7);
  }

  return head;
}

class Character3D {
  constructor(npcType, name) {
    this.npcType = npcType;
    this.name = name;
    this.group = new THREE.Group();
    this.parts = {};
    this.state = 'idle';
    this.walkPhase = 0;
    this.interactTimer = 0;
    this.lookTimer = 0;
    this.facing = 0;
    this._build();
  }

  _build() {
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.01;
    this.group.add(shadow);

    const root = new THREE.Group();
    this.group.add(root);
    this.parts.root = root;

    const hips = new THREE.Group();
    hips.position.y = 0.38;
    root.add(hips);
    this.parts.hips = hips;

    if (this.npcType === 'merchant') this._mira(hips);
    else if (this.npcType === 'guard') this._tomas(hips);
    else this._elyas(hips);
  }

  _limb(parent, x, color, upperLen, lowerLen, r = 0.055) {
    const joint = new THREE.Group();
    joint.position.set(x, 0, 0);
    parent.add(joint);
    capsule(r, upperLen, color, joint, 0, -upperLen / 2 - r * 0.2, 0);
    const lower = new THREE.Group();
    lower.position.y = -upperLen - r * 0.4;
    joint.add(lower);
    capsule(r * 0.9, lowerLen, color, lower, 0, -lowerLen / 2, 0);
    return { joint, lower };
  }

  _mira(hips) {
    // legs
    const legL = this._limb(hips, -0.09, COLORS.greenDeep, 0.16, 0.14);
    const legR = this._limb(hips, 0.09, COLORS.greenDeep, 0.16, 0.14);
    this.parts.legL = legL.joint;
    this.parts.legR = legR.joint;
    // boots
    addMesh(new THREE.SphereGeometry(0.07, 12, 10), COLORS.leather, legL.lower, 0, -0.16, 0.02, 1.1, 0.65, 1.4);
    addMesh(new THREE.SphereGeometry(0.07, 12, 10), COLORS.leather, legR.lower, 0, -0.16, 0.02, 1.1, 0.65, 1.4);

    const torso = new THREE.Group();
    torso.position.y = 0.02;
    hips.add(torso);
    this.parts.torso = torso;

    // rounded dress body
    addMesh(new THREE.SphereGeometry(0.2, 20, 16), COLORS.green, torso, 0, 0.12, 0, 1.15, 1.1, 0.95);
    // cream apron
    addMesh(new THREE.SphereGeometry(0.16, 16, 12), COLORS.cream, torso, 0, 0.08, 0.1, 0.95, 1, 0.45);
    // leather belt
    addMesh(new THREE.TorusGeometry(0.18, 0.025, 8, 20), COLORS.leather, torso, 0, 0.02, 0, 1.05, 1, 0.85);

    // arms
    this.parts.armL = this._limb(torso, -0.22, COLORS.skin, 0.12, 0.11, 0.045).joint;
    this.parts.armL.position.y = 0.18;
    this.parts.armR = this._limb(torso, 0.22, COLORS.skin, 0.12, 0.11, 0.045).joint;
    this.parts.armR.position.y = 0.18;

    // map scroll in right hand
    const map = new THREE.Group();
    map.position.set(0.05, -0.28, 0.08);
    this.parts.armR.add(map);
    addMesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 12), COLORS.parchment, map, 0, 0, 0).rotation.z = Math.PI / 2;
    addMesh(new THREE.BoxGeometry(0.16, 0.12, 0.01), COLORS.parchment, map, 0.02, 0, 0.04);
    this.parts.prop = map;

    this.parts.head = roundHead(torso, COLORS.skin, COLORS.hairBrown, 'mira');
  }

  _tomas(hips) {
    const legL = this._limb(hips, -0.1, 0x3a4560, 0.17, 0.15, 0.06);
    const legR = this._limb(hips, 0.1, 0x3a4560, 0.17, 0.15, 0.06);
    this.parts.legL = legL.joint;
    this.parts.legR = legR.joint;
    addMesh(new THREE.SphereGeometry(0.075, 12, 10), COLORS.leatherDark, legL.lower, 0, -0.17, 0.02, 1.15, 0.7, 1.5);
    addMesh(new THREE.SphereGeometry(0.075, 12, 10), COLORS.leatherDark, legR.lower, 0, -0.17, 0.02, 1.15, 0.7, 1.5);

    const torso = new THREE.Group();
    torso.position.y = 0.02;
    hips.add(torso);
    this.parts.torso = torso;

    // stocky armored torso
    addMesh(new THREE.SphereGeometry(0.22, 20, 16), COLORS.blue, torso, 0, 0.14, 0, 1.2, 1.15, 1);
    addMesh(new THREE.SphereGeometry(0.12, 12, 10), COLORS.metal, torso, 0, 0.2, 0.16, 1.3, 1, 0.4);
    // pauldron straps
    addMesh(new THREE.SphereGeometry(0.1, 12, 10), COLORS.leather, torso, -0.2, 0.26, 0, 1.2, 0.7, 1);
    addMesh(new THREE.SphereGeometry(0.1, 12, 10), COLORS.leather, torso, 0.2, 0.26, 0, 1.2, 0.7, 1);
    addMesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), COLORS.leatherDark, torso, 0, 0.06, 0, 1.1, 1, 0.9);

    this.parts.armL = this._limb(torso, -0.26, COLORS.blueDeep, 0.13, 0.12, 0.05).joint;
    this.parts.armL.position.y = 0.2;
    this.parts.armR = this._limb(torso, 0.26, COLORS.blueDeep, 0.13, 0.12, 0.05).joint;
    this.parts.armR.position.y = 0.2;

    // spear
    const spear = new THREE.Group();
    spear.position.set(0.08, -0.1, 0.05);
    this.parts.armR.add(spear);
    addMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 8), COLORS.leather, spear, 0, 0.2, 0);
    addMesh(new THREE.ConeGeometry(0.04, 0.1, 8), COLORS.metal, spear, 0, 0.68, 0);
    this.parts.prop = spear;

    // satchel on left
    addMesh(new THREE.SphereGeometry(0.08, 12, 10), COLORS.leather, torso, -0.28, 0.0, 0.08, 0.9, 1.1, 0.7);

    this.parts.head = roundHead(torso, COLORS.skin, COLORS.hairGrey, 'tomas');
  }

  _elyas(hips) {
    const legL = this._limb(hips, -0.09, COLORS.leather, 0.16, 0.14);
    const legR = this._limb(hips, 0.09, COLORS.leather, 0.16, 0.14);
    this.parts.legL = legL.joint;
    this.parts.legR = legR.joint;
    addMesh(new THREE.SphereGeometry(0.065, 12, 10), COLORS.leatherDark, legL.lower, 0, -0.16, 0.02, 1.1, 0.65, 1.35);
    addMesh(new THREE.SphereGeometry(0.065, 12, 10), COLORS.leatherDark, legR.lower, 0, -0.16, 0.02, 1.1, 0.65, 1.35);

    const torso = new THREE.Group();
    torso.position.y = 0.02;
    hips.add(torso);
    this.parts.torso = torso;

    addMesh(new THREE.SphereGeometry(0.19, 20, 16), COLORS.purple, torso, 0, 0.13, 0, 1.15, 1.15, 0.95);
    // flowing cloak (soft cone / sphere blend)
    const cloak = addMesh(
      new THREE.ConeGeometry(0.28, 0.55, 16, 1, true),
      mat(COLORS.purpleDeep),
      torso,
      0,
      -0.02,
      -0.06
    );
    cloak.rotation.x = Math.PI;
    cloak.material.side = THREE.DoubleSide;

    // travel pouch
    addMesh(new THREE.SphereGeometry(0.09, 12, 10), COLORS.leather, torso, -0.22, -0.02, 0.1, 0.85, 1, 0.75);

    this.parts.armL = this._limb(torso, -0.2, COLORS.purple, 0.12, 0.1, 0.045).joint;
    this.parts.armL.position.y = 0.18;
    this.parts.armR = this._limb(torso, 0.2, COLORS.purple, 0.12, 0.1, 0.045).joint;
    this.parts.armR.position.y = 0.18;

    // lute
    const lute = new THREE.Group();
    lute.position.set(0.1, -0.12, 0.12);
    this.parts.armR.add(lute);
    addMesh(new THREE.SphereGeometry(0.1, 14, 12), COLORS.leather, lute, 0, 0, 0, 0.75, 1.15, 0.35);
    addMesh(new THREE.CylinderGeometry(0.015, 0.02, 0.28, 8), 0xe8d0a0, lute, 0, 0.18, 0);
    this.parts.prop = lute;
    this.parts.lute = lute;

    this.parts.head = roundHead(torso, COLORS.skin, COLORS.hairDark, 'elyas');
  }

  setState(state) {
    this.state = state;
    if (state !== 'interact') this.interactTimer = 0;
  }

  faceDirection(dx, dz) {
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    this.facing = Math.atan2(dx, dz);
    this.parts.root.rotation.y = this.facing;
  }

  triggerInteract() {
    this.setState('interact');
    this.interactTimer = 1.8;
  }

  update(dt, t) {
    const { legL, legR, armL, armR, torso, head, root } = this.parts;
    if (!legL) return;

    if (this.state === 'walk') {
      this.walkPhase += dt * 10;
      const s = Math.sin(this.walkPhase);
      const s2 = Math.sin(this.walkPhase + Math.PI);
      legL.rotation.x = s * 0.7;
      legR.rotation.x = s2 * 0.7;
      if (armL) armL.rotation.x = s2 * 0.5;
      if (armR) armR.rotation.x = s * 0.5;
      root.position.y = Math.abs(Math.sin(this.walkPhase * 2)) * 0.06;
      if (head) head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, 0.1);
    } else if (this.state === 'interact') {
      this.interactTimer -= dt;
      if (this.interactTimer <= 0) this.setState('idle');

      if (this.npcType === 'bard' && this.parts.lute) {
        this.parts.lute.rotation.z = Math.sin(t * 14) * 0.25;
        if (armR) armR.rotation.x = -0.5 + Math.sin(t * 12) * 0.3;
        if (armL) armL.rotation.x = -0.3 + Math.sin(t * 12 + 1) * 0.2;
      } else if (this.npcType === 'guard') {
        if (armR) armR.rotation.x = -0.3;
        root.position.y = Math.abs(Math.sin(t * 6)) * 0.03;
      } else {
        if (armR) {
          armR.rotation.x = -0.6 + Math.sin(t * 5) * 0.15;
          armR.rotation.z = Math.sin(t * 4) * 0.12;
        }
      }
      legL.rotation.x *= 0.85;
      legR.rotation.x *= 0.85;
    } else {
      const breathe = Math.sin(t * 2.4) * 0.012;
      if (torso) torso.scale.y = 1 + breathe * 4;
      root.position.y = Math.sin(t * 1.6) * 0.012;

      this.lookTimer -= dt;
      if (this.lookTimer <= 0 && head) {
        head.rotation.y = (Math.random() - 0.5) * 0.55;
        this.lookTimer = 2.2 + Math.random() * 3;
      }

      legL.rotation.x = Math.sin(t * 1.1) * 0.05;
      legR.rotation.x = Math.sin(t * 1.1 + Math.PI) * 0.05;
      if (armL) armL.rotation.x = Math.sin(t * 1.4) * 0.08;
      if (armR) armR.rotation.x = Math.sin(t * 1.4 + 0.8) * 0.08;
    }
  }
}

window.Character3D = Character3D;
