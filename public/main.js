/**
 * Living World — Clash of Clans / Aetheria style canvas renderer
 * Vanilla JS HTML5 Canvas (replaces Phaser) with unique character sprites.
 *
 * Characters:
 *   Mira  — map seller, teal tunic, rolled maps, headband, satchel
 *   Tomas — night guard, chainmail, spear, spiked helm, tired eyes, beard
 *   Elyas — traveling bard, purple hooded cloak, lute, feathered cap
 */

// ============================================================================
// CONFIG
// ============================================================================
const CANVAS_W = 800
const CANVAS_H = 500

let canvas, ctx
let locations = {}
let agents = []
let agentInfo = {}  // name -> { persona, color }
let selectedName = null
let hoveredName = null
let frame = 0
let bubbles = {}    // name -> { text, until }
let lastTick = 0
let connected = false

// Unique character outfit configs
const OUTFITS = {
  Mira: {
    skin: '#ffcc80', hair: '#5d4037',
    shirt: '#4f9d8a', shirtDk: '#3a7567',
    pants: '#5d4037', pantsDk: '#3e2723',
    hat: 'band', hatColor: '#e8a33d',
    tool: 'maps',
    accessory: 'satchel', accessoryColor: '#8d6e63',
    role: 'Map Seller',
  },
  Tomas: {
    skin: '#ffcc80', hair: '#424242',
    shirt: '#546e7a', shirtDk: '#37474f',
    pants: '#37474f', pantsDk: '#263238',
    hat: 'helm', hatColor: '#90a4ae',
    tool: 'spear',
    accessory: 'chainmail', accessoryColor: '#b0bec5',
    role: 'Night Guard',
    beard: true,
  },
  Elyas: {
    skin: '#ffe0b2', hair: '#6a1b9a',
    shirt: '#8b6bc4', shirtDk: '#6a4ba0',
    pants: '#4a148c', pantsDk: '#311b92',
    hat: 'feather', hatColor: '#7b1fa2',
    tool: 'lute',
    accessory: 'cape', accessoryColor: '#6a1b9a',
    role: 'Traveling Bard',
  },
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
// SKY / BACKGROUND
// ============================================================================
function drawBackground() {
  // Grass gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#558b2f')
  grad.addColorStop(0.5, '#689f38')
  grad.addColorStop(1, '#7cb342')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Grass texture dots
  ctx.fillStyle = 'rgba(85,139,47,0.4)'
  for (let i = 0; i < 100; i++) {
    const x = (i * 67) % CANVAS_W
    const y = (i * 43) % CANVAS_H
    ctx.fillRect(x, y, 2, 1)
  }
  ctx.fillStyle = 'rgba(139,195,74,0.5)'
  for (let i = 0; i < 80; i++) {
    const x = (i * 83 + 20) % CANVAS_W
    const y = (i * 37 + 15) % CANVAS_H
    ctx.fillRect(x, y, 1, 2)
  }

  // Dirt paths connecting locations
  ctx.strokeStyle = '#bcaaa4'
  ctx.lineWidth = 20
  ctx.lineCap = 'round'
  const locs = Object.values(locations)
  for (let i = 0; i < locs.length; i++) {
    for (let j = i + 1; j < locs.length; j++) {
      ctx.beginPath()
      ctx.moveTo(locs[i].x, locs[i].y)
      ctx.lineTo(locs[j].x, locs[j].y)
      ctx.globalAlpha = 0.15
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1

  // Path cobblestones
  ctx.fillStyle = '#a1887f'
  for (let i = 0; i < 60; i++) {
    const x = (i * 97) % CANVAS_W
    const y = (i * 53) % CANVAS_H
    ctx.beginPath()
    ctx.arc(x, y, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ============================================================================
// BUILDINGS / LOCATIONS — Clash of Clans style
// ============================================================================
function drawLocation(name, loc) {
  const { x, y } = loc
  if (name === 'Map Stand') drawMapStand(x, y)
  else if (name === 'Guard Post') drawGuardPost(x, y)
  else if (name === 'Tavern') drawTavern(x, y)
  else if (name === 'Market') drawMarket(x, y)
  else if (name === 'Fountain') drawFountain(x, y)
  drawBuildingLabel(name, x, y + 50)
}

function drawBuildingLabel(name, x, y) {
  ctx.font = 'bold 11px Inter, sans-serif'
  ctx.textAlign = 'center'
  const w = ctx.measureText(name).width + 10
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  roundRect(x - w/2, y - 7, w, 14, 4)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(name, x, y + 3)
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
  ctx.beginPath()
  ctx.ellipse(x, y, w, w * 0.35, 0, 0, Math.PI * 2)
  ctx.fill()
}

function drawMapStand(x, y) {
  drawShadow(x, y + 15, 35)
  // Wooden stall base
  ctx.fillStyle = shade('#8d6e63', 1)
  ctx.fillRect(x - 30, y - 5, 60, 20)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.strokeRect(x - 30, y - 5, 60, 20)
  // Legs
  ctx.fillStyle = shade('#5d4037', 1)
  ctx.fillRect(x - 28, y + 15, 5, 12)
  ctx.fillRect(x + 23, y + 15, 5, 12)
  ctx.strokeRect(x - 28, y + 15, 5, 12)
  ctx.strokeRect(x + 23, y + 15, 5, 12)
  // Awning (striped)
  const stripes = ['#e53935', '#fff', '#e53935', '#fff']
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = shade(stripes[i], 1)
    ctx.beginPath()
    ctx.moveTo(x - 34 + i * 17, y - 5)
    ctx.lineTo(x - 17 + i * 17, y - 5)
    ctx.lineTo(x - 14 + i * 17, y - 15)
    ctx.lineTo(x - 31 + i * 17, y - 15)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8
    ctx.stroke()
  }
  // Rolled maps on counter
  ctx.fillStyle = shade('#d4a043', 1)
  ctx.beginPath(); ctx.ellipse(x - 10, y, 6, 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8; ctx.stroke()
  ctx.fillStyle = shade('#c89c5e', 1)
  ctx.beginPath(); ctx.ellipse(x + 8, y, 5, 2.5, 0, 0, Math.PI * 2); ctx.fill()
  ctx.stroke()
}

function drawGuardPost(x, y) {
  drawShadow(x, y + 15, 30)
  // Stone base
  ctx.fillStyle = shade('#757575', 1)
  ctx.fillRect(x - 18, y - 10, 36, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.strokeRect(x - 18, y - 10, 36, 25)
  // Stone texture
  ctx.strokeStyle = shade('#424242', 1); ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 18, y + 8); ctx.lineTo(x + 18, y + 8); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 6, y - 10); ctx.lineTo(x - 6, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6, y + 8); ctx.stroke()

  // Wooden tower top
  ctx.fillStyle = shade('#8d6e63', 1)
  ctx.fillRect(x - 16, y - 35, 32, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.strokeRect(x - 16, y - 35, 32, 25)
  // Battlements
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = shade('#9e9e9e', 1)
    ctx.fillRect(x - 16 + i * 12, y - 40, 8, 6)
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8
    ctx.strokeRect(x - 16 + i * 12, y - 40, 8, 6)
  }
  // Window slit
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(x - 3, y - 28, 6, 4)
  // Flag
  ctx.strokeStyle = '#424242'; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y - 52); ctx.stroke()
  const wave = Math.sin(frame * 0.1) * 1.5
  ctx.fillStyle = '#e53935'
  ctx.beginPath()
  ctx.moveTo(x, y - 52)
  ctx.lineTo(x + 12 + wave, y - 49)
  ctx.lineTo(x + 12 + wave, y - 43)
  ctx.lineTo(x, y - 40)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8
  ctx.stroke()

  // Lantern glow
  const glow = 0.3 + 0.2 * Math.sin(frame * 0.08)
  const g = ctx.createRadialGradient(x, y - 22, 2, x, y - 22, 35)
  g.addColorStop(0, `rgba(255,180,40,${glow * 0.5})`)
  g.addColorStop(1, 'rgba(255,180,40,0)')
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y - 22, 35, 0, Math.PI * 2); ctx.fill()
}

function drawTavern(x, y) {
  drawShadow(x, y + 15, 38)
  // Stone foundation
  ctx.fillStyle = shade('#616161', 1)
  ctx.fillRect(x - 34, y - 2, 68, 4)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1
  ctx.strokeRect(x - 34, y - 2, 68, 4)
  // Wooden walls
  ctx.fillStyle = shade('#8d6e63', 1)
  ctx.fillRect(x - 32, y - 25, 64, 25)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.strokeRect(x - 32, y - 25, 64, 25)
  // Wood beams
  ctx.strokeStyle = shade('#3e2723', 1); ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(x, y - 25); ctx.lineTo(x, y); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 32, y - 12); ctx.lineTo(x + 32, y - 12); ctx.stroke()

  // Red roof
  ctx.fillStyle = shade('#c62828', 1)
  ctx.beginPath()
  ctx.moveTo(x - 36, y - 25)
  ctx.lineTo(x, y - 50)
  ctx.lineTo(x + 36, y - 25)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.stroke()
  // Shingle lines
  ctx.strokeStyle = shade('#8e1414', 1); ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(x - 28, y - 31); ctx.lineTo(x + 28, y - 31); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 20, y - 38); ctx.lineTo(x + 20, y - 38); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 12, y - 44); ctx.lineTo(x + 12, y - 44); ctx.stroke()

  // Door
  ctx.fillStyle = shade('#4e342e', 1)
  ctx.fillRect(x - 6, y - 15, 12, 15)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1
  ctx.strokeRect(x - 6, y - 15, 12, 15)
  ctx.fillStyle = GOLD
  ctx.beginPath(); ctx.arc(x + 3, y - 7, 1, 0, Math.PI * 2); ctx.fill()

  // Windows with glow
  const winGlow = 0.5 + 0.2 * Math.sin(frame * 0.08)
  ctx.fillStyle = `rgba(255,200,80,${winGlow})`
  ctx.fillRect(x - 24, y - 20, 8, 8)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8
  ctx.strokeRect(x - 24, y - 20, 8, 8)
  ctx.fillRect(x + 16, y - 20, 8, 8)
  ctx.strokeRect(x + 16, y - 20, 8, 8)

  // Sign
  ctx.fillStyle = shade('#5d4037', 1)
  ctx.fillRect(x - 38, y - 28, 10, 8)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8
  ctx.strokeRect(x - 38, y - 28, 10, 8)
  ctx.fillStyle = '#ffb300'
  ctx.beginPath(); ctx.arc(x - 33, y - 24, 2, 0, Math.PI * 2); ctx.fill()

  // Chimney smoke
  const chimX = x + 20, chimY = y - 42
  ctx.fillStyle = shade('#424242', 1)
  ctx.fillRect(chimX - 3, chimY - 8, 6, 10)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8
  ctx.strokeRect(chimX - 3, chimY - 8, 6, 10)
  for (let i = 0; i < 3; i++) {
    const t = (frame * 0.02 + i * 0.7) % 1
    const sx = chimX + Math.sin(frame * 0.03 + i) * 3
    const sy = chimY - 8 - t * 25
    const size = 2 + t * 4
    ctx.fillStyle = `rgba(180,180,180,${0.5 * (1 - t)})`
    ctx.beginPath(); ctx.arc(sx, sy, size, 0, Math.PI * 2); ctx.fill()
  }
}

