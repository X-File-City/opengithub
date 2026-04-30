CREATE TABLE repository_issue_preferences (
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    dismissed_contributor_banner_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (repository_id, user_id)
);

CREATE TRIGGER repository_issue_preferences_set_updated_at
BEFORE UPDATE ON repository_issue_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
