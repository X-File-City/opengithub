DROP TABLE IF EXISTS repository_pull_preferences;
DROP TABLE IF EXISTS pull_request_task_progress;
DROP TABLE IF EXISTS pull_request_checks_summary;
DROP TABLE IF EXISTS pull_request_review_requests;
DROP TABLE IF EXISTS pull_request_reviews;

ALTER TABLE pull_requests
    DROP COLUMN IF EXISTS is_draft;