function drawMarket(x, y) {
  drawShadow(x, y + 15, 36)
  // Stall base
  ctx.fillStyle = shade('#8d6e63', 1)
  ctx.fillRect(x - 32, y - 5, 64, 20)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.strokeRect(x - 32, y - 5, 64, 20)
  // Legs
  ctx.fillStyle = shade('#5d4037', 1)
  ctx.fillRect(x - 30, y + 15, 4, 10)
  ctx.fillRect(x + 26, y + 15, 4, 10)
  ctx.strokeRect(x - 30, y + 15, 4, 10)
  ctx.strokeRect(x + 26, y + 15, 4, 10)

  // Blue roof
  ctx.fillStyle = shade('#1565c0', 1)
  ctx.beginPath()
  ctx.moveTo(x - 36, y - 5)
  ctx.lineTo(x, y - 28)
  ctx.lineTo(x + 36, y - 5)
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5
  ctx.stroke()
  // Shingles
  ctx.strokeStyle = shade('#0d47a1', 1); ctx.lineWidth = 0.6
  ctx.beginPath(); ctx.moveTo(x - 28, y - 11); ctx.lineTo(x + 28, y - 11); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 20, y - 17); ctx.lineTo(x + 20, y - 17); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - 12, y - 23); ctx.lineTo(x + 12, y - 23); ctx.stroke()

  // Goods on stall
  ctx.fillStyle = shade('#e53935', 1)
  ctx.beginPath(); ctx.arc(x - 15, y, 4, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6; ctx.stroke()
  ctx.fillStyle = shade('#fdd835', 1)
  ctx.beginPath(); ctx.arc(x - 5, y, 4, 0, Math.PI * 2); ctx.fill()
  ctx.stroke()
  ctx.fillStyle = shade('#43a047', 1)
  ctx.beginPath(); ctx.arc(x + 5, y, 4, 0, Math.PI * 2); ctx.fill()
  ctx.stroke()
  ctx.fillStyle = shade('#8d6e63', 1)
  ctx.fillRect(x + 12, y - 3, 6, 6)
  ctx.strokeRect(x + 12, y - 3, 6, 6)
}

