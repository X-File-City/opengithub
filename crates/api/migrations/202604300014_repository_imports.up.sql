CREATE TABLE repository_imports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    requested_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    source_url text NOT NULL,
    source_host text NOT NULL,
    source_path text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    progress_message text NOT NULL DEFAULT 'Import request queued.',
    error_code text,
    error_message text,
    job_lease_id uuid REFERENCES job_leases(id) ON DELETE SET NULL,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_imports_source_url_not_blank CHECK (length(trim(source_url)) > 0),
    CONSTRAINT repository_imports_source_host_not_blank CHECK (length(trim(source_host)) > 0),
    CONSTRAINT repository_imports_source_path_not_blank CHECK (length(trim(source_path)) > 0),
    CONSTRAINT repository_imports_status_check CHECK (status IN ('queued', 'importing', 'imported', 'failed')),
    CONSTRAINT repository_imports_error_state_check CHECK (
        (status = 'failed' AND error_code IS NOT NULL AND error_message IS NOT NULL)
        OR (status <> 'failed' AND error_code IS NULL AND error_message IS NULL)
    )
);

CREATE INDEX repository_imports_repository_created_idx ON repository_imports (repository_id, created_at DESC);
CREATE INDEX repository_imports_requested_by_created_idx ON repository_imports (requested_by_user_id, created_at DESC);
CREATE INDEX repository_imports_status_created_idx ON repository_imports (status, created_at ASC);

CREATE TRIGGER repository_imports_set_updated_at
BEFORE UPDATE ON repository_imports
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE repository_import_credentials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    import_id uuid NOT NULL REFERENCES repository_imports(id) ON DELETE CASCADE,
    credential_kind text NOT NULL,
    username text,
    secret_ref text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_import_credentials_kind_check CHECK (credential_kind IN ('none', 'basic', 'token')),
    CONSTRAINT repository_import_credentials_secret_ref_not_plain CHECK (
        secret_ref IS NULL OR secret_ref ~ '^repo-import-secret-ref:[a-f0-9]{64}$'
    )
);

CREATE UNIQUE INDEX repository_import_credentials_import_unique ON repository_import_credentials (import_id);
