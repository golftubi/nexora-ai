-- Nexora AI application tables.
-- Better Auth manages its own user, session, account and verification tables.
-- Run Better Auth's migration before applying this file.

CREATE TABLE IF NOT EXISTS organisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organisation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member','viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, user_id)
);

CREATE TABLE IF NOT EXISTS assistant_catalog (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  system_version integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  access_level text NOT NULL DEFAULT 'authenticated' CHECK (access_level IN ('public','authenticated','restricted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO assistant_catalog (id, name, description, access_level) VALUES
('general','General Intelligence','Everyday reasoning, planning and problem-solving','authenticated'),
('technology','Technology & Developer','Software engineering, code and technical systems','authenticated'),
('business','Business & Entrepreneurship','Strategy, operations and commercial decisions','authenticated'),
('research','Research & Documents','Research, analysis and structured documents','authenticated'),
('education','Education & Learning','Explanations, tutoring and skill development','authenticated'),
('security','Security & Intelligence','Restricted operational analysis workspace','restricted')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  assistant_id text NOT NULL REFERENCES assistant_catalog(id),
  title text NOT NULL DEFAULT 'New conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_user_updated_idx
  ON conversations (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant','system','tool')),
  content text NOT NULL,
  token_input integer,
  token_output integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_created_idx
  ON messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS usage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  assistant_id text NOT NULL REFERENCES assistant_catalog(id),
  provider text NOT NULL DEFAULT 'vercel-ai-gateway',
  model text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(12,6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS usage_records_user_created_idx
  ON usage_records (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES organisations(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs (created_at DESC);


-- Server-authorized Nexora administrators. Initial super-admins are bootstrapped
-- from NEXORA_ADMIN_EMAILS and then stored here for role/status management.
CREATE TABLE IF NOT EXISTS admin_users (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('super_admin','admin','support','analyst')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
