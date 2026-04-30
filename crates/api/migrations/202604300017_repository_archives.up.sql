CREATE TABLE repository_archives (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    ref_name text NOT NULL,
    target_oid text NOT NULL,
    format text NOT NULL,
    storage_key text NOT NULL,
    byte_size bigint NOT NULL DEFAULT 0,
    status text NOT NULL DEFAULT 'ready',
    created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_archives_ref_not_blank CHECK (length(trim(ref_name)) > 0),
    CONSTRAINT repository_archives_target_oid_not_blank CHECK (length(trim(target_oid)) > 0),
    CONSTRAINT repository_archives_format_check CHECK (format IN ('zip')),
    CONSTRAINT repository_archives_status_check CHECK (status IN ('ready', 'generating', 'failed')),
    CONSTRAINT repository_archives_storage_key_not_blank CHECK (length(trim(storage_key)) > 0),
    CONSTRAINT repository_archives_byte_size_nonnegative CHECK (byte_size >= 0)
);

CREATE UNIQUE INDEX repository_archives_reusable_identity_idx
ON repository_archives (repository_id, ref_name, target_oid, format);

CREATE INDEX repository_archives_repository_created_idx
ON repository_archives (repository_id, created_at DESC);

CREATE TRIGGER repository_archives_set_updated_at
BEFORE UPDATE ON repository_archives
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
