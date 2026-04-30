CREATE TABLE repository_creation_templates (
    slug text PRIMARY KEY,
    display_name text NOT NULL,
    description text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT repository_creation_templates_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT repository_creation_templates_display_name_not_blank CHECK (length(trim(display_name)) > 0)
);

CREATE TRIGGER repository_creation_templates_set_updated_at
BEFORE UPDATE ON repository_creation_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE gitignore_templates (
    slug text PRIMARY KEY,
    display_name text NOT NULL,
    description text NOT NULL,
    content text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT gitignore_templates_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT gitignore_templates_display_name_not_blank CHECK (length(trim(display_name)) > 0)
);

CREATE TRIGGER gitignore_templates_set_updated_at
BEFORE UPDATE ON gitignore_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE license_templates (
    slug text PRIMARY KEY,
    display_name text NOT NULL,
    description text NOT NULL,
    content text NOT NULL,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT license_templates_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT license_templates_display_name_not_blank CHECK (length(trim(display_name)) > 0)
);

CREATE TRIGGER license_templates_set_updated_at
BEFORE UPDATE ON license_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

INSERT INTO repository_creation_templates (slug, display_name, description, sort_order)
VALUES
    ('blank', 'No template', 'Start from an empty repository.', 0),
    ('node-typescript', 'Node + TypeScript', 'Starter layout for a TypeScript package or app.', 10),
    ('rust-axum', 'Rust Axum service', 'Starter layout for a Rust HTTP service.', 20)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    sort_order = EXCLUDED.sort_order;

INSERT INTO gitignore_templates (slug, display_name, description, content, sort_order)
VALUES
    ('node', 'Node', 'Ignore Node.js dependencies, build output, and local env files.', 'node_modules/
.next/
dist/
.env
', 10),
    ('rust', 'Rust', 'Ignore Rust build artifacts and local environment files.', 'target/
.env
', 20),
    ('python', 'Python', 'Ignore Python bytecode, virtual environments, and test caches.', '__pycache__/
.venv/
.pytest_cache/
', 30),
    ('macos', 'macOS', 'Ignore Finder and macOS metadata files.', '.DS_Store
', 40)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    content = EXCLUDED.content,
    sort_order = EXCLUDED.sort_order;

INSERT INTO license_templates (slug, display_name, description, content, sort_order)
VALUES
    ('mit', 'MIT License', 'A short and permissive license with conditions requiring preservation of copyright and license notices.', 'MIT License

Copyright (c) {{year}} {{owner}}
', 10),
    ('apache-2.0', 'Apache License 2.0', 'A permissive license with an express patent grant.', 'Apache License
Version 2.0, January 2004
', 20),
    ('gpl-3.0', 'GNU GPLv3', 'A strong copyleft license for sharing source code and modifications.', 'GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007
', 30)
ON CONFLICT (slug) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description,
    content = EXCLUDED.content,
    sort_order = EXCLUDED.sort_order;
