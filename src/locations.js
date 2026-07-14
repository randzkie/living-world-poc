/**
 * Updated locations.js — bigger world (2000x1400) with 8 unique locations.
 * Each location has its own identity and description.
 * Replace src/locations.js with this file.
 *
 * Coordinates match the new world size in public/main.js (WORLD_W=2000, WORLD_H=1400).
 * The frontend auto-scales coordinates from the old 800x500 space, but for new
 * characters to roam freely, use these bigger coordinates.
 */

const LOCATIONS = {
  'Map Stand':   { x: 500,  y: 900,  description: "Mira's stall of old maps and scrolls" },
  'Guard Post':  { x: 1500, y: 400,  description: "Tomas's watch post at the north gate" },
  'Tavern':      { x: 1500, y: 1000, description: 'The Brass Drum tavern where travelers rest' },
  'Market':      { x: 900,  y: 500,  description: 'the bustling town market stalls' },
  'Fountain':    { x: 1000, y: 900,  description: "the stone fountain at the square's center" },
  'Apothecary':  { x: 400,  y: 400,  description: "Sable's shop of potions and herbs" },
  'Blacksmith':  { x: 1600, y: 700,  description: "Thorne's forge near the east gate" },
  'Farm':        { x: 500,  y: 1100, description: "Wren's wheat fields at the south edge" },
}

module.exports = { LOCATIONS }
