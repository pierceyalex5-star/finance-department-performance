CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_hold','done','archived')),
  with_people text[] DEFAULT ARRAY[]::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workspace_id,name)
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','waiting','done','cancelled')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  due_at timestamptz,
  waiting_on text,
  owner_name text,
  follow_up_at timestamptz,
  eisenhower_quadrant text,
  with_people text[] DEFAULT ARRAY[]::text[],
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_due ON tasks(workspace_id,status,due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);

-- Idempotent upgrade path for existing My Work databases.
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS eisenhower_quadrant text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS with_people text[] DEFAULT ARRAY[]::text[];
ALTER TABLE projects ADD COLUMN IF NOT EXISTS with_people text[] DEFAULT ARRAY[]::text[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_name text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS follow_up_at timestamptz;

CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'note' CHECK (kind IN ('note','decision','meeting_note','assumption')),
  title text,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'chat',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notes_project ON notes(project_id);

CREATE TABLE IF NOT EXISTS memory_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  memory_type text NOT NULL DEFAULT 'context',
  title text,
  body text NOT NULL,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  source_type text NOT NULL DEFAULT 'chat',
  source_ref text,
  occurred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_memory_project ON memory_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_memory_search ON memory_entries USING GIN (to_tsvector('simple', coalesce(title,'') || ' ' || body));

CREATE TABLE IF NOT EXISTS chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_workspace_created ON chat_messages(workspace_id,created_at DESC);

CREATE TABLE IF NOT EXISTS activity_log (
  id bigserial PRIMARY KEY,
  workspace_id text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  action text NOT NULL,
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_workspace_created ON activity_log(workspace_id,created_at DESC);
