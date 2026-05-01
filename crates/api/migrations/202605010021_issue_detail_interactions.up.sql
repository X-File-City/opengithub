CREATE TABLE issue_subscriptions (
    issue_id uuid NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason text NOT NULL DEFAULT 'subscribed',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (issue_id, user_id),
    CONSTRAINT issue_subscriptions_reason_not_blank CHECK (length(trim(reason)) > 0)
);

CREATE INDEX issue_subscriptions_user_updated_idx
ON issue_subscriptions (user_id, updated_at DESC);

CREATE TRIGGER issue_subscriptions_set_updated_at
BEFORE UPDATE ON issue_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
