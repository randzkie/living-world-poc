/**
 * Aetheria — RPG Style Living World
 * Vanilla JS HTML5 Canvas with pan/zoom camera, day/night cycle,
 * ambient world (trees, birds, flowers, pond), and unique character sprites.
 *
 * Supports any number of characters. Outfit is auto-generated based on
 * character name hash if not explicitly defined in OUTFITS.
 */

// ============================================================================
// CONFIG
// ============================================================================
const CANVAS_W = 1000
const CANVAS_H = 640
const WORLD_W = 2000   // bigger world — pan to explore
const WORLD_H = 1400

let canvas, ctx, minimapCanvas, miniCtx
let locations = {}
let agents = []
let agentInfo = {}
let selectedName = null
let hoveredName = null
let frame = 0
let bubbles = {}
let gameHour = 6  // simulated time of day (advances with ticks)

// Camera (pan + zoom)
const camera = {
  x: WORLD_W / 2 - CANVAS_W / 2,
  y: WORLD_H / 2 - CANVAS_H / 2,
  zoom: 0.5,
  minZoom: 0.3,
  maxZoom: 2.0,
}
let isDragging = false
let dragStartX = 0, dragStartY = 0, camStartX = 0, camStartY = 0

// ============================================================================
// CHARACTER OUTFITS — unique designs per character + auto-generator
// ============================================================================
const OUTFITS = {
  Mira: {
    skin: '#ffcc80', hair: '#5d4037',
    shirt: '#4f9d8a', shirtDk: '#3a7567',
    pants: '#5d4037', pantsDk: '#3e2723',
    hat: 'band', hatColor: '#e8a33d',
    tool: 'maps', accessory: 'satchel', accessoryColor: '#8d6e63',
    role: 'Map Seller',
  },
  Tomas: {
    skin: '#ffcc80', hair: '#424242',
    shirt: '#546e7a', shirtDk: '#37474f',
    pants: '#37474f', pantsDk: '#263238',
    hat: 'helm', hatColor: '#90a4ae',
    tool: 'spear', accessory: 'chainmail', accessoryColor: '#b0bec5',
    role: 'Night Guard', beard: true,
  },
  Elyas: {
    skin: '#ffe0b2', hair: '#6a1b9a',
    shirt: '#8b6bc4', shirtDk: '#6a4ba0',
    pants: '#4a148c', pantsDk: '#311b92',
    hat: 'feather', hatColor: '#7b1fa2',
    tool: 'lute', accessory: 'cape', accessoryColor: '#6a1b9a',
    role: 'Traveling Bard',
  },
  // Additional characters — the frontend supports any name
  // These will be auto-generated if not listed here, but you can
  // add explicit outfits for new characters below:
  Lyra: {
    skin: '#ffe0b2', hair: '#e91e63',
    shirt: '#ec407a', shirtDk: '#ad1457',
    pants: '#5e35b2', pantsDk: '#311b92',
    hat: 'feather', hatColor: '#7b1fa2',
    tool: 'lute', accessory: 'cape', accessoryColor: '#6a1b9a',
    role: 'Musician',
  },
  Corvin: {
    skin: '#ffcc80', hair: '#212121',
    shirt: '#1e88e5', shirtDk: '#1565c0',
    pants: '#4e342e', pantsDk: '#3e2723',
    hat: 'cap', hatColor: '#1565c0',
    tool: 'coins', accessory: 'satchel', accessoryColor: '#5d4037',
    role: 'Merchant', beard: true,
  },
  Wren: {
    skin: '#ffb74d', hair: '#8d6e63',
    shirt: '#fff176', shirtDk: '#fdd835',
    pants: '#1976d2', pantsDk: '#0d47a1',
    hat: 'straw', hatColor: '#d4a043',
    tool: 'sickle', role: 'Farmer',
  },
  Sable: {
    skin: '#ffcc80', hair: '#4a148c',
    shirt: '#6a1b9a', shirtDk: '#4a148c',
    pants: '#311b92', pantsDk: '#1a0a4a',
    hat: 'hood', hatColor: '#4a148c',
    tool: 'potion', accessory: 'cape', accessoryColor: '#311b92',
    role: 'Apothecary',
  },
  Thorne: {
    skin: '#ffcc80', hair: '#424242',
    shirt: '#424242', shirtDk: '#212121',
    pants: '#4e342e', pantsDk: '#3e2723',
    hat: 'bald', tool: 'hammer',
    accessory: 'apron', accessoryColor: '#212121',
    role: 'Blacksmith', beard: true,
  },
  Elara: {
    skin: '#ffcc80', hair: '#8d6e63',
    shirt: '#66bb6a', shirtDk: '#43a047',
    pants: '#5d4037', pantsDk: '#3e2723',
    hat: 'hood', hatColor: '#43a047',
    tool: 'basket', accessory: 'cape', accessoryColor: '#2e7d32',
    role: 'Herbalist',
  },
  Garrett: {
    skin: '#ffcc80', hair: '#5d4037',
    shirt: '#8d6e63', shirtDk: '#6d4c41',
    pants: '#4e342e', pantsDk: '#3e2723',
    hat: 'cap', hatColor: '#5d4037',
    tool: 'bow', role: 'Hunter', beard: true,
  },
}

// Auto-generate outfit for unknown characters
function getOutfit(name) {
  if (OUTFITS[name]) return OUTFITS[name]
  // Hash-based generation
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  hash = Math.abs(hash)
  const palettes = [
    { shirt: '#e53935', shirtDk: '#c62828', pants: '#1565c0', pantsDk: '#0d47a1' },
    { shirt: '#43a047', shirtDk: '#2e7d32', pants: '#5d4037', pantsDk: '#3e2723' },
    { shirt: '#8e24aa', shirtDk: '#6a1b9a', pants: '#311b92', pantsDk: '#1a0a4a' },
    { shirt: '#fdd835', shirtDk: '#f9a825', pants: '#1976d2', pantsDk: '#0d47a1' },
    { shirt: '#00897b', shirtDk: '#00695c', pants: '#4e342e', pantsDk: '#3e2723' },
    { shirt: '#ec407a', shirtDk: '#ad1457', pants: '#5e35b2', pantsDk: '#311b92' },
  ]
  const p = palettes[hash % palettes.length]
  const hats = ['band', 'cap', 'hood', 'feather', 'straw', null]
  const tools = ['basket', 'coins', 'sickle', null, null]
  const skins = ['#ffcc80', '#ffe0b2', '#ffb74d']
  const hairs = ['#5d4037', '#424242', '#8d6e63', '#6d4c41']
  return {
    skin: skins[hash % skins.length],
    hair: hairs[(hash >> 3) % hairs.length],
    shirt: p.shirt, shirtDk: p.shirtDk,
    pants: p.pants, pantsDk: p.pantsDk,
    hat: hats[(hash >> 6) % hats.length],
    hatColor: p.shirtDk,
    tool: tools[(hash >> 9) % tools.length],
    role: 'Villager',
  }
}