function drawFountain(x, y) {
  drawShadow(x, y + 12, 28)
  // Outer stone ring
  ctx.fillStyle = shade('#9e9e9e', 1)
  ctx.beginPath(); ctx.ellipse(x, y, 26, 14, 0, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.stroke()
  // Stone texture
  ctx.strokeStyle = shade('#616161', 1); ctx.lineWidth = 0.6
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x + Math.cos(a) * 22, y + Math.sin(a) * 11)
    ctx.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 14)
    ctx.stroke()
  }
  // Water
  ctx.fillStyle = shade('#29b6f6', 1)
  ctx.beginPath(); ctx.ellipse(x, y - 2, 20, 10, 0, 0, Math.PI * 2); ctx.fill()
  // Water shimmer
  const shim = Math.sin(frame * 0.05) * 1
  ctx.strokeStyle = withAlpha('#ffffff', 0.4)
  ctx.lineWidth = 0.8
  ctx.beginPath(); ctx.moveTo(x - 12, y - 2 + shim); ctx.lineTo(x + 12, y - 2 + shim); ctx.stroke()

  // Center pillar
  ctx.fillStyle = shade('#757575', 1)
  ctx.fillRect(x - 3, y - 18, 6, 16)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1
  ctx.strokeRect(x - 3, y - 18, 6, 16)
  // Top bowl
  ctx.fillStyle = shade('#bdbdbd', 1)
  ctx.beginPath(); ctx.ellipse(x, y - 18, 8, 3, 0, 0, Math.PI * 2); ctx.fill()
  ctx.stroke()
  // Water jet
  ctx.fillStyle = withAlpha('#4fc3f7', 0.7)
  ctx.beginPath()
  ctx.moveTo(x - 2, y - 18)
  ctx.quadraticCurveTo(x, y - 28 - Math.abs(Math.sin(frame * 0.1)) * 3, x + 2, y - 18)
  ctx.closePath()
  ctx.fill()
  // Droplets
  for (let i = 0; i < 4; i++) {
    const t = (frame * 0.03 + i * 0.25) % 1
    const dx = Math.sin(frame * 0.05 + i) * 5
    ctx.fillStyle = withAlpha('#4fc3f7', 1 - t)
    ctx.beginPath()
    ctx.arc(x + dx, y - 18 + t * 16, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

// ============================================================================
// CHARACTERS — Unique sprite designs for Mira, Tomas, Elyas
// ============================================================================
function drawCharacter(agent) {
  const outfit = OUTFITS[agent.name] || OUTFITS.Mira
  const { x, y } = agent
  const S = 1.3  // scale factor
  const isWalking = agent.action && agent.action.includes('walk')
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
  const skin = shade(outfit.skin, 1)
  const skinDk = shade(outfit.skin, 0.8)
  const shirt = shade(outfit.shirt, 1)
  const shirtDk = shade(outfit.shirtDk, 1)
  const pants = shade(outfit.pants, 1)
  const pantsDk = shade(outfit.pantsDk, 1)
  const hair = shade(outfit.hair, 1)

  // Legs
  ctx.fillStyle = pantsDk
  ctx.fillRect(x - 4*S, baseY - 9*S, 3.5*S, 9*S + legSwing)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  ctx.strokeRect(x - 4*S, baseY - 9*S, 3.5*S, 9*S + legSwing)
  ctx.fillRect(x + 0.5*S, baseY - 9*S, 3.5*S, 9*S - legSwing)
  ctx.strokeRect(x + 0.5*S, baseY - 9*S, 3.5*S, 9*S - legSwing)
  // Shoes
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
    ctx.fillStyle = shade(outfit.accessoryColor, 1)
    ctx.fillRect(x - 7*S, baseY - 13*S, 5*S, 6*S)
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S
    ctx.strokeRect(x - 7*S, baseY - 13*S, 5*S, 6*S)
    // Strap
    ctx.strokeStyle = shade(outfit.accessoryColor, 0.8); ctx.lineWidth = 1.5*S
    ctx.beginPath(); ctx.moveTo(x - 5*S, baseY - 17*S); ctx.lineTo(x - 3*S, baseY - 13*S); ctx.stroke()
  } else if (outfit.accessory === 'chainmail') {
    ctx.fillStyle = shade(outfit.accessoryColor, 0.9)
    ctx.fillRect(x - 5*S, baseY - 17*S, 10*S, 11*S)
    ctx.strokeStyle = shade('#616161', 1); ctx.lineWidth = 0.4*S
    for (let i = 0; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x - 5*S, baseY - 15*S + i*2.5*S); ctx.lineTo(x + 5*S, baseY - 15*S + i*2.5*S); ctx.stroke()
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.moveTo(x - 5*S + i*2.5*S, baseY - 17*S); ctx.lineTo(x - 5*S + i*2.5*S, baseY - 6*S); ctx.stroke()
    }
  } else if (outfit.accessory === 'cape') {
    ctx.fillStyle = shade(outfit.accessoryColor, 1)
    ctx.beginPath()
    ctx.moveTo(x - 5*S, baseY - 17*S)
    ctx.lineTo(x - 7*S, baseY - 6*S)
    ctx.lineTo(x + 7*S, baseY - 6*S)
    ctx.lineTo(x + 5*S, baseY - 17*S)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.8*S
    ctx.stroke()
  }

  // Belt
  ctx.fillStyle = '#3e2723'
  ctx.fillRect(x - 5*S, baseY - 8*S, 10*S, 1.8*S)
  ctx.fillStyle = GOLD
  ctx.fillRect(x - 1*S, baseY - 8*S, 2*S, 1.8*S)

  // Front arm
  ctx.fillStyle = shirt
  ctx.fillRect(x + 2.5*S, baseY - 17*S - armSwing, 3.5*S, 8*S)
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  ctx.strokeRect(x + 2.5*S, baseY - 17*S - armSwing, 3.5*S, 8*S)
  ctx.fillStyle = skin
  ctx.beginPath(); ctx.arc(x + 4.2*S, baseY - 9*S - armSwing, 1.8*S, 0, Math.PI*2); ctx.fill()

  // Tool
  if (outfit.tool) drawTool(outfit.tool, x, baseY, frame, S)

  // Head (big, cartoonish)
  const headR = 7.5 * S
  const headY = baseY - 24 * S
  ctx.fillStyle = skin
  ctx.beginPath(); ctx.arc(x, headY, headR, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.3*S; ctx.stroke()

  // Eyes
  const faceDir = 1
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.ellipse(x + 2*S, headY - 0.5*S, 2*S, 2.3*S, 0, 0, Math.PI*2); ctx.fill()
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.7*S; ctx.stroke()
  ctx.beginPath(); ctx.ellipse(x + 5*S, headY - 0.5*S, 2*S, 2.3*S, 0, 0, Math.PI*2); ctx.fill()
  ctx.stroke()
  // Pupils
  ctx.fillStyle = '#212121'
  ctx.beginPath(); ctx.arc(x + 2*S, headY, 1.1*S, 0, Math.PI*2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 5*S, headY, 1.1*S, 0, Math.PI*2); ctx.fill()
  // Highlights
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
    ctx.arc(x + 3.5*S, headY + 2*S, 2*S, 0.2, Math.PI - 0.2) // smile
  }
  ctx.stroke()

  // Beard (Tomas)
  if (outfit.beard) {
    ctx.fillStyle = hair
    ctx.beginPath()
    ctx.ellipse(x + 3.5*S, headY + 4*S, 3.5*S, 2.2*S, 0, 0, Math.PI)
    ctx.fill()
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 0.6*S; ctx.stroke()
  }

  // Hat / Hair
  drawHat(outfit.hat, outfit.hatColor || hair, x, headY, hair, faceDir, S)

  // Status indicators
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

  // Name label
  ctx.font = `bold ${10*S}px Inter, sans-serif`
  ctx.textAlign = 'center'
  const nameW = ctx.measureText(agent.name).width + 8
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  roundRect(x - nameW/2, headY - 20*S, nameW, 12, 4)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(agent.name, x, headY - 11.5*S)

  // Chat bubble
  const bubble = bubbles[agent.name]
  if (bubble && Date.now() < bubble.until) {
    drawBubble(x, headY - 26*S, bubble.text)
  }
}

