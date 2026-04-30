CREATE TABLE repository_languages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    language text NOT NULL,
    color text NOT NULL,
    byte_count bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_languages_language_not_blank CHECK (length(trim(language)) > 0),
    CONSTRAINT repository_languages_color_not_blank CHECK (length(trim(color)) > 0),
    CONSTRAINT repository_languages_byte_count_non_negative CHECK (byte_count >= 0)
);

CREATE UNIQUE INDEX repository_languages_repo_language_unique
ON repository_languages (repository_id, lower(language));

CREATE INDEX repository_languages_repo_bytes_idx
ON repository_languages (repository_id, byte_count DESC, language ASC);

CREATE TRIGGER repository_languages_set_updated_at
BEFORE UPDATE ON repository_languages
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE recent_repository_visits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    visited_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX recent_repository_visits_user_repo_unique
ON recent_repository_visits (user_id, repository_id);

CREATE INDEX recent_repository_visits_user_visited_at_idx
ON recent_repository_visits (user_id, visited_at DESC);

CREATE TRIGGER recent_repository_visits_set_updated_at
BEFORE UPDATE ON recent_repository_visits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
