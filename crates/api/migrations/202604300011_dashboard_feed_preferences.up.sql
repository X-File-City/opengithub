CREATE TABLE dashboard_feed_preferences (
    user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    feed_tab text NOT NULL DEFAULT 'following',
    event_types text[] NOT NULL DEFAULT ARRAY[]::text[],
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dashboard_feed_preferences_tab_check CHECK (feed_tab IN ('following', 'for_you')),
    CONSTRAINT dashboard_feed_preferences_event_types_check CHECK (
        event_types <@ ARRAY[
            'star',
            'follow',
            'repository_create',
            'help_wanted_issue',
            'help_wanted_pull_request',
            'push',
            'fork',
            'release'
        ]::text[]
    )
);

CREATE TRIGGER dashboard_feed_preferences_set_updated_at
BEFORE UPDATE ON dashboard_feed_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
