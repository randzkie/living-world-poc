// Shared "source of truth" for the town's locations — coordinates match the
// canvas space in public/main.js (800x500). Both the LLM prompt (via
// agents.js) and the frontend (via GET /api/locations) read from this.
const LOCATIONS = {
  'Map Stand': { x: 200, y: 350, description: "Mira's stall of old maps" },
  'Guard Post': { x: 600, y: 150, description: "Tomas's watch post" },
  Tavern: { x: 600, y: 400, description: 'a small tavern where travelers rest' },
  Market: { x: 350, y: 200, description: 'the town market stalls' },
  Fountain: { x: 400, y: 350, description: "the stone fountain at the square's center" },
};

module.exports = { LOCATIONS };