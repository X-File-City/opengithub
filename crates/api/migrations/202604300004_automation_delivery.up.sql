CREATE TABLE actions_workflows (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name text NOT NULL,
    path text NOT NULL,
    state text NOT NULL DEFAULT 'active',
    trigger_events text[] NOT NULL DEFAULT ARRAY[]::text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT actions_workflows_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT actions_workflows_path_not_blank CHECK (length(trim(path)) > 0),
    CONSTRAINT actions_workflows_state_check CHECK (state IN ('active', 'disabled'))
);

CREATE UNIQUE INDEX actions_workflows_repo_path_unique ON actions_workflows (repository_id, lower(path));
CREATE INDEX actions_workflows_repository_state_idx ON actions_workflows (repository_id, state);

CREATE TRIGGER actions_workflows_set_updated_at
BEFORE UPDATE ON actions_workflows
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE workflow_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    workflow_id uuid NOT NULL REFERENCES actions_workflows(id) ON DELETE CASCADE,
    actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    run_number bigint NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    conclusion text,
    head_branch text NOT NULL,
    head_sha text,
    event text NOT NULL,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workflow_runs_number_positive CHECK (run_number > 0),
    CONSTRAINT workflow_runs_status_check CHECK (status IN ('queued', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT workflow_runs_conclusion_check CHECK (
        conclusion IS NULL OR conclusion IN ('success', 'failure', 'cancelled', 'skipped', 'timed_out')
    ),
    CONSTRAINT workflow_runs_head_branch_not_blank CHECK (length(trim(head_branch)) > 0),
    CONSTRAINT workflow_runs_event_not_blank CHECK (length(trim(event)) > 0),
    CONSTRAINT workflow_runs_completed_has_conclusion CHECK (
        status <> 'completed' OR conclusion IS NOT NULL
    )
);

CREATE UNIQUE INDEX workflow_runs_workflow_number_unique ON workflow_runs (workflow_id, run_number);
CREATE INDEX workflow_runs_repository_status_created_idx ON workflow_runs (repository_id, status, created_at DESC);

CREATE TRIGGER workflow_runs_set_updated_at
BEFORE UPDATE ON workflow_runs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE workflow_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    conclusion text,
    runner_label text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workflow_jobs_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT workflow_jobs_status_check CHECK (status IN ('queued', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT workflow_jobs_conclusion_check CHECK (
        conclusion IS NULL OR conclusion IN ('success', 'failure', 'cancelled', 'skipped', 'timed_out')
    ),
    CONSTRAINT workflow_jobs_completed_has_conclusion CHECK (
        status <> 'completed' OR conclusion IS NOT NULL
    )
);

CREATE INDEX workflow_jobs_run_status_idx ON workflow_jobs (run_id, status);

CREATE TRIGGER workflow_jobs_set_updated_at
BEFORE UPDATE ON workflow_jobs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE workflow_steps (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id uuid NOT NULL REFERENCES workflow_jobs(id) ON DELETE CASCADE,
    number integer NOT NULL,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    conclusion text,
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT workflow_steps_number_positive CHECK (number > 0),
    CONSTRAINT workflow_steps_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT workflow_steps_status_check CHECK (status IN ('queued', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT workflow_steps_conclusion_check CHECK (
        conclusion IS NULL OR conclusion IN ('success', 'failure', 'cancelled', 'skipped', 'timed_out')
    ),
    CONSTRAINT workflow_steps_completed_has_conclusion CHECK (
        status <> 'completed' OR conclusion IS NOT NULL
    )
);

CREATE UNIQUE INDEX workflow_steps_job_number_unique ON workflow_steps (job_id, number);

CREATE TRIGGER workflow_steps_set_updated_at
BEFORE UPDATE ON workflow_steps
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    owner_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    package_type text NOT NULL,
    visibility text NOT NULL DEFAULT 'private',
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT packages_exactly_one_owner CHECK (
        (owner_user_id IS NOT NULL AND owner_organization_id IS NULL)
        OR (owner_user_id IS NULL AND owner_organization_id IS NOT NULL)
    ),
    CONSTRAINT packages_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT packages_type_check CHECK (package_type IN ('container', 'npm', 'maven', 'generic')),
    CONSTRAINT packages_visibility_check CHECK (visibility IN ('public', 'private', 'internal'))
);

CREATE UNIQUE INDEX packages_repo_type_name_unique ON packages (repository_id, package_type, lower(name));
CREATE INDEX packages_owner_user_idx ON packages (owner_user_id);
CREATE INDEX packages_owner_organization_idx ON packages (owner_organization_id);

CREATE TRIGGER packages_set_updated_at
BEFORE UPDATE ON packages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE package_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    version text NOT NULL,
    manifest jsonb NOT NULL DEFAULT '{}'::jsonb,
    blob_key text,
    size_bytes bigint,
    published_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT package_versions_version_not_blank CHECK (length(trim(version)) > 0),
    CONSTRAINT package_versions_size_non_negative CHECK (size_bytes IS NULL OR size_bytes >= 0)
);

CREATE UNIQUE INDEX package_versions_package_version_unique ON package_versions (package_id, lower(version));
CREATE INDEX package_versions_package_created_idx ON package_versions (package_id, created_at DESC);

CREATE TABLE webhooks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    url text NOT NULL,
    secret_hash text,
    events text[] NOT NULL DEFAULT ARRAY['push']::text[],
    active boolean NOT NULL DEFAULT true,
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT webhooks_url_check CHECK (url ~ '^https?://'),
    CONSTRAINT webhooks_events_not_empty CHECK (array_length(events, 1) IS NOT NULL)
);

CREATE INDEX webhooks_repository_active_idx ON webhooks (repository_id, active);

CREATE TRIGGER webhooks_set_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE webhook_deliveries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id uuid NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    event text NOT NULL,
    payload jsonb NOT NULL,
    status text NOT NULL DEFAULT 'queued',
    attempt_count integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz,
    response_status integer,
    response_body text,
    delivered_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT webhook_deliveries_event_not_blank CHECK (length(trim(event)) > 0),
    CONSTRAINT webhook_deliveries_status_check CHECK (status IN ('queued', 'delivered', 'failed')),
    CONSTRAINT webhook_deliveries_attempt_non_negative CHECK (attempt_count >= 0),
    CONSTRAINT webhook_deliveries_response_status_check CHECK (
        response_status IS NULL OR (response_status >= 100 AND response_status <= 599)
    )
);

