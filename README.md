# Living World — Phase 2: Persistent Memory + Reflection

Same three characters as Phase 1 (Mira, Tomas, Elyas), now with:
- **Persistent memory** in Postgres + pgvector — memory survives across runs, since each character's DB row is looked up by name
- **Blended retrieval** — recall isn't just "last 5 things," it blends recency, importance, and semantic relevance to the current situation
- **Reflection** — every few memories, a character pauses to write 1-3 higher-level insights about what it's learned, which become memories themselves. This is what stops the exact-repeat loops seen in Phase 1.

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

Run it again later — same names, same memory. That persistence is the whole point of Phase 2. Watch the console for lines like `[Elyas reflects: ...]` — that's the reflection step firing.

## What to look at

- `src/agents.js` — `buildPrompt` is still the "senses" boundary, now pulling from Postgres instead of a RAM array. It fetches the literal last action separately (for the anti-repetition check) plus a blended set of recent/important/relevant memories.
- `src/memoryStore.js` — the recency + importance + relevance blend, and the reflection-pacing logic (`countSinceLastReflection`).
- `src/reflection.js` — the reflection prompt itself, and how insights get saved back as a new memory type.
- `src/db.js` — Postgres connection and the `ensureAgent` upsert that makes memory persist across runs.
- `db/schema.sql` — the actual table/index definitions, auto-loaded by Docker on first run.

## Customize

- Edit the `agents` array in `src/index.js` to change personas, add/remove characters, etc. New names get their own fresh row (and fresh memory) in Postgres automatically.
- Change `CLOUDFLARE_MODEL` in `.env` for a different chat model; change `CLOUDFLARE_EMBED_MODEL` for a different embedding model — but if you do, update the `VECTOR(768)` dimension in `db/schema.sql` to match, then re-run `npm run db:down && npm run db:up` to rebuild the table with the new dimension.
- `REFLECTION_EVERY` controls how many memories accumulate before a character pauses to reflect. Lower = more frequent reflection = more LLM calls.
- `TICKS` and `TICK_DELAY_MS` control simulation length and pacing.

## Cost/latency note

Each tick now does roughly: 1 embedding call (situation → relevant memories) + 1 chat call (decision) + 1 embedding call (storing the new memory) per agent, plus occasional reflection calls. That's about 3x the API calls of Phase 1. If you're hitting rate limits often, raise `TICK_DELAY_MS` or `REFLECTION_EVERY`.

## Known limits (Phase 2, still not done)

- No map or movement yet — one shared room (Phase 3 in the architecture doc).
- No frontend — still terminal only.
- Importance scoring is a fixed heuristic by memory type, not LLM-rated per memory (kept it cheap on purpose — see architecture doc §6).

## History (earlier phases, kept for reference)

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
