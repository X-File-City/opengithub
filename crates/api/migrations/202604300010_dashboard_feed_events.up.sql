CREATE TABLE user_follows (
    follower_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (follower_user_id, followed_user_id),
    CONSTRAINT user_follows_no_self CHECK (follower_user_id <> followed_user_id)
);

CREATE INDEX user_follows_followed_user_idx ON user_follows (followed_user_id);

CREATE TABLE organization_follows (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, organization_id)
);

CREATE INDEX organization_follows_organization_idx ON organization_follows (organization_id);

CREATE TABLE repository_watches (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    reason text NOT NULL DEFAULT 'subscribed',
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, repository_id),
    CONSTRAINT repository_watches_reason_check CHECK (reason IN ('subscribed', 'participating'))
);

CREATE INDEX repository_watches_repository_idx ON repository_watches (repository_id);

CREATE TABLE repository_stars (
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, repository_id)
);

CREATE INDEX repository_stars_repository_idx ON repository_stars (repository_id);

CREATE TABLE repository_forks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    source_repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    fork_repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    forked_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_forks_distinct_repositories CHECK (source_repository_id <> fork_repository_id)
);

CREATE UNIQUE INDEX repository_forks_source_fork_unique
ON repository_forks (source_repository_id, fork_repository_id);
CREATE INDEX repository_forks_source_created_idx ON repository_forks (source_repository_id, created_at DESC);
CREATE INDEX repository_forks_user_created_idx ON repository_forks (forked_by_user_id, created_at DESC);

CREATE TABLE releases (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    tag_name text NOT NULL,
    name text,
    body text,
    draft boolean NOT NULL DEFAULT false,
    prerelease boolean NOT NULL DEFAULT false,
    author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    published_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT releases_tag_not_blank CHECK (length(trim(tag_name)) > 0)
);

CREATE UNIQUE INDEX releases_repository_tag_unique ON releases (repository_id, lower(tag_name));
CREATE INDEX releases_repository_published_idx ON releases (repository_id, published_at DESC NULLS LAST);

CREATE TRIGGER releases_set_updated_at
BEFORE UPDATE ON releases
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE feed_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    event_type text NOT NULL,
    title text NOT NULL,
    excerpt text,
    target_href text NOT NULL,
    subject_type text,
    subject_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    occurred_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT feed_events_type_check CHECK (
        event_type IN (
            'star',
            'follow',
            'repository_create',
            'help_wanted_issue',
            'help_wanted_pull_request',
            'push',
            'fork',
            'release'
        )
    ),
    CONSTRAINT feed_events_title_not_blank CHECK (length(trim(title)) > 0),
    CONSTRAINT feed_events_target_href_not_blank CHECK (length(trim(target_href)) > 0)
);

CREATE INDEX feed_events_repository_occurred_idx ON feed_events (repository_id, occurred_at DESC);
CREATE INDEX feed_events_actor_occurred_idx ON feed_events (actor_user_id, occurred_at DESC);
CREATE INDEX feed_events_type_occurred_idx ON feed_events (event_type, occurred_at DESC);
