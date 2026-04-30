CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    slug text NOT NULL,
    display_name text NOT NULL,
    description text,
    owner_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT organizations_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT organizations_display_name_not_blank CHECK (length(trim(display_name)) > 0),
    CONSTRAINT organizations_slug_format CHECK (slug ~ '^[a-zA-Z0-9][a-zA-Z0-9_-]*$')
);

CREATE UNIQUE INDEX organizations_slug_lower_unique ON organizations (lower(slug));
CREATE INDEX organizations_slug_trgm_idx ON organizations USING gin (slug gin_trgm_ops);
CREATE INDEX organizations_owner_user_id_idx ON organizations (owner_user_id);

CREATE TRIGGER organizations_set_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE organization_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT organization_memberships_role_check CHECK (role IN ('owner', 'admin', 'member'))
);

CREATE UNIQUE INDEX organization_memberships_org_user_unique
ON organization_memberships (organization_id, user_id);
CREATE INDEX organization_memberships_user_id_idx ON organization_memberships (user_id);

CREATE TRIGGER organization_memberships_set_updated_at
BEFORE UPDATE ON organization_memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE teams (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT teams_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT teams_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX teams_org_slug_lower_unique ON teams (organization_id, lower(slug));
CREATE INDEX teams_organization_id_idx ON teams (organization_id);

CREATE TRIGGER teams_set_updated_at
BEFORE UPDATE ON teams
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE team_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'member',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT team_memberships_role_check CHECK (role IN ('maintainer', 'member'))
);

CREATE UNIQUE INDEX team_memberships_team_user_unique ON team_memberships (team_id, user_id);
CREATE INDEX team_memberships_user_id_idx ON team_memberships (user_id);

CREATE TRIGGER team_memberships_set_updated_at
BEFORE UPDATE ON team_memberships
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE repositories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    owner_organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    visibility text NOT NULL DEFAULT 'public',
    default_branch text NOT NULL DEFAULT 'main',
    is_archived boolean NOT NULL DEFAULT false,
    created_by_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repositories_exactly_one_owner CHECK (
        (owner_user_id IS NOT NULL AND owner_organization_id IS NULL)
        OR (owner_user_id IS NULL AND owner_organization_id IS NOT NULL)
    ),
    CONSTRAINT repositories_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT repositories_name_format CHECK (name ~ '^[a-zA-Z0-9._-]+$'),
    CONSTRAINT repositories_visibility_check CHECK (visibility IN ('public', 'private', 'internal')),
    CONSTRAINT repositories_default_branch_not_blank CHECK (length(trim(default_branch)) > 0)
);

CREATE UNIQUE INDEX repositories_user_owner_name_unique
ON repositories (owner_user_id, lower(name))
WHERE owner_user_id IS NOT NULL;
CREATE UNIQUE INDEX repositories_org_owner_name_unique
ON repositories (owner_organization_id, lower(name))
WHERE owner_organization_id IS NOT NULL;
CREATE INDEX repositories_created_by_user_id_idx ON repositories (created_by_user_id);
CREATE INDEX repositories_name_trgm_idx ON repositories USING gin (name gin_trgm_ops);

CREATE TRIGGER repositories_set_updated_at
BEFORE UPDATE ON repositories
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE repository_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role text NOT NULL,
    source text NOT NULL DEFAULT 'direct',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_permissions_role_check CHECK (role IN ('owner', 'admin', 'write', 'read')),
    CONSTRAINT repository_permissions_source_check CHECK (source IN ('owner', 'organization', 'team', 'direct'))
);

CREATE UNIQUE INDEX repository_permissions_repo_user_unique
ON repository_permissions (repository_id, user_id);
CREATE INDEX repository_permissions_user_id_idx ON repository_permissions (user_id);

CREATE TRIGGER repository_permissions_set_updated_at
BEFORE UPDATE ON repository_permissions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE commits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    oid text NOT NULL,
    author_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    committer_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
    message text NOT NULL,
    tree_oid text,
    parent_oids text[] NOT NULL DEFAULT ARRAY[]::text[],
    committed_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT commits_oid_not_blank CHECK (length(trim(oid)) > 0),
    CONSTRAINT commits_message_not_blank CHECK (length(trim(message)) > 0)
);

CREATE UNIQUE INDEX commits_repo_oid_unique ON commits (repository_id, oid);
CREATE INDEX commits_repository_committed_at_idx ON commits (repository_id, committed_at DESC);

CREATE TABLE git_objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    oid text NOT NULL,
    object_type text NOT NULL,
    byte_size bigint NOT NULL DEFAULT 0,
    storage_key text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT git_objects_oid_not_blank CHECK (length(trim(oid)) > 0),
    CONSTRAINT git_objects_type_check CHECK (object_type IN ('blob', 'tree', 'commit', 'tag')),
    CONSTRAINT git_objects_byte_size_non_negative CHECK (byte_size >= 0)
);

CREATE UNIQUE INDEX git_objects_repo_oid_unique ON git_objects (repository_id, oid);
CREATE INDEX git_objects_repository_type_idx ON git_objects (repository_id, object_type);

CREATE TABLE repository_git_refs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    name text NOT NULL,
    kind text NOT NULL,
    target_commit_id uuid REFERENCES commits(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_git_refs_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT repository_git_refs_kind_check CHECK (kind IN ('branch', 'tag'))
);

CREATE UNIQUE INDEX repository_git_refs_repo_name_unique
ON repository_git_refs (repository_id, name);
CREATE INDEX repository_git_refs_target_commit_id_idx ON repository_git_refs (target_commit_id);

CREATE TRIGGER repository_git_refs_set_updated_at
BEFORE UPDATE ON repository_git_refs
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
