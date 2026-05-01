CREATE TABLE pull_request_commits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pull_request_id uuid NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    commit_id uuid NOT NULL REFERENCES commits(id) ON DELETE CASCADE,
    position bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_request_commits_position_non_negative CHECK (position >= 0)
);

CREATE UNIQUE INDEX pull_request_commits_pull_commit_unique
ON pull_request_commits (pull_request_id, commit_id);

CREATE INDEX pull_request_commits_pull_position_idx
ON pull_request_commits (pull_request_id, position);

CREATE TABLE pull_request_files (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pull_request_id uuid NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    path text NOT NULL,
    status text NOT NULL,
    additions bigint NOT NULL DEFAULT 0,
    deletions bigint NOT NULL DEFAULT 0,
    blob_oid text,
    byte_size bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_request_files_path_not_blank CHECK (length(trim(path)) > 0),
    CONSTRAINT pull_request_files_status_check CHECK (status IN ('added', 'modified', 'removed', 'renamed')),
    CONSTRAINT pull_request_files_additions_non_negative CHECK (additions >= 0),
    CONSTRAINT pull_request_files_deletions_non_negative CHECK (deletions >= 0),
    CONSTRAINT pull_request_files_byte_size_non_negative CHECK (byte_size >= 0)
);

CREATE UNIQUE INDEX pull_request_files_pull_path_unique
ON pull_request_files (pull_request_id, lower(path));

CREATE INDEX pull_request_files_pull_status_idx
ON pull_request_files (pull_request_id, status);
