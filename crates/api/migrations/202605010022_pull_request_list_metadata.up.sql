ALTER TABLE pull_requests
    ADD COLUMN IF NOT EXISTS is_draft boolean NOT NULL DEFAULT false;

CREATE TABLE pull_request_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pull_request_id uuid NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    reviewer_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state text NOT NULL,
    body text,
    submitted_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_request_reviews_state_check CHECK (
        state IN ('approved', 'changes_requested', 'commented', 'dismissed')
    )
);

CREATE INDEX pull_request_reviews_pull_state_idx
ON pull_request_reviews (pull_request_id, state, submitted_at DESC);

CREATE TRIGGER pull_request_reviews_set_updated_at
BEFORE UPDATE ON pull_request_reviews
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE pull_request_review_requests (
    pull_request_id uuid NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    requested_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    requested_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (pull_request_id, requested_user_id)
);

CREATE INDEX pull_request_review_requests_user_idx
ON pull_request_review_requests (requested_user_id, created_at DESC);

CREATE TABLE pull_request_checks_summary (
    pull_request_id uuid PRIMARY KEY REFERENCES pull_requests(id) ON DELETE CASCADE,
    status text NOT NULL DEFAULT 'pending',
    conclusion text,
    total_count bigint NOT NULL DEFAULT 0,
    completed_count bigint NOT NULL DEFAULT 0,
    failed_count bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_request_checks_status_check CHECK (
        status IN ('pending', 'running', 'completed', 'success', 'failure')
    ),
    CONSTRAINT pull_request_checks_conclusion_check CHECK (
        conclusion IS NULL OR conclusion IN ('success', 'failure', 'cancelled', 'skipped')
    ),
    CONSTRAINT pull_request_checks_counts_nonnegative CHECK (
        total_count >= 0 AND completed_count >= 0 AND failed_count >= 0
    )
);

CREATE TABLE pull_request_task_progress (
    pull_request_id uuid PRIMARY KEY REFERENCES pull_requests(id) ON DELETE CASCADE,
    completed_count bigint NOT NULL DEFAULT 0,
    total_count bigint NOT NULL DEFAULT 0,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT pull_request_task_progress_counts_nonnegative CHECK (
        completed_count >= 0 AND total_count >= 0 AND completed_count <= total_count
    )
);

CREATE TABLE repository_pull_preferences (
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dismissed_contributor_banner_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (repository_id, user_id)
);

CREATE TRIGGER repository_pull_preferences_set_updated_at
BEFORE UPDATE ON repository_pull_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