function drawHat(hat, hatColor, x, headY, hair, faceDir, S) {
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1*S
  if (hat === 'band') {
    // Mira — headband
    ctx.fillStyle = hair
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    ctx.fillStyle = shade(hatColor, 1)
    ctx.fillRect(x - 8*S, headY - 3*S, 16*S, 2.5*S)
    ctx.strokeRect(x - 8*S, headY - 3*S, 16*S, 2.5*S)
    // Headband knot
    ctx.fillStyle = shade(hatColor, 1)
    ctx.beginPath()
    ctx.moveTo(x + 7*S, headY - 2*S)
    ctx.lineTo(x + 10*S, headY - 4*S)
    ctx.lineTo(x + 9*S, headY)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
  } else if (hat === 'helm') {
    // Tomas — metal helmet with spike
    ctx.fillStyle = shade('#9e9e9e', 1)
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8.5*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    // Helmet rim
    ctx.fillStyle = shade('#616161', 1)
    ctx.fillRect(x - 9*S, headY - 2*S, 18*S, 2*S)
    ctx.strokeRect(x - 9*S, headY - 2*S, 18*S, 2*S)
    // Spike
    ctx.fillStyle = shade('#bdbdbd', 1)
    ctx.beginPath()
    ctx.moveTo(x - 2*S, headY - 9*S)
    ctx.lineTo(x, headY - 14*S)
    ctx.lineTo(x + 2*S, headY - 9*S)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
    // Helmet shine
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.beginPath(); ctx.arc(x - 3*S, headY - 5*S, 2*S, 0, Math.PI*2); ctx.fill()
  } else if (hat === 'feather') {
    // Elyas — feathered cap
    ctx.fillStyle = hair
    ctx.beginPath(); ctx.arc(x, headY - 1*S, 8.5*S, Math.PI, 0); ctx.fill(); ctx.stroke()
    // Brim
    ctx.fillStyle = shade(hatColor, 1)
    ctx.beginPath(); ctx.ellipse(x, headY - 4*S, 10*S, 2.5*S, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke()
    // Feather
    ctx.fillStyle = shade('#e91e63', 1)
    ctx.beginPath()
    ctx.moveTo(x + 7*S, headY - 6*S)
    ctx.quadraticCurveTo(x + 14*S, headY - 16*S, x + 12*S, headY - 18*S)
    ctx.quadraticCurveTo(x + 8*S, headY - 10*S, x + 6*S, headY - 5*S)
    ctx.closePath()
    ctx.fill(); ctx.stroke()
    // Feather detail line
    ctx.strokeStyle = shade('#880e4f', 1); ctx.lineWidth = 0.5*S
    ctx.beginPath(); ctx.moveTo(x + 7*S, headY - 7*S); ctx.lineTo(x + 11*S, headY - 14*S); ctx.stroke()
  }
}

function drawTool(tool, x, baseY, frame, S) {
  const OUT = OUTLINE
  ctx.strokeStyle = OUT; ctx.lineWidth = 0.8*S
  switch (tool) {
    case 'maps':
      // Rolled maps in hand
      ctx.fillStyle = shade('#d4a043', 1)
      ctx.beginPath(); ctx.ellipse(x + 7*S, baseY - 11*S, 3*S, 4*S, 0.3, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.8*S; ctx.stroke()
      // Map end
      ctx.fillStyle = shade('#c89c5e', 1)
      ctx.beginPath(); ctx.ellipse(x + 9*S, baseY - 13*S, 1.5*S, 2*S, 0.3, 0, Math.PI*2); ctx.fill()
      ctx.stroke()
      // String tie
      ctx.strokeStyle = shade('#8d6e63', 1); ctx.lineWidth = 0.6*S
      ctx.beginPath(); ctx.moveTo(x + 6*S, baseY - 11*S); ctx.lineTo(x + 8*S, baseY - 10*S); ctx.stroke()
      break
    case 'spear':
      // Spear in right hand
      ctx.strokeStyle = shade('#5d4037', 1); ctx.lineWidth = 2*S
      ctx.beginPath(); ctx.moveTo(x + 5*S, baseY - 5*S); ctx.lineTo(x + 5*S, baseY - 22*S); ctx.stroke()
      // Spear tip
      ctx.fillStyle = shade('#bdbdbd', 1)
      ctx.beginPath()
      ctx.moveTo(x + 4*S, baseY - 22*S)
      ctx.lineTo(x + 5*S, baseY - 28*S)
      ctx.lineTo(x + 6*S, baseY - 22*S)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.6*S; ctx.stroke()
      // Spear binding
      ctx.strokeStyle = shade('#3e2723', 1); ctx.lineWidth = 0.8*S
      ctx.beginPath(); ctx.moveTo(x + 4*S, baseY - 21*S); ctx.lineTo(x + 6*S, baseY - 21*S); ctx.stroke()
      break
    case 'lute':
      // Lute on back
      ctx.fillStyle = shade('#8d6e63', 1)
      ctx.beginPath(); ctx.ellipse(x + 6*S, baseY - 14*S, 3.5*S, 4.5*S, 0, 0, Math.PI*2); ctx.fill()
      ctx.strokeStyle = OUT; ctx.lineWidth = 0.8*S; ctx.stroke()
      // Sound hole
      ctx.fillStyle = shade('#3e2723', 1)
      ctx.beginPath(); ctx.arc(x + 6*S, baseY - 13*S, 1.2*S, 0, Math.PI*2); ctx.fill()
      // Neck
      ctx.fillStyle = shade('#5d4037', 1)
      ctx.fillRect(x + 5.5*S, baseY - 21*S, 2*S, 7*S)
      ctx.strokeRect(x + 5.5*S, baseY - 21*S, 2*S, 7*S)
      // Strings
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.3*S
      ctx.beginPath(); ctx.moveTo(x + 6*S, baseY - 21*S); ctx.lineTo(x + 6*S, baseY - 12*S); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(x + 7*S, baseY - 21*S); ctx.lineTo(x + 7*S, baseY - 12*S); ctx.stroke()
      break
  }
}

function drawBubble(x, y, text) {
  ctx.font = '12px Inter, sans-serif'
  const padding = 8
  const maxW = 180
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxW - padding * 2 && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)

  const lineH = 16
  const bw = Math.min(maxW, Math.max(...lines.map(l => ctx.measureText(l).width)) + padding * 2)
  const bh = lines.length * lineH + padding
  const bx = x - bw / 2
  const by = y - bh

  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.2
  roundRect(bx, by, bw, bh, 8)
  ctx.fill(); ctx.stroke()

  // Tail
  ctx.beginPath()
  ctx.moveTo(x - 5, by + bh)
  ctx.lineTo(x, by + bh + 8)
  ctx.lineTo(x + 5, by + bh)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,255,255,0.97)'
  ctx.fill()
  ctx.strokeStyle = OUTLINE
  ctx.stroke()

  ctx.fillStyle = '#222'
  ctx.textAlign = 'left'
  lines.forEach((l, i) => {
    ctx.fillText(l, bx + padding, by + padding + (i + 1) * lineH - 4)
  })
}

