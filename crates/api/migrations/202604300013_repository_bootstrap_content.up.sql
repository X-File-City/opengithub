CREATE TABLE repository_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    commit_id uuid NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    path text NOT NULL,
    content text NOT NULL,
    oid text NOT NULL,
    byte_size bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_files_path_not_blank CHECK (length(trim(path)) > 0),
    CONSTRAINT repository_files_oid_not_blank CHECK (length(trim(oid)) > 0),
    CONSTRAINT repository_files_byte_size_non_negative CHECK (byte_size >= 0)
);

CREATE UNIQUE INDEX repository_files_repo_path_unique
ON repository_files (repository_id, lower(path));

CREATE INDEX repository_files_repository_path_idx
ON repository_files (repository_id, path);

CREATE INDEX repository_files_commit_id_idx
ON repository_files (commit_id);
