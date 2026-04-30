DROP INDEX IF EXISTS repository_files_repository_commit_path_idx;
DROP INDEX IF EXISTS repository_files_repo_commit_path_unique;

CREATE UNIQUE INDEX repository_files_repo_path_unique
ON repository_files (repository_id, lower(path));
