CREATE TABLE issue_body_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    editor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body text NOT NULL DEFAULT '',
    version integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issue_body_versions_version_positive CHECK (version > 0)
);

CREATE UNIQUE INDEX issue_body_versions_issue_version_unique
ON issue_body_versions (issue_id, version);

CREATE INDEX issue_body_versions_issue_created_idx
ON issue_body_versions (issue_id, created_at DESC);

CREATE TABLE issue_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    uploader_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    file_name text NOT NULL,
    byte_size bigint NOT NULL DEFAULT 0,
    content_type text,
    storage_status text NOT NULL DEFAULT 'metadata_only',
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issue_attachments_file_name_not_blank CHECK (length(trim(file_name)) > 0),
    CONSTRAINT issue_attachments_byte_size_non_negative CHECK (byte_size >= 0),
    CONSTRAINT issue_attachments_storage_status_check CHECK (storage_status IN ('metadata_only', 'uploaded'))
);

CREATE INDEX issue_attachments_issue_created_idx
ON issue_attachments (issue_id, created_at DESC);
