CREATE TABLE pull_request_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    slug text NOT NULL,
    name text NOT NULL,
    body text NOT NULL DEFAULT '',
    display_order bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_request_templates_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT pull_request_templates_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT pull_request_templates_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9._-]*$')
);

CREATE UNIQUE INDEX pull_request_templates_repo_slug_lower_unique
ON pull_request_templates (repository_id, lower(slug));

CREATE INDEX pull_request_templates_repository_order_idx
ON pull_request_templates (repository_id, display_order, lower(name));

CREATE TRIGGER pull_request_templates_set_updated_at
BEFORE UPDATE ON pull_request_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX pull_requests_open_base_head_unique
ON pull_requests (
    repository_id,
    base_ref,
    COALESCE(head_repository_id, repository_id),
    head_ref
)
WHERE state = 'open';