// ============================================================================
// COLOR HELPERS
// ============================================================================
function hexToRgb(hex) {
  const c = hex.replace('#', '')
  return { r: parseInt(c.slice(0,2),16), g: parseInt(c.slice(2,4),16), b: parseInt(c.slice(4,6),16) }
}
function shade(hex, f) {
  const { r, g, b } = hexToRgb(hex)
  return `rgb(${Math.min(255,Math.max(0,Math.round(r*f)))},${Math.min(255,Math.max(0,Math.round(g*f)))},${Math.min(255,Math.max(0,Math.round(b*f)))})`
}
function withAlpha(hex, a) {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

const OUTLINE = 'rgba(20,15,10,0.85)'
const SHADOW = 'rgba(0,0,0,0.35)'
const GOLD = '#ffd700'

// ============================================================================
// DAY / NIGHT CYCLE
// ============================================================================
function getSkyColors() {
  // gameHour 0-23
  const h = gameHour
  if (h >= 5 && h < 7) return { top: '#ff8a65', bot: '#ffcc80', ambient: 0.88 }       // dawn
  if (h >= 7 && h < 17) return { top: '#64b5f6', bot: '#a5d6a7', ambient: 1.0 }        // day
  if (h >= 17 && h < 20) return { top: '#ff7043', bot: '#ffab40', ambient: 0.78 }      // dusk
  return { top: '#1a237e', bot: '#283593', ambient: 0.5 }                               // night
}
function isNight() { return gameHour >= 20 || gameHour < 5 }

// ============================================================================
// CAMERA / VIEWPORT
// ============================================================================
function worldToScreen(x, y) {
  return {
    x: (x - camera.x) * camera.zoom,
    y: (y - camera.y) * camera.zoom,
  }
}
function screenToWorld(x, y) {
  return {
    x: x / camera.zoom + camera.x,
    y: y / camera.zoom + camera.y,
  }
}
function clampCamera() {
  camera.x = Math.max(0, Math.min(WORLD_W - CANVAS_W / camera.zoom, camera.x))
  camera.y = Math.max(0, Math.min(WORLD_H - CANVAS_H / camera.zoom, camera.y))
}
function centerOnAgent(name) {
  const a = agents.find(a => a.name === name)
  if (!a) return
  camera.zoom = 1.2
  camera.x = a.x - CANVAS_W / (2 * camera.zoom)
  camera.y = a.y - CANVAS_H / (2 * camera.zoom)
  clampCamera()
}

// ============================================================================
// AMBIENT WORLD — trees, flowers, rocks, pond, birds
// ============================================================================
// Pre-generate static decorations
const DECORATIONS = []
function generateDecorations() {
  DECORATIONS.length = 0
  // Trees scattered around
  const treeCount = 40
  for (let i = 0; i < treeCount; i++) {
    const x = 80 + Math.random() * (WORLD_W - 160)
    const y = 80 + Math.random() * (WORLD_H - 160)
    // Don't place on locations
    let tooClose = false
    for (const loc of Object.values(locations)) {
      if (Math.hypot(x - loc.x, y - loc.y) < 80) { tooClose = true; break }
    }
    if (tooClose) continue
    DECORATIONS.push({ type: 'tree', x, y, variant: Math.floor(Math.random() * 3), sway: Math.random() * Math.PI * 2 })
  }
  // Rocks
  for (let i = 0; i < 15; i++) {
    const x = 60 + Math.random() * (WORLD_W - 120)
    const y = 60 + Math.random() * (WORLD_H - 120)
    let tooClose = false
    for (const loc of Object.values(locations)) {
      if (Math.hypot(x - loc.x, y - loc.y) < 60) { tooClose = true; break }
    }
    if (tooClose) continue
    DECORATIONS.push({ type: 'rock', x, y, size: 0.7 + Math.random() * 0.6 })
  }
  // Flowers (grass tufts with color)
  for (let i = 0; i < 80; i++) {
    const x = 40 + Math.random() * (WORLD_W - 80)
    const y = 40 + Math.random() * (WORLD_H - 80)
    DECORATIONS.push({ type: 'flower', x, y, color: ['#e53935', '#ffd700', '#e91e63', '#9c27b0', '#fff'][Math.floor(Math.random()*5)] })
  }
  // Bushes
  for (let i = 0; i < 20; i++) {
    const x = 60 + Math.random() * (WORLD_W - 120)
    const y = 60 + Math.random() * (WORLD_H - 120)
    let tooClose = false
    for (const loc of Object.values(locations)) {
      if (Math.hypot(x - loc.x, y - loc.y) < 50) { tooClose = true; break }
    }
    if (tooClose) continue
    DECORATIONS.push({ type: 'bush', x, y })
  }
}

// Birds (animated)
const birds = []
for (let i = 0; i < 5; i++) {
  birds.push({
    x: Math.random() * WORLD_W,
    y: 50 + Math.random() * 200,
    vx: 0.5 + Math.random() * 0.8,
    wing: Math.random() * Math.PI * 2,
    dir: Math.random() > 0.5 ? 1 : -1,
  })
}

// ============================================================================
// GROUND
// ============================================================================
function drawGround(ambient) {
  // Grass gradient base
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  g.addColorStop(0, shade('#558b2f', ambient))
  g.addColorStop(0.5, shade('#689f38', ambient))
  g.addColorStop(1, shade('#7cb342', ambient))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Draw visible portion of world grid (grass texture)
  const viewLeft = camera.x
  const viewTop = camera.y
  const viewW = CANVAS_W / camera.zoom
  const viewH = CANVAS_H / camera.zoom

  // Grass tufts pattern
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  // Checkered tiles subtle
  const tileSize = 60
  const startX = Math.floor(viewLeft / tileSize) * tileSize
  const startY = Math.floor(viewTop / tileSize) * tileSize
  for (let y = startY; y < viewTop + viewH + tileSize; y += tileSize) {
    for (let x = startX; x < viewLeft + viewW + tileSize; x += tileSize) {
      if ((Math.floor(x/tileSize) + Math.floor(y/tileSize)) % 2 === 0) {
        ctx.fillStyle = withAlpha('#558b2f', 0.15)
        ctx.fillRect(x, y, tileSize, tileSize)
      }
    }
  }

  // Paths between locations (dirt)
  ctx.strokeStyle = shade('#bcaaa4', ambient)
  ctx.lineWidth = 24
  ctx.lineCap = 'round'
  const locs = Object.values(locations)
  for (let i = 0; i < locs.length; i++) {
    for (let j = i + 1; j < locs.length; j++) {
      ctx.globalAlpha = 0.2
      ctx.beginPath()
      ctx.moveTo(locs[i].x, locs[i].y)
      ctx.lineTo(locs[j].x, locs[j].y)
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  // Path cobblestones
  ctx.fillStyle = shade('#a1887f', ambient)
  for (let i = 0; i < 200; i++) {
    const x = (i * 97) % WORLD_W
    const y = (i * 53) % WORLD_H
    if (x >= viewLeft - 20 && x <= viewLeft + viewW + 20 && y >= viewTop - 20 && y <= viewTop + viewH + 20) {
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

// ============================================================================
// DECORATIONS (trees, rocks, flowers, bushes)
// ============================================================================
function drawDecorations(ambient) {
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  const viewLeft = camera.x - 50
  const viewTop = camera.y - 50
  const viewW = CANVAS_W / camera.zoom + 100
  const viewH = CANVAS_H / camera.zoom + 100

  // Sort by y for depth
  const visible = DECORATIONS.filter(d => d.x >= viewLeft && d.x <= viewLeft + viewW && d.y >= viewTop && d.y <= viewTop + viewH)
  visible.sort((a, b) => a.y - b.y)

  for (const d of visible) {
    if (d.type === 'tree') drawTree(d.x, d.y, ambient, d.variant, d.sway)
    else if (d.type === 'rock') drawRock(d.x, d.y, ambient, d.size)
    else if (d.type === 'flower') drawFlower(d.x, d.y, d.color, ambient)
    else if (d.type === 'bush') drawBush(d.x, d.y, ambient)
  }
  ctx.restore()
}

function drawTree(x, y, ambient, variant, swayOffset) {
  const sway = Math.sin(frame * 0.03 + swayOffset) * 1.5
  // Shadow
  ctx.fillStyle = SHADOW
  ctx.beginPath(); ctx.ellipse(x, y + 4, 16, 6, 0, 0, Math.PI * 2); ctx.fill()
  // Trunk
  ctx.fillStyle = shade('#5d4037', ambient)
  ctx.fillRect(x - 4, y - 16, 8, 18)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2
  ctx.strokeRect(x - 4, y - 16, 8, 18)

  const trunkTop = y - 16
  if (variant === 0) {
    // Round tree
    ctx.fillStyle = shade('#2e7d32', ambient)
    ctx.beginPath(); ctx.arc(x + sway, trunkTop - 12, 16, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke()
    ctx.fillStyle = shade('#388e3c', ambient)
    ctx.beginPath(); ctx.arc(x - 5 + sway, trunkTop - 8, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(x + 6 + sway, trunkTop - 10, 10, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade('#66bb6a', ambient)
    ctx.beginPath(); ctx.arc(x - 2 + sway, trunkTop - 16, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  } else if (variant === 1) {
    // Pine tree
    ctx.fillStyle = shade('#1b5e20', ambient)
    ctx.beginPath()
    ctx.moveTo(x - 16 + sway, trunkTop - 4)
    ctx.lineTo(x + sway, trunkTop - 28)
    ctx.lineTo(x + 16 + sway, trunkTop - 4)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade('#2e7d32', ambient)
    ctx.beginPath()
    ctx.moveTo(x - 12 + sway, trunkTop - 14)
    ctx.lineTo(x + sway, trunkTop - 34)
    ctx.lineTo(x + 12 + sway, trunkTop - 14)
    ctx.closePath(); ctx.fill(); ctx.stroke()
  } else {
    // Bushy tree
    ctx.fillStyle = shade('#388e3c', ambient)
    ctx.beginPath(); ctx.arc(x - 6 + sway, trunkTop - 10, 12, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(x + 6 + sway, trunkTop - 12, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(x + sway, trunkTop - 18, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade('#66bb6a', ambient)
    ctx.beginPath(); ctx.arc(x - 3 + sway, trunkTop - 16, 6, 0, Math.PI * 2); ctx.fill()
  }
}

function drawRock(x, y, ambient, size) {
  const s = size || 1
  ctx.fillStyle = SHADOW
  ctx.beginPath(); ctx.ellipse(x, y + 2, 12 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = shade('#9e9e9e', ambient)
  ctx.beginPath()
  ctx.moveTo(x - 10*s, y)
  ctx.lineTo(x - 6*s, y - 9*s)
  ctx.lineTo(x + 3*s, y - 10*s)
  ctx.lineTo(x + 10*s, y - 4*s)
  ctx.lineTo(x + 7*s, y + 1*s)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3; ctx.stroke()
  ctx.fillStyle = shade('#bdbdbd', ambient)
  ctx.beginPath()
  ctx.moveTo(x - 5*s, y - 7*s)
  ctx.lineTo(x - 2*s, y - 9*s)
  ctx.lineTo(x + 1*s, y - 7*s)
  ctx.lineTo(x - 3*s, y - 4*s)
  ctx.closePath(); ctx.fill()
}

function drawFlower(x, y, color, ambient) {
  ctx.fillStyle = shade('#388e3c', ambient)
  ctx.fillRect(x - 0.5, y - 4, 1, 4)
  ctx.fillStyle = shade(color, ambient)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(x + Math.cos(a) * 2.5, y - 5 + Math.sin(a) * 2.5, 1.8, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = shade('#ffd700', ambient)
  ctx.beginPath(); ctx.arc(x, y - 5, 1.2, 0, Math.PI * 2); ctx.fill()
}

function drawBush(x, y, ambient) {
  ctx.fillStyle = SHADOW
  ctx.beginPath(); ctx.ellipse(x, y + 2, 10, 4, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = shade('#388e3c', ambient)
  ctx.beginPath(); ctx.arc(x - 4, y - 4, 7, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.stroke()
  ctx.fillStyle = shade('#43a047', ambient)
  ctx.beginPath(); ctx.arc(x + 4, y - 5, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = shade('#66bb6a', ambient)
  ctx.beginPath(); ctx.arc(x, y - 8, 6, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
}

// ============================================================================
// BIRDS (animated)
// ============================================================================
function drawBirds(ambient) {
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)
  for (const b of birds) {
    b.x += b.vx * b.dir
    b.wing += 0.3
    if (b.x > WORLD_W + 50) { b.x = -50; b.dir = 1 }
    if (b.x < -50) { b.x = WORLD_W + 50; b.dir = -1 }
    const wingY = Math.sin(b.wing) * 4
    ctx.fillStyle = isNight() ? 'rgba(50,50,80,0.6)' : 'rgba(40,40,40,0.7)'
    ctx.strokeStyle = OUTLINE
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(b.x - 6 * b.dir, b.y + wingY)
    ctx.lineTo(b.x, b.y)
    ctx.lineTo(b.x + 6 * b.dir, b.y + wingY)
    ctx.stroke()
  }
  ctx.restore()
}

// ============================================================================
// BUILDINGS / LOCATIONS
// ============================================================================
function drawLocations(ambient) {
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)
  for (const [name, loc] of Object.entries(locations)) {
    drawLocation(name, loc, ambient)
  }
  ctx.restore()
}

function drawLocation(name, loc, ambient) {
  const { x, y } = loc
  if (name === 'Map Stand') drawMapStand(x, y, ambient)
  else if (name === 'Guard Post') drawGuardPost(x, y, ambient)
  else if (name === 'Tavern') drawTavern(x, y, ambient)
  else if (name === 'Market') drawMarket(x, y, ambient)
  else if (name === 'Fountain') drawFountain(x, y, ambient)
  else drawGenericBuilding(name, x, y, ambient)
  drawBuildingLabel(name, x, y + 52)
}

function drawBuildingLabel(name, x, y) {
  ctx.font = 'bold 12px Inter, sans-serif'
  ctx.textAlign = 'center'
  const w = ctx.measureText(name).width + 12
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  roundRect(x - w/2, y - 8, w, 16, 5)
  ctx.fill()
  ctx.strokeStyle = GOLD; ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.fillStyle = '#fff'
  ctx.fillText(name, x, y + 4)
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawShadow(x, y, w) {
  ctx.fillStyle = SHADOW
  ctx.beginPath(); ctx.ellipse(x, y + 15, w, w * 0.35, 0, 0, Math.PI * 2); ctx.fill()
}

function drawMapStand(x, y, ambient) {
  drawShadow(x, y, 35)
  ctx.fillStyle = shade('#8d6e63', ambient)
  ctx.fillRect(x - 30, y - 5, 60, 20)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(x - 30, y - 5, 60, 20)
  ctx.fillStyle = shade('#5d4037', ambient)
  ctx.fillRect(x - 28, y + 15, 5, 12); ctx.fillRect(x + 23, y + 15, 5, 12)
  ctx.strokeRect(x - 28, y + 15, 5, 12); ctx.strokeRect(x + 23, y + 15, 5, 12)
  // Awning
  const stripes = ['#e53935', '#fff', '#e53935', '#fff']
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = shade(stripes[i], ambient)
    ctx.beginPath()
    ctx.moveTo(x - 34 + i * 17, y - 5)
    ctx.lineTo(x - 17 + i * 17, y - 5)
    ctx.lineTo(x - 14 + i * 17, y - 15)
    ctx.lineTo(x - 31 + i * 17, y - 15)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke()
  }
  ctx.fillStyle = shade('#d4a043', ambient)
  ctx.beginPath(); ctx.ellipse(x - 10, y, 6, 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke()
  ctx.fillStyle = shade('#c89c5e', ambient)
  ctx.beginPath(); ctx.ellipse(x + 8, y, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
}

function drawGuardPost(x, y, ambient) {
  drawShadow(x, y, 30)
  ctx.fillStyle = shade('#757575', ambient)
  ctx.fillRect(x - 18, y - 10, 36, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(x - 18, y - 10, 36, 25)
  ctx.strokeStyle = shade('#424242', ambient); ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 18, y + 8); ctx.lineTo(x + 18, y + 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 6, y - 10); ctx.lineTo(x - 6, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, y + 8); ctx.stroke()
  ctx.fillStyle = shade('#8d6e63', ambient)
  ctx.fillRect(x - 16, y - 35, 32, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(x - 16, y - 35, 32, 25)
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = shade('#9e9e9e', ambient)
    ctx.fillRect(x - 16 + i * 12, y - 40, 8, 6)
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.strokeRect(x - 16 + i * 12, y - 40, 8, 6)
  }
  ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - 3, y - 28, 6, 4)
  // Flag
  ctx.strokeStyle = '#424242'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 52); ctx.stroke()
  const wave = Math.sin(frame * 0.1) * 1.5
  ctx.fillStyle = '#e53935'
  ctx.beginPath()
  ctx.moveTo(x, y - 52); ctx.lineTo(x + 12 + wave, y - 49)
  ctx.lineTo(x + 12 + wave, y - 43); ctx.lineTo(x, y - 40)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke()
  // Lantern glow
  const glow = isNight() ? 0.6 : 0.2
  const g = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 40)
  g.addColorStop(0, `rgba(255,180,40,${glow})`)
  g.addColorStop(1, 'rgba(255,180,40,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y - 22, 40, 0, Math.PI * 2); ctx.fill()
}

function drawTavern(x, y, ambient) {
  drawShadow(x, y, 38)
  ctx.fillStyle = shade('#616161', ambient)
  ctx.fillRect(x - 34, y - 2, 68, 4)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.strokeRect(x - 34, y - 2, 68, 4)
  ctx.fillStyle = shade('#8d6e63', ambient)
  ctx.fillRect(x - 32, y - 25, 64, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(x - 32, y - 25, 64, 25)
  ctx.strokeStyle = shade('#3e2723', ambient); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 32, y - 12); ctx.lineTo(x + 32, y - 12); ctx.stroke()
  // Red roof
  ctx.fillStyle = shade('#c62828', ambient)
  ctx.beginPath()
  ctx.moveTo(x - 36, y - 25); ctx.lineTo(x, y - 50); ctx.lineTo(x + 36, y - 25)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.strokeStyle = shade('#8e1414', ambient); ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(x - 28, y - 31); ctx.lineTo(x + 28, y - 31); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 20, y - 38); ctx.lineTo(x + 20, y - 38); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 12, y - 44); ctx.lineTo(x + 12, y - 44); ctx.stroke()
  // Door
  ctx.fillStyle = shade('#4e342e', ambient)
  ctx.fillRect(x - 6, y - 15, 12, 15)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.strokeRect(x - 6, y - 15, 12, 15)
  ctx.fillStyle = GOLD; ctx.beginPath(); ctx.arc(x + 3, y - 7, 1, 0, Math.PI * 2); ctx.fill()
  // Windows
  const winGlow = isNight() ? 0.7 : 0.3
  ctx.fillStyle = `rgba(255,200,80,${winGlow})`
  ctx.fillRect(x - 24, y - 20, 8, 8); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.strokeRect(x - 24, y - 20, 8, 8)
  ctx.fillRect(x + 16, y - 20, 8, 8); ctx.strokeRect(x + 16, y - 20, 8, 8)
  // Sign
  ctx.fillStyle = shade('#5d4037', ambient)
  ctx.fillRect(x - 38, y - 28, 10, 8); ctx.strokeRect(x - 38, y - 28, 10, 8)
  ctx.fillStyle = '#ffb300'; ctx.beginPath(); ctx.arc(x - 33, y - 24, 2, 0, Math.PI * 2); ctx.fill()
  // Chimney smoke
  const chimX = x + 20, chimY = y - 42
  ctx.fillStyle = shade('#424242', ambient)
  ctx.fillRect(chimX - 3, chimY - 8, 6, 10); ctx.strokeRect(chimX - 3, chimY - 8, 6, 10)
  for (let i = 0; i < 3; i++) {
    const t = (frame * 0.02 + i * 0.7) % 1
    const sx = chimX + Math.sin(frame * 0.03 + i) * 3
    const sy = chimY - 8 - t * 28
    const size = 2 + t * 5
    ctx.fillStyle = `rgba(180,180,180,${0.55 * (1 - t)})`
    ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill()
  }
}

function drawMarket(x, y, ambient) {
  drawShadow(x, y, 36)
  ctx.fillStyle = shade('#8d6e63', ambient)
  ctx.fillRect(x - 32, y - 5, 64, 20)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(x - 32, y - 5, 64, 20)
  ctx.fillStyle = shade('#5d4037', ambient)
  ctx.fillRect(x - 30, y + 15, 4, 10); ctx.fillRect(x + 26, y + 15, 4, 10)
  ctx.strokeRect(x - 30, y + 15, 4, 10); ctx.strokeRect(x + 26, y + 15, 4, 10)
  // Blue roof
  ctx.fillStyle = shade('#1565c0', ambient)
  ctx.beginPath()
  ctx.moveTo(x - 36, y - 5); ctx.lineTo(x, y - 28); ctx.lineTo(x + 36, y - 5)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.strokeStyle = shade('#0d47a1', ambient); ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(x - 28, y - 11); ctx.lineTo(x + 28, y - 11); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 20, y - 17); ctx.lineTo(x + 20, y - 17); ctx.stroke()
  // Goods
  ctx.fillStyle = shade('#e53935', ambient); ctx.beginPath(); ctx.arc(x - 15, y, 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.stroke()
  ctx.fillStyle = shade('#fdd835', ambient); ctx.beginPath(); ctx.arc(x - 5, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = shade('#43a047', ambient); ctx.beginPath(); ctx.arc(x + 5, y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = shade('#8d6e63', ambient); ctx.fillRect(x + 12, y - 3, 6, 6); ctx.strokeRect(x + 12, y - 3, 6, 6)
}

function drawFountain(x, y, ambient) {
  drawShadow(x, y, 28)
  ctx.fillStyle = shade('#9e9e9e', ambient)
  ctx.beginPath(); ctx.ellipse(x, y, 26, 14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.strokeStyle = shade('#616161', ambient); ctx.lineWidth = 0.6
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * 22, y + Math.sin(a) * 11)
    ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 14)
    ctx.stroke()
  }
  ctx.fillStyle = shade('#29b6f6', ambient)
  ctx.beginPath(); ctx.ellipse(x, y - 2, 20, 10, 0, 0, Math.PI * 2); ctx.fill()
  const shim = Math.sin(frame * 0.05) * 1
  ctx.strokeStyle = withAlpha('#ffffff', 0.4); ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(x - 12, y - 2 + shim); ctx.lineTo(x + 12, y - 2 + shim); ctx.stroke()
  // Center pillar
  ctx.fillStyle = shade('#757575', ambient)
  ctx.fillRect(x - 3, y - 18, 6, 16); ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1; ctx.strokeRect(x - 3, y - 18, 6, 16)
  ctx.fillStyle = shade('#bdbdbd', ambient)
  ctx.beginPath(); ctx.ellipse(x, y - 18, 8, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
  // Water jet
  ctx.fillStyle = withAlpha('#4fc3f7', 0.7)
  ctx.beginPath()
  ctx.moveTo(x - 2, y - 18)
  ctx.quadraticCurveTo(x, y - 30 - Math.abs(Math.sin(frame * 0.1)) * 4, x + 2, y - 18)
  ctx.closePath(); ctx.fill()
  for (let i = 0; i < 4; i++) {
    const t = (frame * 0.03 + i * 0.25) % 1
    const dx = Math.sin(frame * 0.05 + i) * 5
    ctx.fillStyle = withAlpha('#4fc3f7', 1 - t)
    ctx.beginPath(); ctx.arc(x + dx, y - 18 + t * 16, 1.5, 0, Math.PI * 2); ctx.fill()
  }
}

function drawGenericBuilding(name, x, y, ambient) {
  drawShadow(x, y, 34)
  ctx.fillStyle = shade('#8d6e63', ambient)
  ctx.fillRect(x - 30, y - 25, 60, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.strokeRect(x - 30, y - 25, 60, 25)
  // Roof
  ctx.fillStyle = shade('#c62828', ambient)
  ctx.beginPath()
  ctx.moveTo(x - 34, y - 25); ctx.lineTo(x, y - 45); ctx.lineTo(x + 34, y - 25)
  ctx.closePath(); ctx.fill(); ctx.stroke()
  // Door
  ctx.fillStyle = shade('#4e342e', ambient)
  ctx.fillRect(x - 6, y - 14, 12, 14); ctx.strokeRect(x - 6, y - 14, 12, 14)
  // Window
  ctx.fillStyle = isNight() ? 'rgba(255,200,80,0.7)' : shade('#4fc3f7', ambient * 0.6)
  ctx.fillRect(x - 22, y - 20, 8, 8); ctx.strokeRect(x - 22, y - 20, 8, 8)
  ctx.fillRect(x + 14, y - 20, 8, 8); ctx.strokeRect(x + 14, y - 20, 8, 8)
}

// ============================================================================
// CHARACTERS
// ============================================================================
function drawCharacters(ambient) {
  ctx.save()
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)

  const sorted = [...agents].sort((a, b) => a.y - b.y)
  for (const agent of sorted) {
    drawCharacter(agent, ambient)
  }
  ctx.restore()
}

function drawCharacter(agent, ambient) {
  const outfit = getOutfit(agent.name)
  const { x, y } = agent
  const S = 1.3
  const isWalking = agent.action && (agent.action.includes('walk') || agent.action.includes('move') || agent.action.includes('go'))
  const isTalking = !!agent.dialogue
  const bob = isWalking ? Math.abs(Math.sin(frame * 0.3)) * 2 : Math.sin(frame * 0.05) * 0.8
  const legSwing = isWalking ? Math.sin(frame * 0.3) * 3 : 0
  const armSwing = isWalking ? Math.sin(frame * 0.3) * 2 : 0

  // Aura
  const auraColor = isTalking ? 'rgba(120,220,180,0.5)' :
                    isWalking ? 'rgba(220,220,220,0.25)' :
                    'rgba(180,180,180,0.2)'
  ctx.fillStyle = auraColor
  ctx.beginPath(); ctx.ellipse(x, y + 2, 14 * S, 6 * S, 0, 0, Math.PI * 2); ctx.fill()
  // Shadow
  ctx.fillStyle = SHADOW
  ctx.beginPath(); ctx.ellipse(x, y + 3, 9 * S, 3.5 * S, 0, 0, Math.PI * 2); ctx.fill()

  const baseY = y - bob
  const skin = shade(outfit.skin, ambient)
  const skinDk = shade(outfit.skin, 0.8)
  const shirt = shade(outfit.shirt, ambient)
  const shirtDk = shade(outfit.shirtDk, ambient)
  const pants = shade(outfit.pants, ambient)
  const pantsDk = shade(outfit.pantsDk, ambient)
  const hair = shade(outfit.hair, ambient)

  // Legs
  ctx.fillStyle = pantsDk
  ctx.fillRect(x - 4*S, baseY - 9*S, 3.5*S, 9*S + legSwing)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  ctx.strokeRect(x - 4*S, baseY - 9*S, 3.5*S, 9*S + legSwing)
  ctx.fillRect(x + 0.5*S, baseY - 9*S, 3.5*S, 9*S - legSwing)
  ctx.strokeRect(x + 0.5*S, baseY - 9*S, 3.5*S, 9*S - legSwing)
  ctx.fillStyle = '#3e2723'
  ctx.fillRect(x - 4.5*S, baseY - 1*S + legSwing, 4.5*S, 2.5*S)
  ctx.fillRect(x + 0.5*S, baseY - 1*S - legSwing, 4.5*S, 2.5*S)

  // Back arm
  ctx.fillStyle = shirtDk
  ctx.fillRect(x - 6*S, baseY - 17*S + armSwing, 3.5*S, 8*S)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  ctx.strokeRect(x - 6*S, baseY - 17*S + armSwing, 3.5*S, 8*S)
  ctx.fillStyle = skinDk
  ctx.beginPath(); ctx.arc(x - 4.2*S, baseY - 9*S + armSwing, 1.8*S, 0, Math.PI*2); ctx.fill()

  // Body
  ctx.fillStyle = shirt
  ctx.fillRect(x - 5*S, baseY - 17*S, 10*S, 11*S)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3*S
  ctx.strokeRect(x - 5*S, baseY - 17*S, 10*S, 11*S)
  ctx.fillStyle = shirtDk
  ctx.fillRect(x + 1*S, baseY - 17*S, 4*S, 11*S)

  // Accessory
  if (outfit.accessory === 'satchel') {
    ctx.fillStyle = shade(outfit.accessoryColor, ambient)
    ctx.fillRect(x - 7*S, baseY - 13*S, 5*S, 6*S)
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S; ctx.strokeRect(x - 7*S, baseY - 13*S, 5*S, 6*S)
    ctx.strokeStyle = shade(outfit.accessoryColor, 0.8); ctx.lineWidth = 1.5*S
    ctx.beginPath(); ctx.moveTo(x - 5*S, baseY - 17*S); ctx.lineTo(x - 3*S, baseY - 13*S); ctx.stroke()
  } else if (outfit.accessory === 'chainmail') {
    ctx.fillStyle = shade(outfit.accessoryColor, 0.9)
    ctx.fillRect(x - 5*S, baseY - 17*S, 10*S, 11*S)
    ctx.strokeStyle = shade('#616161', 1); ctx.lineWidth = 0.4*S
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x - 5*S, baseY - 15*S + i*2.5*S); ctx.lineTo(x + 5*S, baseY - 15*S + i*2.5*S); ctx.stroke()
    }
  } else if (outfit.accessory === 'cape') {
    ctx.fillStyle = shade(outfit.accessoryColor, ambient)
    ctx.beginPath()
    ctx.moveTo(x - 5*S, baseY - 17*S); ctx.lineTo(x - 7*S, baseY - 6*S)
    ctx.lineTo(x + 7*S, baseY - 6*S); ctx.lineTo(x + 5*S, baseY - 17*S)
    ctx.closePath(); ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S; ctx.stroke()
  } else if (outfit.accessory === 'apron') {
    ctx.fillStyle = shade(outfit.accessoryColor, ambient)
    ctx.fillRect(x - 4*S, baseY - 15*S, 8*S, 9*S)
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6*S; ctx.strokeRect(x - 4*S, baseY - 15*S, 8*S, 9*S)
  }

  // Belt
  ctx.fillStyle = '#3e2723'; ctx.fillRect(x - 5*S, baseY - 8*S, 10*S, 1.8*S)
  ctx.fillStyle = GOLD; ctx.fillRect(x - 1*S, baseY - 8*S, 2*S, 1.8*S)

  // Front arm
  ctx.fillStyle = shirt
  ctx.fillRect(x + 2.5*S, baseY - 17*S - armSwing, 3.5*S, 8*S)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  ctx.strokeRect(x + 2.5*S, baseY - 17*S - armSwing, 3.5*S, 8*S)
  ctx.fillStyle = skin
  ctx.beginPath(); ctx.arc(x + 4.2*S, baseY - 9*S - armSwing, 1.8*S, 0, Math.PI*2); ctx.fill()

  // Tool
  if (outfit.tool) drawTool(outfit.tool, x, baseY, S, ambient)

  // Head
  const headR = 7.5 * S
  const headY = baseY - 24 * S
  ctx.fillStyle = skin
  ctx.beginPath(); ctx.arc(x, headY, headR, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3*S; ctx.stroke()

  // Eyes
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.ellipse(x + 2*S, headY - 0.5*S, 2*S, 2.3*S, 0, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.7*S; ctx.stroke()
  ctx.beginPath(); ctx.ellipse(x + 5*S, headY - 0.5*S, 2*S, 2.3*S, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  ctx.fillStyle = '#212121'
  ctx.beginPath(); ctx.arc(x + 2*S, headY, 1.1*S, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 5*S, headY, 1.1*S, 0, Math.PI*2); ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x + 2.3*S, headY - 0.5*S, 0.4*S, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 5.3*S, headY - 0.5*S, 0.4*S, 0, Math.PI*2); ctx.fill()

  // Eyebrows
  ctx.strokeStyle = hair; ctx.lineWidth = 1*S
  ctx.beginPath(); ctx.moveTo(x + 0.5*S, headY - 2.5*S); ctx.lineTo(x + 3.5*S, headY - 3*S); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 4*S, headY - 3*S); ctx.lineTo(x + 7*S, headY - 2.5*S); ctx.stroke()

  // Mouth
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  ctx.beginPath()
  if (isTalking) {
    const open = Math.abs(Math.sin(frame * 0.3)) * 1.5*S + 0.5*S
    ctx.ellipse(x + 3.5*S, headY + 3*S, 1.8*S, open, 0, 0, Math.PI*2)
    ctx.fillStyle = '#8d6e63'; ctx.fill()
  } else {
    ctx.arc(x + 3.5*S, headY + 2*S, 2*S, 0.2, Math.PI - 0.2)
  }
  ctx.stroke()

  // Beard
  if (outfit.beard) {
    ctx.fillStyle = hair
    ctx.beginPath(); ctx.ellipse(x + 3.5*S, headY + 4*S, 3.5*S, 2.2*S, 0, 0, Math.PI); ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6*S; ctx.stroke()
  }

  // Hat
  drawHat(outfit.hat, outfit.hatColor || hair, x, headY, hair, S, ambient)

  // Selection ring
  if (selectedName === agent.name) {
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5*S
    ctx.beginPath(); ctx.ellipse(x, y + 2, 13*S, 6*S, 0, 0, Math.PI*2); ctx.stroke()
    ctx.strokeStyle = `rgba(255,215,0,${0.3 + 0.3 * Math.sin(frame * 0.1)})`
    ctx.lineWidth = 1.5*S
    ctx.beginPath(); ctx.ellipse(x, y + 2, 16*S + Math.sin(frame*0.1)*2, 7*S, 0, 0, Math.PI*2); ctx.stroke()
  } else if (hoveredName === agent.name) {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5*S
    ctx.beginPath(); ctx.ellipse(x, y + 2, 13*S, 6*S, 0, 0, Math.PI*2); ctx.stroke()
  }

  // Name label + HP bar
  const stats = calcStats(agent.name)
  const hpPct = stats.hp / (stats.hp + 20)  // simulate some HP variation
  ctx.font = `bold ${10*S}px Inter, sans-serif`
  ctx.textAlign = 'center'
  const nameW = ctx.measureText(agent.name).width + 8
  ctx.fillStyle = 'rgba(0,0,0,0.75)'
  roundRect(x - nameW/2, headY - 20*S, nameW, 12, 4)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(agent.name, x, headY - 11.5*S)
  // HP bar above name
  const hpBarW = 24 * S
  ctx.fillStyle = 'rgba(0,0,0,0.6)'
  ctx.fillRect(x - hpBarW/2, headY - 26*S, hpBarW, 3)
  ctx.fillStyle = hpPct > 0.5 ? '#22c55e' : hpPct > 0.25 ? '#facc15' : '#ef4444'
  ctx.fillRect(x - hpBarW/2, headY - 26*S, hpBarW * hpPct, 3)

  // Chat bubble
  const bubble = bubbles[agent.name]
  if (bubble && Date.now() < bubble.until) {
    drawBubble(x, headY - 32*S, bubble.text)
  }
}

function drawHat(hat, hatColor, x, headY, hair, S, ambient) {
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  if (hat === 'band') {
    ctx.fillStyle = shade(hair, ambient)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade(hatColor, ambient)
    ctx.fillRect(x - 8*S, headY - 3*S, 16*S, 2.5*S); ctx.strokeRect(x - 8*S, headY - 3*S, 16*S, 2.5*S)
    ctx.beginPath()
    ctx.moveTo(x + 7*S, headY - 2*S); ctx.lineTo(x + 10*S, headY - 4*S); ctx.lineTo(x + 9*S, headY)
    ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (hat === 'helm') {
    ctx.fillStyle = shade('#9e9e9e', ambient)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8.5*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade('#616161', ambient)
    ctx.fillRect(x - 9*S, headY - 2*S, 18*S, 2*S); ctx.strokeRect(x - 9*S, headY - 2*S, 18*S, 2*S)
    ctx.fillStyle = shade('#bdbdbd', ambient)
    ctx.beginPath()
    ctx.moveTo(x - 2*S, headY - 9*S); ctx.lineTo(x, headY - 14*S); ctx.lineTo(x + 2*S, headY - 9*S)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath(); ctx.arc(x - 3*S, headY - 5*S, 2*S, 0, Math.PI*2); ctx.fill()
  } else if (hat === 'feather') {
    ctx.fillStyle = shade(hair, ambient)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8.5*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade(hatColor, ambient)
    ctx.beginPath(); ctx.ellipse(x, headY - 4*S, 10*S, 2.5*S, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade('#e91e63', ambient)
    ctx.beginPath()
    ctx.moveTo(x + 7*S, headY - 6*S)
    ctx.quadraticCurveTo(x + 14*S, headY - 16*S, x + 12*S, headY - 18*S)
    ctx.quadraticCurveTo(x + 8*S, headY - 10*S, x + 6*S, headY - 5*S)
    ctx.closePath(); ctx.fill(); ctx.stroke()
    ctx.strokeStyle = shade('#880e4f', ambient); ctx.lineWidth = 0.5*S
    ctx.beginPath(); ctx.moveTo(x + 7*S, headY - 7*S); ctx.lineTo(x + 11*S, headY - 14*S); ctx.stroke()
  } else if (hat === 'straw') {
    ctx.fillStyle = shade(hatColor, ambient)
    ctx.beginPath(); ctx.ellipse(x, headY - 5*S, 13*S, 4*S, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade(shade(hatColor, 0.8), ambient)
    ctx.beginPath(); ctx.ellipse(x, headY - 8*S, 7*S, 3*S, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  } else if (hat === 'hood') {
    ctx.fillStyle = shade(hatColor, ambient)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 9*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x + 6*S, headY - 2*S); ctx.lineTo(x + 10*S, headY + 3*S); ctx.lineTo(x + 5*S, headY + 4*S)
    ctx.closePath(); ctx.fill(); ctx.stroke()
  } else if (hat === 'cap') {
    ctx.fillStyle = shade(hair, ambient)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8.5*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade(hatColor, ambient)
    ctx.fillRect(x, headY - 5*S, 9*S, 2.5*S); ctx.strokeRect(x, headY - 5*S, 9*S, 2.5*S)
  } else if (hat === 'bald') {
    ctx.fillStyle = shade(hair, ambient)
    ctx.beginPath(); ctx.arc(x - 5*S, headY + 2*S, 2.5*S, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    ctx.beginPath(); ctx.arc(x + 5*S, headY + 2*S, 2.5*S, 0, Math.PI*2); ctx.fill(); ctx.stroke()
  } else if (hat === null || !hat) {
    ctx.fillStyle = shade(hair, ambient)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8.5*S, Math.PI, 0); ctx.fill(); ctx.stroke()
  }
}

function drawTool(tool, x, baseY, S, ambient) {
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S
  switch (tool) {
    case 'maps':
      ctx.fillStyle = shade('#d4a043', ambient)
      ctx.beginPath(); ctx.ellipse(x + 7*S, baseY - 11*S, 3*S, 4*S, 0.3, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S; ctx.stroke()
      ctx.fillStyle = shade('#c89c5e', ambient)
      ctx.beginPath(); ctx.ellipse(x + 9*S, baseY - 13*S, 1.5*S, 2*S, 0.3, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      break
    case 'spear':
      ctx.strokeStyle = shade('#5d4037', ambient); ctx.lineWidth = 2*S
      ctx.beginPath(); ctx.moveTo(x + 5*S, baseY - 5*S); ctx.lineTo(x + 5*S, baseY - 22*S); ctx.stroke()
      ctx.fillStyle = shade('#bdbdbd', ambient)
      ctx.beginPath()
      ctx.moveTo(x + 4*S, baseY - 22*S); ctx.lineTo(x + 5*S, baseY - 28*S); ctx.lineTo(x + 6*S, baseY - 22*S)
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6*S; ctx.stroke()
      break
    case 'lute':
      ctx.fillStyle = shade('#8d6e63', ambient)
      ctx.beginPath(); ctx.ellipse(x + 6*S, baseY - 14*S, 3.5*S, 4.5*S, 0, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S; ctx.stroke()
      ctx.fillStyle = shade('#3e2723', ambient)
      ctx.beginPath(); ctx.arc(x + 6*S, baseY - 13*S, 1.2*S, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = shade('#5d4037', ambient)
      ctx.fillRect(x + 5.5*S, baseY - 21*S, 2*S, 7*S); ctx.strokeRect(x + 5.5*S, baseY - 21*S, 2*S, 7*S)
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.3*S
      ctx.beginPath(); ctx.moveTo(x + 6*S, baseY - 21*S); ctx.lineTo(x + 6*S, baseY - 12*S); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + 7*S, baseY - 21*S); ctx.lineTo(x + 7*S, baseY - 12*S); ctx.stroke()
      break
    case 'coins':
      ctx.fillStyle = shade(GOLD, ambient)
      ctx.beginPath(); ctx.arc(x - 6*S, baseY - 8*S, 3*S, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S; ctx.stroke()
      ctx.fillStyle = shade('#ffa000', ambient)
      ctx.beginPath(); ctx.arc(x - 6*S, baseY - 8*S, 2*S, 0, Math.PI*2); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.fillRect(x - 7*S, baseY - 9*S, 1*S, 1*S)
      ctx.fillStyle = shade(GOLD, ambient)
      ctx.beginPath(); ctx.arc(x - 4*S, baseY - 10*S, 2*S, 0, Math.PI*2); ctx.fill(); ctx.stroke()
      break
    case 'sickle':
      const sy2 = baseY - 12*S
      ctx.strokeStyle = shade('#5d4037', ambient); ctx.lineWidth = 2*S
      ctx.beginPath(); ctx.moveTo(x + 4*S, sy2); ctx.lineTo(x + 4*S, sy2 + 6*S); ctx.stroke()
      ctx.strokeStyle = shade('#bdbdbd', ambient); ctx.lineWidth = 2*S
      ctx.beginPath(); ctx.arc(x + 7*S, sy2, 4*S, Math.PI/2, Math.PI*1.5, false); ctx.stroke()
      break
    case 'potion':
      const py = baseY - 13*S
      ctx.fillStyle = shade('#7e57c2', ambient)
      ctx.beginPath(); ctx.ellipse(x + 6*S, py, 3*S, 3.5*S, 0, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S; ctx.stroke()
      ctx.fillStyle = shade('#5e35b2', ambient)
      ctx.fillRect(x + 5.2*S, py - 3*S, 1.5*S, 3*S); ctx.strokeRect(x + 5.2*S, py - 3*S, 1.5*S, 3*S)
      ctx.fillStyle = shade('#5d4037', ambient)
      ctx.fillRect(x + 4.5*S, py - 5*S, 3*S, 2*S); ctx.strokeRect(x + 4.5*S, py - 5*S, 3*S, 2*S)
      const pglow = 0.5 + 0.3 * Math.sin(frame * 0.1)
      ctx.fillStyle = `rgba(186,104,200,${pglow * 0.4})`
      ctx.beginPath(); ctx.arc(x + 6*S, py, 6*S, 0, Math.PI*2); ctx.fill()
      break
    case 'basket':
      ctx.fillStyle = shade('#8d6e63', ambient)
      ctx.beginPath(); ctx.ellipse(x - 7*S, baseY - 12*S, 4*S, 2.5*S, 0, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S; ctx.stroke()
      ctx.fillStyle = shade('#66bb6a', ambient)
      ctx.beginPath(); ctx.arc(x - 7*S, baseY - 13.5*S, 2*S, 0, Math.PI*2); ctx.fill()
      ctx.beginPath(); ctx.arc(x - 8.5*S, baseY - 12.5*S, 1.5*S, 0, Math.PI*2); ctx.fill()
      break
    case 'hammer':
      ctx.fillStyle = shade('#5d4037', ambient)
      ctx.fillRect(x + 4*S, baseY - 14*S, 2.5*S, 10*S)
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S; ctx.strokeRect(x + 4*S, baseY - 14*S, 2.5*S, 10*S)
      ctx.fillStyle = shade('#616161', ambient)
      ctx.fillRect(x + 1.5*S, baseY - 18*S, 7.5*S, 5*S); ctx.strokeRect(x + 1.5*S, baseY - 18*S, 7.5*S, 5*S)
      break
    case 'bow':
      ctx.strokeStyle = shade('#5d4037', ambient); ctx.lineWidth = 2*S
      ctx.beginPath(); ctx.arc(x + 5*S, baseY - 16*S, 8*S, -Math.PI/3, Math.PI/3); ctx.stroke()
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.5*S
      ctx.beginPath(); ctx.moveTo(x + 9*S, baseY - 23*S); ctx.lineTo(x + 9*S, baseY - 9*S); ctx.stroke()
      break
  }
}

function drawBubble(x, y, text) {
  ctx.font = '12px Inter, sans-serif'
  const padding = 8
  const maxW = 200
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW - padding * 2 && line) { lines.push(line); line = w }
    else line = test
  }
  if (line) lines.push(line)
  const lineH = 16
  const bw = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2)
  const bh = lines.length * lineH + padding
  const bx = x - bw / 2, by = y - bh
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2
  roundRect(bx, by, bw, bh, 8); ctx.fill(); ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(x - 5, by + bh); ctx.lineTo(x, by + bh + 8); ctx.lineTo(x + 5, by + bh)
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.97)'; ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.stroke()
  ctx.fillStyle = '#222'; ctx.textAlign = 'left'
  lines.forEach((l, i) => { ctx.fillText(l, bx + padding, by + padding + (i + 1) * lineH - 4) })
}

// ============================================================================
// SKY OVERLAY (day/night tint)
// ============================================================================
function drawSkyOverlay() {
  const { ambient } = getSkyColors()
  if (ambient < 1.0) {
    ctx.fillStyle = `rgba(10,10,40,${(1 - ambient) * 0.4})`
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  }
}

// ============================================================================
// MINIMAP
// ============================================================================
function drawMinimap() {
  if (!miniCtx) return
  const mw = minimapCanvas.width, mh = minimapCanvas.height
  const scaleX = mw / WORLD_W, scaleY = mh / WORLD_H
  miniCtx.fillStyle = '#1a237e'
  miniCtx.fillRect(0, 0, mw, mh)
  // Grass
  miniCtx.fillStyle = '#3a5f2a'
  miniCtx.fillRect(0, 0, mw, mh)
  // Locations
  for (const [name, loc] of Object.entries(locations)) {
    miniCtx.fillStyle = '#e8a33d'
    miniCtx.fillRect(loc.x * scaleX - 2, loc.y * scaleY - 2, 4, 4)
  }
  // Agents
  for (const a of agents) {
    miniCtx.fillStyle = a.color || '#fff'
    miniCtx.beginPath()
    miniCtx.arc(a.x * scaleX, a.y * scaleY, 2.5, 0, Math.PI * 2)
    miniCtx.fill()
  }
  // Viewport rectangle
  miniCtx.strokeStyle = '#ffd700'
  miniCtx.lineWidth = 1
  miniCtx.strokeRect(
    camera.x * scaleX, camera.y * scaleY,
    (CANVAS_W / camera.zoom) * scaleX, (CANVAS_H / camera.zoom) * scaleY
  )
}

// ============================================================================
// MAIN RENDER LOOP
// ============================================================================
function render() {
  frame++
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  if (Object.keys(locations).length === 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    grad.addColorStop(0, '#64b5f6'); grad.addColorStop(1, '#c8e6c9')
    ctx.fillStyle = grad; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.font = 'bold 22px Inter, sans-serif'; ctx.textAlign = 'center'
    ctx.fillText('Loading Aetheria...', CANVAS_W / 2, CANVAS_H / 2)
    requestAnimationFrame(render); return
  }

  const { ambient } = getSkyColors()
  drawGround(ambient)
  drawDecorations(ambient)
  drawLocations(ambient)
  drawCharacters(ambient)
  drawBirds(ambient)
  drawSkyOverlay()
  drawMinimap()

  requestAnimationFrame(render)
}

// ============================================================================
// INTERACTION — pan, zoom, click
// ============================================================================
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY }
}

function findClickedChar(sx, sy) {
  const { x: wx, y: wy } = screenToWorld(sx, sy)
  for (const agent of agents) {
    if (Math.hypot(wx - agent.x, wy - (agent.y - 15)) < 25 / camera.zoom) return agent.name
  }
  return null
}

function setupInteraction() {
  canvas.addEventListener('mousedown', (e) => {
    const { x, y } = getCanvasPos(e)
    const name = findClickedChar(x, y)
    if (name && e.button === 0) {
      selectedName = name
      openInspector(name)
      updateCardSelection()
      return
    }
    isDragging = true
    dragStartX = x; dragStartY = y
    camStartX = camera.x; camStartY = camera.y
  })
  canvas.addEventListener('mousemove', (e) => {
    const { x, y } = getCanvasPos(e)
    if (isDragging) {
      const dx = (x - dragStartX) / camera.zoom
      const dy = (y - dragStartY) / camera.zoom
      camera.x = camStartX - dx
      camera.y = camStartY - dy
      clampCamera()
    } else {
      hoveredName = findClickedChar(x, y)
      canvas.style.cursor = hoveredName ? 'pointer' : 'grab'
    }
  })
  canvas.addEventListener('mouseup', () => { isDragging = false })
  canvas.addEventListener('mouseleave', () => { isDragging = false; hoveredName = null })
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault()
    const { x: wx, y: wy } = screenToWorld(...Object.values(getCanvasPos(e)))
    const factor = e.deltaY < 0 ? 1.15 : 0.87
    const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom * factor))
    // Zoom toward mouse position
    const { x: sx, y: sy } = getCanvasPos(e)
    camera.x = wx - sx / newZoom
    camera.y = wy - sy / newZoom
    camera.zoom = newZoom
    clampCamera()
  }, { passive: false })

  // Minimap click — jump camera
  minimapCanvas.addEventListener('click', (e) => {
    const rect = minimapCanvas.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width * WORLD_W
    const my = (e.clientY - rect.top) / rect.height * WORLD_H
    camera.x = mx - CANVAS_W / (2 * camera.zoom)
    camera.y = my - CANVAS_H / (2 * camera.zoom)
    clampCamera()
  })

  // Zoom buttons
  document.getElementById('zoomIn').onclick = () => {
    camera.zoom = Math.min(camera.maxZoom, camera.zoom * 1.3)
    clampCamera()
  }
  document.getElementById('zoomOut').onclick = () => {
    camera.zoom = Math.max(camera.minZoom, camera.zoom * 0.77)
    clampCamera()
  }
  document.getElementById('zoomReset').onclick = () => {
    camera.zoom = 0.5
    camera.x = WORLD_W / 2 - CANVAS_W / (2 * camera.zoom)
    camera.y = WORLD_H / 2 - CANVAS_H / (2 * camera.zoom)
    clampCamera()
  }
}

// ============================================================================
// WEBSOCKET
// ============================================================================
function connectWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${proto}://${location.host}`)
  ws.addEventListener('open', () => {
    connected = true
    document.getElementById('connDot').classList.add('connected')
    document.getElementById('connLabel').textContent = 'live'
  })
  ws.addEventListener('close', () => {
    connected = false
    document.getElementById('connDot').classList.remove('connected')
    document.getElementById('connLabel').textContent = 'reconnecting…'
    setTimeout(connectWebSocket, 2000)
  })
  ws.addEventListener('error', () => ws.close())
  ws.addEventListener('message', (event) => {
    try {
      const state = JSON.parse(event.data)
      if (state.type === 'tick') handleTick(state)
    } catch (err) { console.error('bad message', err) }
  })
}

function handleTick(state) {
  document.getElementById('tickCount').textContent = `⏱ tick ${state.tick}`
  // Advance game time (1 tick = 1 hour, wrap at 24)
  gameHour = (gameHour + 1) % 24
  const badge = document.getElementById('timeBadge')
  const h = gameHour
  const icon = h >= 5 && h < 19 ? '☀' : '🌙'
  badge.textContent = `${icon} ${String(h).padStart(2,'0')}:00`

  agents = state.agents
  const now = Date.now()
  for (const a of state.agents) {
    if (a.dialogue) bubbles[a.name] = { text: a.dialogue, until: now + 5000 }
  }
  renderCharCards()
}

// ============================================================================
// CHARACTER STAT CARDS
// ============================================================================
function calcStats(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  hash = Math.abs(hash)
  return {
    hp: 80 + (hash % 40),
    atk: 12 + (hash % 18),
    def: 6 + (hash % 14),
  }
}

function renderCharCards() {
  const container = document.getElementById('charCards')
  document.getElementById('charCount').textContent = `${agents.length} villagers`
  document.getElementById('agentBadge').textContent = `${agents.length} characters`
  container.innerHTML = agents.map(a => {
    const info = agentInfo[a.name] || {}
    const outfit = getOutfit(a.name)
    const stats = calcStats(a.name)
    const role = outfit.role || 'Villager'
    const hpPct = stats.hp / (stats.hp + 20) * 100
    return `
      <div class="char-card ${selectedName === a.name ? 'selected' : ''}" data-name="${a.name}">
        <div class="char-card-top">
          <div class="char-avatar" style="background:${a.color}">${a.name[0]}</div>
          <div style="min-width:0;flex:1">
            <div class="char-name">${a.name}</div>
            <div class="char-role">${role}</div>
          </div>
        </div>
        <div class="char-stats">
          <span class="stat-hp">♥${stats.hp}</span>
          <span class="stat-atk">⚔${stats.atk}</span>
          <span class="stat-def">🛡${stats.def}</span>
        </div>
        <div class="char-hpbar"><div class="char-hpbar-fill" style="width:${hpPct}%"></div></div>
        <div class="char-status">${a.action === 'wait' ? 'waiting' : a.action} @ ${a.location}</div>
      </div>
    `
  }).join('')
  container.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedName = card.dataset.name
      openInspector(selectedName)
      updateCardSelection()
      centerOnAgent(selectedName)
    })
  })
}

function updateCardSelection() {
  document.querySelectorAll('.char-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.name === selectedName)
  })
}

// ============================================================================
// INSPECTOR
// ============================================================================
function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str || ''; return div.innerHTML }

async function openInspector(name) {
  const body = document.getElementById('inspectorBody')
  body.innerHTML = '<div class="inspector-loading">Reading their thoughts…</div>'
  try {
    const res = await fetch(`/api/agents/${encodeURIComponent(name)}/memories`)
    if (!res.ok) throw new Error('request failed')
    const data = await res.json()
    renderInspector(data)
  } catch (err) {
    body.innerHTML = '<div class="inspector-empty">Could not load — try clicking again.</div>'
  }
}

function renderInspector(data) {
  const body = document.getElementById('inspectorBody')
  const outfit = getOutfit(data.name)
  const stats = calcStats(data.name)
  const role = outfit.role || 'Villager'
  const color = agentInfo[data.name]?.color || '#888'
  const memoriesHtml = data.memories.length
    ? data.memories.map(m => `<li class="memory memory-${escapeHtml(m.type)}"><span class="memory-type">${escapeHtml(m.type)}</span><span>${escapeHtml(m.content)}</span></li>`).join('')
    : '<li class="memory" style="border-left-color:#555"><span>No memories yet.</span></li>'
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div class="char-avatar" style="width:44px;height:44px;font-size:20px;background:${color}">${data.name[0]}</div>
      <div><h2>${escapeHtml(data.name)}</h2><div class="role">${escapeHtml(role)}</div></div>
    </div>
    <p class="persona">"${escapeHtml(data.persona)}"</p>
    <div class="stat-boxes">
      <div class="stat-box hp"><div class="icon">♥</div><div class="label">HP</div><div class="value">${stats.hp}</div></div>
      <div class="stat-box atk"><div class="icon">⚔</div><div class="label">ATK</div><div class="value">${stats.atk}</div></div>
      <div class="stat-box def"><div class="icon">🛡</div><div class="label">DEF</div><div class="value">${stats.def}</div></div>
    </div>
    <div class="section-label">📍 Currently at</div>
    <div class="plan-box">${escapeHtml(data.location)}</div>
    <div class="section-label">🎯 Current plan</div>
    <div class="plan-box">${escapeHtml(data.plan)}</div>
    <div class="section-label">💭 Recent memories</div>
    <ul class="memories">${memoriesHtml}</ul>
  `
}

// ============================================================================
// INIT
// ============================================================================
window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('gameCanvas')
  ctx = canvas.getContext('2d')
  minimapCanvas = document.getElementById('minimapCanvas')
  miniCtx = minimapCanvas.getContext('2d')

  try { const res = await fetch('/api/locations'); locations = await res.json() } catch (e) { console.error(e) }
  try {
    const res = await fetch('/api/agents')
    const list = await res.json()
    agentInfo = {}
    for (const a of list) agentInfo[a.name] = a
  } catch (e) { console.error(e) }

  // Scale location coordinates from 800x500 to 2000x1400 world
  for (const loc of Object.values(locations)) {
    loc.x = (loc.x / 800) * WORLD_W
    loc.y = (loc.y / 500) * WORLD_H
  }

  generateDecorations()
  setupInteraction()
  // Center camera initially
  camera.x = WORLD_W / 2 - CANVAS_W / (2 * camera.zoom)
  camera.y = WORLD_H / 2 - CANVAS_H / (2 * camera.zoom)
  clampCamera()
  render()
  connectWebSocket()
})
