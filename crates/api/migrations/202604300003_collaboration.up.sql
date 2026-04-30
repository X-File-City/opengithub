CREATE TABLE labels (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name text NOT NULL,
    color text NOT NULL DEFAULT 'ededed',
    description text,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT labels_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT labels_color_hex CHECK (color ~ '^[0-9a-fA-F]{6}$')
);

CREATE UNIQUE INDEX labels_repo_name_lower_unique ON labels (repository_id, lower(name));
CREATE INDEX labels_repository_id_idx ON labels (repository_id);

CREATE TRIGGER labels_set_updated_at
BEFORE UPDATE ON labels
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE milestones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    title text NOT NULL,
    description text,
    due_on timestamptz,
    state text NOT NULL DEFAULT 'open',
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT milestones_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT milestones_state_check CHECK (state IN ('open', 'closed'))
);

CREATE UNIQUE INDEX milestones_repo_title_lower_unique ON milestones (repository_id, lower(title));
CREATE INDEX milestones_repository_state_idx ON milestones (repository_id, state);

CREATE TRIGGER milestones_set_updated_at
BEFORE UPDATE ON milestones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE issues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    number bigint NOT NULL,
    title text NOT NULL,
    body text,
    state text NOT NULL DEFAULT 'open',
    author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    milestone_id uuid REFERENCES milestones(id) ON DELETE SET NULL,
    locked boolean NOT NULL DEFAULT false,
    closed_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issues_number_positive CHECK (number > 0),
    CONSTRAINT issues_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT issues_state_check CHECK (state IN ('open', 'closed'))
);

CREATE UNIQUE INDEX issues_repo_number_unique ON issues (repository_id, number);
CREATE INDEX issues_repository_state_updated_idx ON issues (repository_id, state, updated_at DESC);
CREATE INDEX issues_title_trgm_idx ON issues USING gin (title gin_trgm_ops);

CREATE TRIGGER issues_set_updated_at
BEFORE UPDATE ON issues
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE pull_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    issue_id uuid NOT NULL UNIQUE REFERENCES issues(id) ON DELETE CASCADE,
    number bigint NOT NULL,
    title text NOT NULL,
    body text,
    state text NOT NULL DEFAULT 'open',
    author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    head_ref text NOT NULL,
    base_ref text NOT NULL,
    head_repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL,
    base_repository_id uuid REFERENCES repositories(id) ON DELETE SET NULL,
    merge_commit_id uuid REFERENCES commits(id) ON DELETE SET NULL,
    merged_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    merged_at timestamptz,
    closed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_requests_number_positive CHECK (number > 0),
    CONSTRAINT pull_requests_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT pull_requests_ref_not_blank CHECK (length(trim(head_ref)) > 0 AND length(trim(base_ref)) > 0),
    CONSTRAINT pull_requests_state_check CHECK (state IN ('open', 'closed', 'merged'))
);

CREATE UNIQUE INDEX pull_requests_repo_number_unique ON pull_requests (repository_id, number);
CREATE INDEX pull_requests_repository_state_updated_idx ON pull_requests (repository_id, state, updated_at DESC);

CREATE TRIGGER pull_requests_set_updated_at
BEFORE UPDATE ON pull_requests
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE issue_assignees (
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (issue_id, user_id)
);

CREATE INDEX issue_assignees_user_id_idx ON issue_assignees (user_id);

CREATE TABLE issue_labels (
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (issue_id, label_id)
);

CREATE INDEX issue_labels_label_id_idx ON issue_labels (label_id);

CREATE TABLE comments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id uuid REFERENCES pull_requests(id) ON DELETE CASCADE,
    author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    body text NOT NULL,
    is_minimized boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT comments_exactly_one_subject CHECK (
        (issue_id IS NOT NULL AND pull_request_id IS NULL)
        OR (issue_id IS NULL AND pull_request_id IS NOT NULL)
    ),
    CONSTRAINT comments_body_not_blank CHECK (length(trim(body)) > 0)
);

CREATE INDEX comments_issue_created_idx ON comments (issue_id, created_at);
CREATE INDEX comments_pull_request_created_idx ON comments (pull_request_id, created_at);
CREATE INDEX comments_repository_created_idx ON comments (repository_id, created_at);

CREATE TRIGGER comments_set_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE timeline_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id uuid REFERENCES pull_requests(id) ON DELETE CASCADE,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    event_type text NOT NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT timeline_events_exactly_one_subject CHECK (
        (issue_id IS NOT NULL AND pull_request_id IS NULL)
        OR (issue_id IS NULL AND pull_request_id IS NOT NULL)
    ),
    CONSTRAINT timeline_events_type_not_blank CHECK (length(trim(event_type)) > 0)
);

CREATE INDEX timeline_events_issue_created_idx ON timeline_events (issue_id, created_at);
CREATE INDEX timeline_events_pull_request_created_idx ON timeline_events (pull_request_id, created_at);

CREATE TABLE reactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    issue_id uuid REFERENCES issues(id) ON DELETE CASCADE,
    pull_request_id uuid REFERENCES pull_requests(id) ON DELETE CASCADE,
    comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reactions_exactly_one_subject CHECK (
        (issue_id IS NOT NULL)::int
        + (pull_request_id IS NOT NULL)::int
        + (comment_id IS NOT NULL)::int = 1
    ),
    CONSTRAINT reactions_content_check CHECK (
        content IN ('thumbs_up', 'thumbs_down', 'laugh', 'hooray', 'confused', 'heart', 'rocket', 'eyes')
    )
);

CREATE UNIQUE INDEX reactions_issue_user_content_unique
ON reactions (issue_id, user_id, content)
WHERE issue_id IS NOT NULL;
CREATE UNIQUE INDEX reactions_pull_request_user_content_unique
ON reactions (pull_request_id, user_id, content)
WHERE pull_request_id IS NOT NULL;
CREATE UNIQUE INDEX reactions_comment_user_content_unique
ON reactions (comment_id, user_id, content)
WHERE comment_id IS NOT NULL;

CREATE TABLE issue_cross_references (
    source_issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    target_issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (source_issue_id, target_issue_id),
    CONSTRAINT issue_cross_references_no_self CHECK (source_issue_id <> target_issue_id)
);
