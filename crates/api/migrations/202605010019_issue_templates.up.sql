CREATE TABLE issue_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    repository_id uuid NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    slug text NOT NULL,
    name text NOT NULL,
    description text,
    title_prefill text,
    body text NOT NULL DEFAULT '',
    issue_type text,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issue_templates_slug_not_blank CHECK (length(trim(slug)) > 0),
    CONSTRAINT issue_templates_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT issue_templates_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9._-]*$')
);

CREATE UNIQUE INDEX issue_templates_repo_slug_lower_unique
ON issue_templates (repository_id, lower(slug));
CREATE INDEX issue_templates_repository_order_idx
ON issue_templates (repository_id, display_order, lower(name));

CREATE TRIGGER issue_templates_set_updated_at
BEFORE UPDATE ON issue_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE issue_form_fields (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES issue_templates(id) ON DELETE CASCADE,
    field_key text NOT NULL,
    label text NOT NULL,
    field_type text NOT NULL,
    description text,
    placeholder text,
    value text,
    required boolean NOT NULL DEFAULT false,
    display_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT issue_form_fields_key_not_blank CHECK (length(trim(field_key)) > 0),
    CONSTRAINT issue_form_fields_label_not_blank CHECK (length(trim(label)) > 0),
    CONSTRAINT issue_form_fields_type_check CHECK (field_type IN ('markdown', 'textarea', 'input'))
);

CREATE UNIQUE INDEX issue_form_fields_template_key_unique
ON issue_form_fields (template_id, field_key);
CREATE INDEX issue_form_fields_template_order_idx
ON issue_form_fields (template_id, display_order);

CREATE TRIGGER issue_form_fields_set_updated_at
BEFORE UPDATE ON issue_form_fields
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE issue_template_default_labels (
    template_id uuid NOT NULL REFERENCES issue_templates(id) ON DELETE CASCADE,
    label_id uuid NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (template_id, label_id)
);

CREATE TABLE issue_template_default_assignees (
    template_id uuid NOT NULL REFERENCES issue_templates(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (template_id, user_id)
);
