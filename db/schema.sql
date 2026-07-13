CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto; -- defensive: gen_random_uuid() is native in PG13+, but this costs nothing

CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  persona TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 768 dims matches @cf/baai/bge-base-en-v1.5. If you switch embedding models,
-- update this dimension to match, or inserts will fail.
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  type TEXT NOT NULL,          -- observation | action | dialogue | reflection
  content TEXT NOT NULL,
  importance SMALLINT NOT NULL DEFAULT 5,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS memories_agent_idx ON memories (agent_id);
CREATE INDEX IF NOT EXISTS memories_created_idx ON memories (created_at);
CREATE INDEX IF NOT EXISTS memories_embedding_idx
  ON memories USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