// ============================================================================
// MAIN RENDER LOOP
// ============================================================================
function render() {
  frame++
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)

  if (Object.keys(locations).length === 0) {
    // Loading state
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
    grad.addColorStop(0, '#64b5f6')
    grad.addColorStop(1, '#c8e6c9')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = 'rgba(0,0,0,0.7)'
    ctx.font = 'bold 20px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('Loading village...', CANVAS_W / 2, CANVAS_H / 2)
    requestAnimationFrame(render)
    return
  }

  drawBackground()

  // Draw locations
  for (const [name, loc] of Object.entries(locations)) {
    drawLocation(name, loc)
  }

  // Draw characters (sorted by y for depth)
  const sorted = [...agents].sort((a, b) => a.y - b.y)
  for (const agent of sorted) {
    drawCharacter(agent)
  }

  requestAnimationFrame(render)
}

// ============================================================================
// CLICK HANDLING
// ============================================================================
function getCanvasPos(e) {
  const rect = canvas.getBoundingClientRect()
  const scaleX = canvas.width / rect.width
  const scaleY = canvas.height / rect.height
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  }
}

function findClickedChar(x, y) {
  for (const agent of agents) {
    const dx = x - agent.x
    const dy = y - (agent.y - 15)
    if (Math.hypot(dx, dy) < 25) return agent.name
  }
  return null
}

