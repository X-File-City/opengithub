CREATE TABLE dashboard_hint_dismissals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hint_key text NOT NULL,
    dismissed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT dashboard_hint_dismissals_hint_key_not_blank CHECK (length(trim(hint_key)) > 0)
);

CREATE UNIQUE INDEX dashboard_hint_dismissals_user_hint_unique
ON dashboard_hint_dismissals (user_id, hint_key);

CREATE INDEX dashboard_hint_dismissals_user_dismissed_at_idx
ON dashboard_hint_dismissals (user_id, dismissed_at DESC);

CREATE TRIGGER dashboard_hint_dismissals_set_updated_at
BEFORE UPDATE ON dashboard_hint_dismissals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
