CREATE TABLE personal_access_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    prefix text NOT NULL,
    token_hash text NOT NULL,
    scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
    last_used_at timestamptz,
    expires_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT personal_access_tokens_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT personal_access_tokens_prefix_not_blank CHECK (length(trim(prefix)) > 0),
    CONSTRAINT personal_access_tokens_hash_not_blank CHECK (length(trim(token_hash)) > 0)
);

CREATE UNIQUE INDEX personal_access_tokens_prefix_unique ON personal_access_tokens (prefix);
CREATE UNIQUE INDEX personal_access_tokens_hash_unique ON personal_access_tokens (token_hash);
CREATE INDEX personal_access_tokens_user_active_idx ON personal_access_tokens (user_id, revoked_at, expires_at);

CREATE TRIGGER personal_access_tokens_set_updated_at
BEFORE UPDATE ON personal_access_tokens
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE search_documents (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
    owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    owner_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    kind text NOT NULL,
    resource_id text NOT NULL,
    title text NOT NULL,
    body text NOT NULL DEFAULT '',
    path text,
    language text,
    branch text,
    visibility text NOT NULL DEFAULT 'private',
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A')
        || setweight(to_tsvector('simple', coalesce(path, '')), 'B')
        || setweight(to_tsvector('simple', coalesce(body, '')), 'C')
    ) STORED,
    indexed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT search_documents_owner_matches_visibility CHECK (
        repository_id IS NOT NULL
        OR owner_user_id IS NOT NULL
        OR owner_organization_id IS NOT NULL
    ),
    CONSTRAINT search_documents_kind_check CHECK (
        kind IN ('repository', 'code', 'commit', 'issue', 'pull_request', 'user', 'organization', 'package')
    ),
    CONSTRAINT search_documents_resource_not_blank CHECK (length(trim(resource_id)) > 0),
    CONSTRAINT search_documents_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT search_documents_visibility_check CHECK (visibility IN ('public', 'private', 'internal'))
);

CREATE UNIQUE INDEX search_documents_kind_resource_unique ON search_documents (kind, resource_id);
CREATE INDEX search_documents_repository_kind_updated_idx ON search_documents (repository_id, kind, updated_at DESC);
CREATE INDEX search_documents_owner_user_idx ON search_documents (owner_user_id);
CREATE INDEX search_documents_owner_organization_idx ON search_documents (owner_organization_id);
CREATE INDEX search_documents_visibility_idx ON search_documents (visibility);
CREATE INDEX search_documents_search_vector_idx ON search_documents USING gin (search_vector);
CREATE INDEX search_documents_title_trgm_idx ON search_documents USING gin (title gin_trgm_ops);
CREATE INDEX search_documents_body_trgm_idx ON search_documents USING gin (body gin_trgm_ops);
CREATE INDEX search_documents_path_trgm_idx ON search_documents USING gin (path gin_trgm_ops);

CREATE TRIGGER search_documents_set_updated_at
BEFORE UPDATE ON search_documents
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE api_request_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id text,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    method text NOT NULL,
    path text NOT NULL,
    status integer NOT NULL,
    duration_ms integer NOT NULL,
    user_agent text,
    ip_address inet,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    retention_expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT api_request_logs_method_not_blank CHECK (length(trim(method)) > 0),
    CONSTRAINT api_request_logs_path_not_blank CHECK (length(trim(path)) > 0),
    CONSTRAINT api_request_logs_status_check CHECK (status >= 100 AND status <= 599),
    CONSTRAINT api_request_logs_duration_non_negative CHECK (duration_ms >= 0)
);

CREATE INDEX api_request_logs_created_at_idx ON api_request_logs (created_at DESC);
CREATE INDEX api_request_logs_actor_created_idx ON api_request_logs (actor_user_id, created_at DESC);
CREATE INDEX api_request_logs_path_trgm_idx ON api_request_logs USING gin (path gin_trgm_ops);
CREATE INDEX api_request_logs_retention_idx ON api_request_logs (retention_expires_at);
