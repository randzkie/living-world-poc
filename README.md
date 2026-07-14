# Living World — Medieval Town Edition

Same three characters, same Postgres+pgvector memory, reflection, and location-scoped perception — reskinned as a real medieval town, not just visually but in the world itself:

- **Named medieval locations** — Cartographer's Stall, The Watchtower, The Weary Boar (tavern), Market Row, The Old Well. These are the actual strings the LLM sees and reasons about, not just labels on the map.
- **Illuminated-manuscript theme** — aged parchment, heraldic wine-red and forest-green, gold leaf, Cinzel for display/headers, Spectral for body text. No external art assets — location icons (watchtower with pennant, tavern with a hanging sign, market awning, well, cartographer's stall) are drawn with Phaser graphics primitives.
- **Worn paths** — dirt roads radiating from the well to each location, drawn under the map (cheap way to make the layout read as a real town instead of floating icons).
- **Flickering torch** at the Watchtower — an organic, randomized flicker (chained short tweens with jittered targets) instead of a mechanical pulse.
- **Village Chronicle** and **Townsfolk roster** — unchanged in function from the previous pass, just reskinned to match.

Design process followed the `frontend-design` skill (brainstorm a token system, self-critique against generic-AI-design defaults, then build) and pulled a couple of practical ideas from a `game-engine` skill reference — procedural "tilemap-style" ground texture instead of a flat rectangle, and a pre-ship troubleshooting pass (canvas-blank checks, syntax validation, real-server testing) before calling it done.

## Troubleshooting

**"database does not exist" or "relation does not exist" on first run:** almost always means Postgres initialized before this project's `schema.sql` could run — usually a leftover Docker volume from an earlier attempt. Fix: `npm run db:reset`.

**If that keeps happening, check for a port conflict.** If you already have a local PostgreSQL installed on your machine (e.g. visible in pgAdmin as its own server), it's probably bound to the default port 5432 — and Docker's Postgres container can silently fail to claim that port, meaning your app (and pgAdmin) end up talking to your *existing* local Postgres instead of the Docker one. That local install won't have the `vector` extension, which is exactly the `extension "vector" is not available` error. This project's `docker-compose.yml` already maps to host port **5433** instead of 5432 specifically to avoid this — if you edited it back to 5432 and have a local Postgres running, that's the likely cause. Keep it on 5433 (matches `DATABASE_URL` in `.env.example`), or check `docker compose logs postgres` / `docker compose ps` to confirm the container is actually up.

## Setup

```bash
npm install
cp .env.example .env
```

**1. Start Postgres locally** (requires Docker Desktop or Docker Engine running):

```bash
npm run db:up
```

This starts a local Postgres with the pgvector extension and auto-loads `db/schema.sql` on first run. To stop it later: `npm run db:down` (data persists in a Docker volume; use `docker compose down -v` to wipe it).

**2. Get your Cloudflare credentials** (same as Phase 1):
1. Cloudflare dashboard → **Workers AI** → **Use REST API**
2. **Create Workers AI API Token** → copy it
3. Copy your **Account ID** from the same page

Open `.env` and fill in `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. `DATABASE_URL` is already set to match the Docker Compose Postgres — no changes needed unless you customized `docker-compose.yml`.

## Run

```bash
npm start
```

Then open **http://localhost:3000** in your browser. The simulation runs continuously by default (set `TICKS` in `.env` to a number if you want it to stop after N ticks — the viewer keeps running either way, so you can still look around). Press Ctrl+C in the terminal to stop the server.

Run it again later — same names, same memory, same browser URL.

## What to look at

- `src/locations.js` — the single source of truth for the town's locations, shared by the LLM prompt and the frontend (via `/api/locations`).
- `src/world.js` — `getAgentsAt` and `formatRecentEventsAt` are the actual perception boundary now: events are filtered by location, not just by "not yours."
- `src/agents.js` — `buildPrompt` lists valid locations and current location; `act()` validates `move` targets against `LOCATIONS` and falls back to `wait` on an invalid destination instead of teleporting.
- `src/memoryStore.js` — the recency + importance + relevance blend, and the reflection-pacing logic (`countSinceLastReflection`).
- `src/reflection.js` — the reflection prompt itself, and how insights get saved back as a new memory type.
- `src/db.js` — Postgres connection and the `ensureAgent` upsert that makes memory persist across runs.
- `src/server.js` — Express + WebSocket server: static files, `/api/locations`, `/api/agents/:name/memories`, and `broadcast()`.
- `src/index.js` — the tick loop; agent canvas position now comes directly from `LOCATIONS[agent.location]`, no more random jitter.
- `public/main.js` — the Phaser scene (fetches `/api/locations` on load and draws original icon markers per location), Village Chronicle feed logic, character roster rendering, WebSocket client, and inspector panel rendering.
- `db/schema.sql` — the actual table/index definitions, auto-loaded by Docker on first run.

## Customize

- Edit `src/locations.js` to add/move/rename locations — coordinates are shared automatically with the frontend, no need to touch `public/main.js` unless you want a custom icon shape for a new location name (see `drawLocationMarker`).
- Edit `AGENT_SETUP` in `src/index.js` to change personas, home locations, or colors. New agent names get their own fresh row (and fresh memory) in Postgres automatically.
- Change `CLOUDFLARE_MODEL` in `.env` for a different chat model; change `CLOUDFLARE_EMBED_MODEL` for a different embedding model — but if you do, update the `VECTOR(768)` dimension in `db/schema.sql` to match, then re-run `npm run db:reset` to rebuild the table with the new dimension.
- `REFLECTION_EVERY` controls how many memories accumulate before a character pauses to reflect. Lower = more frequent reflection = more LLM calls.
- `TICKS` (0 = run forever) and `TICK_DELAY_MS` control simulation length and pacing.
- `PORT` in `.env` changes which port the viewer runs on (default 3000).

## Cost/latency note

Each tick now does roughly: 1 embedding call (situation → relevant memories) + 1 chat call (decision) + 1 embedding call (storing the new memory) per agent, plus occasional reflection calls. If you're hitting rate limits often, raise `TICK_DELAY_MS` or `REFLECTION_EVERY`.

## Known limits (still not done)

- Movement resolves instantly (an agent teleports to the new location logically the moment it decides to move; the canvas just tweens smoothly over ~1.4s for visual polish) — there's no "in transit for N ticks" travel time yet.
- Only 5 fixed locations, no pathfinding around obstacles — it's a location graph, not a real tilemap.
- Importance scoring is a fixed heuristic by memory type, not LLM-rated per memory (kept it cheap on purpose — see architecture doc §6).
- The Phaser rendering itself couldn't be tested end-to-end in a real browser during development (sandbox has no browser) — the backend (server, WebSocket broadcast including the `location` field, REST API, move validation) was verified against a real Postgres instance and a real WebSocket client, but give the visuals a look and flag anything that looks off.

## History (earlier phases, kept for reference)

- Confirmed the core Phase 2 goal across two `npm start` runs back to back: characters referenced things from the *previous* run (Elyas's "heading back before nightfall" callback), memory genuinely persisted in Postgres. Reflection quality was strong and persona-consistent (Tomas's loneliness theme).
- But two new repetition patterns showed up: (1) an agent could revert to an *older* line from several ticks back and slip past the anti-repeat check, since it only compared against the single most recent memory — fixed by showing the last 4 own lines instead of 1; (2) the reflection step repeated near-identical insights across separate reflection cycles, since it had no visibility into what it already reflected on — fixed by showing it the last 5 reflections and telling it not to restate them.
- Broader takeaway: persistence means more accumulated history for the model to potentially echo verbatim over time. If verbatim repetition is still noticeable after these fixes, it's likely the `llama-3.1-8b-instruct` capability ceiling rather than a prompt issue — a larger Workers AI model should reduce it further.

- With `llama-3.1-8b-instruct`, agents sometimes repeated the *exact same line* multiple ticks in a row (Tomas: "Another long night ahead..." x4), even though their `plan` field kept advancing. A smaller model apparently doesn't reliably use its own recent memory to avoid restating itself.
- Fixed by putting the agent's literal last action at the top of its prompt with an explicit "don't repeat this" instruction, instead of relying on it being buried inside the general memory list.
- If repetition is still noticeable after this fix, it's likely a model-capability ceiling rather than a prompt problem — try a larger Workers AI model from the catalog (bigger models are generally better at avoiding this, at the cost of speed/price).

## Notes on switching to Cloudflare Workers AI

- Swapped `src/openrouter.js` for `src/llm.js`, calling `POST /accounts/{account_id}/ai/run/@cf/{model}` directly. Same retry-on-429 and defensive JSON parsing carried over from the OpenRouter version.
- Response shape differs from OpenRouter: Workers AI wraps text under `result.response` instead of `choices[0].message.content`. `llm.js` handles that, with a fallback to the OpenAI-shaped form in case a given model/endpoint returns it that way instead.
- No more `reasoning`-field-instead-of-`content` issue (that was specific to OpenRouter's gpt-oss routing) — but if you swap in a different Workers AI model and see empty responses, check the raw error message logged; it includes the full response body.

## Notes on the 3-character version

- Added Elyas (traveling bard, collects rumors) alongside Mira and Tomas — a character with a different agenda, to see whether the world naturally spreads across topics instead of everyone getting pulled into the same thread.
- Widened the perception/memory windows (5 → 8/6) since with 3 agents the shared event log fills up nearly twice as fast.
- 3 agents × 1 call each per tick = 50% more OpenRouter calls per tick than before. Expect more 429s on free models — the retry-with-backoff in `openrouter.js` should absorb most of them, but you can also raise `TICK_DELAY_MS` in `.env` if it's still getting rate-limited a lot.

## Notes from the first real run (OpenRouter phase, kept for history)

- `openai/gpt-oss-120b:free` got upstream rate-limited fast; `openai/gpt-oss-20b:free` ran cleanly. Free-model availability rotates, so if your default gets rate-limited or retired, try `openrouter/free` (auto-picks whatever's currently available) or a different `:free` slug.
- gpt-oss sometimes puts its answer in a hidden `reasoning` field instead of `content`, especially if it runs out of tokens mid-thought. Fixed by raising `max_tokens` and falling back to `reasoning` when `content` is empty.
- Occasional garbled characters in dialogue (stray non-English tokens) are a quality artifact of free/quantized models under load, not a bug in this code. Switch to a paid model slug if you want cleaner prose.