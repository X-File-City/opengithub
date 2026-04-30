CREATE TABLE rendered_markdown_cache (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content_sha text NOT NULL,
    repository_id uuid NULL REFERENCES repositories(id) ON DELETE CASCADE,
    ref text NULL,
    html text NOT NULL,
    rendered_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rendered_markdown_cache_sha_not_blank CHECK (length(trim(content_sha)) > 0),
    CONSTRAINT rendered_markdown_cache_html_not_blank CHECK (length(trim(html)) > 0)
);

CREATE UNIQUE INDEX rendered_markdown_cache_lookup_unique
ON rendered_markdown_cache (
    content_sha,
    COALESCE(repository_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(ref, '')
);

CREATE INDEX rendered_markdown_cache_rendered_at_idx
ON rendered_markdown_cache (rendered_at);
