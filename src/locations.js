// Shared "source of truth" for the town's locations — coordinates match the
// canvas space in public/main.js (800x460). Both the LLM prompt (via
// agents.js) and the frontend (via GET /api/locations) read from this.
const LOCATIONS = {
  "Cartographer's Stall": { x: 200, y: 350, description: "Mira's stall of hand-drawn maps and charts" },
  'The Watchtower': { x: 600, y: 150, description: 'where Tomas keeps watch over the town' },
  'The Weary Boar': { x: 600, y: 400, description: 'a modest tavern where travelers rest and trade rumors' },
  'Market Row': { x: 350, y: 200, description: 'stalls of grain, cloth, and trinkets' },
  'The Old Well': { x: 400, y: 350, description: 'the stone well at the heart of the square' },
};

module.exports = { LOCATIONS };