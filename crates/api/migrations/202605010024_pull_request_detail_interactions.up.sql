CREATE TABLE pull_request_subscriptions (
    pull_request_id uuid NOT NULL REFERENCES pull_requests(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subscribed boolean NOT NULL,
    reason text NOT NULL DEFAULT 'subscribed',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (pull_request_id, user_id),
    CONSTRAINT pull_request_subscriptions_reason_not_blank CHECK (length(trim(reason)) > 0)
);

CREATE INDEX pull_request_subscriptions_user_updated_idx
ON pull_request_subscriptions (user_id, updated_at DESC);

CREATE TRIGGER pull_request_subscriptions_set_updated_at
BEFORE UPDATE ON pull_request_subscriptions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