CREATE INDEX webhook_deliveries_webhook_created_idx ON webhook_deliveries (webhook_id, created_at DESC);
CREATE INDEX webhook_deliveries_retry_idx ON webhook_deliveries (status, next_attempt_at)
WHERE status = 'queued';

CREATE TRIGGER webhook_deliveries_set_updated_at
BEFORE UPDATE ON webhook_deliveries
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id uuid REFERENCES repositories(id) ON DELETE CASCADE,
    subject_type text NOT NULL,
    subject_id uuid,
    title text NOT NULL,
    reason text NOT NULL,
    unread boolean NOT NULL DEFAULT true,
    last_read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT notifications_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT notifications_subject_type_not_blank CHECK (length(trim(subject_type)) > 0),
    CONSTRAINT notifications_reason_not_blank CHECK (length(trim(reason)) > 0)
);

CREATE INDEX notifications_user_unread_updated_idx ON notifications (user_id, unread, updated_at DESC);
CREATE INDEX notifications_repository_idx ON notifications (repository_id);

CREATE TRIGGER notifications_set_updated_at
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE job_leases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    queue text NOT NULL,
    lease_key text NOT NULL,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    locked_by text,
    locked_until timestamptz,
    attempts integer NOT NULL DEFAULT 0,
    last_error text,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT job_leases_queue_not_blank CHECK (length(trim(queue)) > 0),
    CONSTRAINT job_leases_key_not_blank CHECK (length(trim(lease_key)) > 0),
    CONSTRAINT job_leases_attempts_non_negative CHECK (attempts >= 0)
);

CREATE UNIQUE INDEX job_leases_queue_key_unique ON job_leases (queue, lease_key);
CREATE INDEX job_leases_available_idx ON job_leases (queue, locked_until, completed_at);

CREATE TRIGGER job_leases_set_updated_at
BEFORE UPDATE ON job_leases
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
