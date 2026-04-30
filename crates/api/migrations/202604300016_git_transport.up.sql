CREATE TABLE repository_git_storage (
    repository_id uuid PRIMARY KEY REFERENCES repositories(id) ON DELETE CASCADE,
    storage_kind text NOT NULL DEFAULT 'local_bare',
    storage_path text NOT NULL,
    last_materialized_commit_id uuid REFERENCES commits(id) ON DELETE SET NULL,
    last_materialized_at timestamptz,
    materialized_by text NOT NULL DEFAULT 'system',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_git_storage_kind_check CHECK (storage_kind IN ('local_bare', 's3_bare')),
    CONSTRAINT repository_git_storage_path_not_blank CHECK (length(trim(storage_path)) > 0)
);

CREATE INDEX repository_git_storage_last_materialized_commit_idx
ON repository_git_storage (last_materialized_commit_id);

CREATE TRIGGER repository_git_storage_set_updated_at
BEFORE UPDATE ON repository_git_storage
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