canvas?.addEventListener('click', (e) => {
  const { x, y } = getCanvasPos(e)
  const name = findClickedChar(x, y)
  if (name) {
    selectedName = name
    openInspector(name)
    updateCardSelection()
  }
})

canvas?.addEventListener('mousemove', (e) => {
  const { x, y } = getCanvasPos(e)
  const name = findClickedChar(x, y)
  hoveredName = name
  canvas.style.cursor = name ? 'pointer' : 'default'
})

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
    } catch (err) {
      console.error('bad message', err)
    }
  })
}

function handleTick(state) {
  lastTick = state.tick
  document.getElementById('tickCount').textContent = `tick ${state.tick}`

  // Merge agent states
  agents = state.agents

  // Spawn bubbles for dialogue
  const now = Date.now()
  for (const a of state.agents) {
    if (a.dialogue) {
      bubbles[a.name] = { text: a.dialogue, until: now + 5000 }
    }
  }

  renderCharCards()
}

// ============================================================================
// CHARACTER STAT CARDS
// ============================================================================
function calcStats(name) {
  // Deterministic stats based on name hash
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i)
  hash = Math.abs(hash)
  const hp = 80 + (hash % 40)       // 80-120
  const atk = 12 + (hash % 18)      // 12-30
  const def = 6 + (hash % 14)       // 6-20
  return { hp, atk, def }
}

