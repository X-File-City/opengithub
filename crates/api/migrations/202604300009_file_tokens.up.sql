CREATE TABLE file_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NULL REFERENCES repositories(id) ON DELETE CASCADE,
    sha text NOT NULL,
    path text NOT NULL,
    language text NOT NULL,
    token_ranges bytea NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT file_tokens_sha_not_blank CHECK (length(trim(sha)) > 0),
    CONSTRAINT file_tokens_path_not_blank CHECK (length(trim(path)) > 0),
    CONSTRAINT file_tokens_language_not_blank CHECK (length(trim(language)) > 0)
);

CREATE UNIQUE INDEX file_tokens_lookup_unique
ON file_tokens (
    COALESCE(repository_id, '00000000-0000-0000-0000-000000000000'::uuid),
    sha,
    path,
    language
);

CREATE INDEX file_tokens_repository_path_idx
ON file_tokens (repository_id, path);

CREATE INDEX file_tokens_generated_at_idx
ON file_tokens (generated_at);
