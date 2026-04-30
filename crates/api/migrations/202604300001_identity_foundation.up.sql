CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text UNIQUE,
    email text NOT NULL,
    display_name text,
    avatar_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT users_email_not_blank CHECK (length(trim(email)) > 0),
    CONSTRAINT users_username_not_blank CHECK (username IS NULL OR length(trim(username)) > 0)
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));
CREATE INDEX users_email_trgm_idx ON users USING gin (email gin_trgm_ops);
CREATE INDEX users_username_trgm_idx ON users USING gin (username gin_trgm_ops);

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE oauth_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider text NOT NULL,
    provider_user_id text NOT NULL,
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT oauth_accounts_provider_not_blank CHECK (length(trim(provider)) > 0),
    CONSTRAINT oauth_accounts_provider_user_id_not_blank CHECK (length(trim(provider_user_id)) > 0)
);

CREATE UNIQUE INDEX oauth_accounts_provider_subject_unique
ON oauth_accounts (provider, provider_user_id);
CREATE INDEX oauth_accounts_user_id_idx ON oauth_accounts (user_id);

CREATE TRIGGER oauth_accounts_set_updated_at
BEFORE UPDATE ON oauth_accounts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
    id text PRIMARY KEY,
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    data jsonb NOT NULL DEFAULT '{}'::jsonb,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    revoked_at timestamptz,
    CONSTRAINT sessions_id_not_blank CHECK (length(trim(id)) > 0)
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
CREATE INDEX sessions_active_idx ON sessions (user_id, expires_at)
WHERE revoked_at IS NULL;

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    target_type text,
    target_id text,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT audit_events_event_type_not_blank CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX audit_events_actor_user_id_idx ON audit_events (actor_user_id);
CREATE INDEX audit_events_event_type_idx ON audit_events (event_type);
CREATE INDEX audit_events_created_at_idx ON audit_events (created_at DESC);