function renderCharCards() {
  const container = document.getElementById('charCards')
  document.getElementById('charCount').textContent = `${agents.length} villagers`
  container.innerHTML = agents.map(a => {
    const info = agentInfo[a.name] || {}
    const outfit = OUTFITS[a.name] || {}
    const stats = calcStats(a.name)
    const role = outfit.role || info.persona?.split(' ').slice(0, 2).join(' ') || 'Villager'
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
        <div class="char-status">${a.action === 'wait' ? 'waiting' : a.action} @ ${a.location}</div>
      </div>
    `
  }).join('')

  // Click handlers
  container.querySelectorAll('.char-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedName = card.dataset.name
      openInspector(selectedName)
      updateCardSelection()
    })
  })
}

function updateCardSelection() {
  document.querySelectorAll('.char-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.name === selectedName)
  })
}

// ============================================================================
// INSPECTOR PANEL
// ============================================================================
function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str || ''
  return div.innerHTML
}

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
  const outfit = OUTFITS[data.name] || {}
  const stats = calcStats(data.name)
  const role = outfit.role || 'Villager'
  const color = agentInfo[data.name]?.color || '#888'

  const memoriesHtml = data.memories.length
    ? data.memories.map(m => `
        <li class="memory memory-${escapeHtml(m.type)}">
          <span class="memory-type">${escapeHtml(m.type)}</span>
          <span>${escapeHtml(m.content)}</span>
        </li>
      `).join('')
    : '<li class="memory" style="border-left-color:#555"><span>No memories yet.</span></li>'

  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div class="char-avatar" style="width:40px;height:40px;font-size:18px;background:${color}">${data.name[0]}</div>
      <div>
        <h2>${escapeHtml(data.name)}</h2>
        <div class="role">${escapeHtml(role)}</div>
      </div>
    </div>
    <p class="persona">"${escapeHtml(data.persona)}"</p>
    <div class="stat-boxes">
      <div class="stat-box hp">
        <div class="icon">♥</div>
        <div class="label">HP</div>
        <div class="value">${stats.hp}</div>
      </div>
      <div class="stat-box atk">
        <div class="icon">⚔</div>
        <div class="label">ATK</div>
        <div class="value">${stats.atk}</div>
      </div>
      <div class="stat-box def">
        <div class="icon">🛡</div>
        <div class="label">DEF</div>
        <div class="value">${stats.def}</div>
      </div>
    </div>
    <div class="section-label">Currently at</div>
    <div class="plan-box">${escapeHtml(data.location)}</div>
    <div class="section-label">Current plan</div>
    <div class="plan-box">${escapeHtml(data.plan)}</div>
    <div class="section-label">Recent memories</div>
    <ul class="memories">${memoriesHtml}</ul>
  `
}

// ============================================================================
// INIT
// ============================================================================
window.addEventListener('DOMContentLoaded', async () => {
  canvas = document.getElementById('gameCanvas')
  ctx = canvas.getContext('2d')

  // Fetch locations
  try {
    const res = await fetch('/api/locations')
    locations = await res.json()
  } catch (err) {
    console.error('failed to load locations', err)
  }

  // Fetch agent info
  try {
    const res = await fetch('/api/agents')
    const list = await res.json()
    agentInfo = {}
    for (const a of list) agentInfo[a.name] = a
  } catch (err) {
    console.error('failed to load agents', err)
  }

  // Start render loop
  render()

  // Connect WebSocket
  connectWebSocket()
})
