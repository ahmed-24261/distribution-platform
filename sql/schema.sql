-- Drop types if they exist
DROP TYPE IF EXISTS user_role,
user_status,
upload_type,
upload_status,
fiche_status,
document_type CASCADE;

-- Create enums
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superAdmin');

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');

CREATE TYPE upload_type AS ENUM ('form', 'file', 'api');

CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE fiche_status AS ENUM ('valid', 'suspended', 'canceled');

CREATE TYPE document_type AS ENUM ('File', 'Message');

-- Drop tables if they exist
DROP TABLE IF EXISTS observations,
failed_fiches,
groups_sources,
documents,
fiches,
sources,
uploads,
users_permissions,
permissions,
users,
groups CASCADE;

-- Groups
CREATE TABLE
	groups (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name TEXT NOT NULL UNIQUE,
		description TEXT UNIQUE
	);

-- Users
CREATE TABLE
	users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		username VARCHAR(32) NOT NULL UNIQUE,
		password VARCHAR(64) NOT NULL,
		role user_role DEFAULT 'user' NOT NULL,
		status user_status DEFAULT 'active' NOT NULL,
		created_at TIMESTAMP DEFAULT now () NOT NULL,
		updated_at TIMESTAMP DEFAULT now () NOT NULL,
		created_by UUID REFERENCES users (id) ON DELETE CASCADE,
		group_id UUID REFERENCES groups (id) ON DELETE CASCADE
	);

-- Permissions
CREATE TABLE
	permissions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name TEXT NOT NULL UNIQUE,
		description TEXT
	);

-- User-Permission (Many-to-Many)
CREATE TABLE
	users_permissions (
		user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
		PRIMARY KEY (user_id, permission_id)
	);

-- Uploads
CREATE TABLE
	uploads (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		display_name TEXT NOT NULL UNIQUE,
		date TIMESTAMP DEFAULT now () NOT NULL,
		type upload_type NOT NULL,
		status upload_status DEFAULT 'pending' NOT NULL,
		file_name TEXT NOT NULL,
		file_path TEXT NOT NULL UNIQUE,
		file_hash VARCHAR(64) NOT NULL UNIQUE
	);

-- Sources
CREATE TABLE
	sources (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name VARCHAR(30) NOT NULL UNIQUE,
		description TEXT
	);

-- Fiches
CREATE TABLE
	fiches (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		ref VARCHAR(32) NOT NULL UNIQUE,
		source_id UUID NOT NULL REFERENCES sources (id) ON DELETE CASCADE,
		date TIMESTAMP DEFAULT now () NOT NULL,
		object TEXT NOT NULL,
		summary TEXT NOT NULL,
		created_by UUID REFERENCES users (id) ON DELETE CASCADE,
		date_distribute TIMESTAMP,
		status fiche_status DEFAULT 'suspended' NOT NULL,
		file_path TEXT NOT NULL UNIQUE,
		file_hash VARCHAR(64) NOT NULL UNIQUE,
		upload_id UUID NOT NULL REFERENCES uploads (id) ON DELETE CASCADE,
		dump JSONB
	);

-- Documents
CREATE TABLE
	documents (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		document_type document_type NOT NULL,
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		file_name TEXT NOT NULL,
		file_path TEXT NOT NULL UNIQUE,
		file_hash VARCHAR(64) NOT NULL UNIQUE,
		content TEXT,
		original JSONB,
		dump JSONB,
		meta JSONB,
		message_id UUID REFERENCES documents (id) ON DELETE CASCADE
	);

-- Group-Sources (Many-to-Many)
CREATE TABLE
	groups_sources (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		group_id UUID NOT NULL REFERENCES groups (id) ON DELETE CASCADE,
		source_id UUID NOT NULL REFERENCES sources (id) ON DELETE CASCADE
	);

-- Failed Fiches
CREATE TABLE
	failed_fiches (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		source_id UUID REFERENCES sources (id) ON DELETE CASCADE,
		date TIMESTAMP DEFAULT now (),
		created_by UUID REFERENCES users (id) ON DELETE CASCADE,
		file_name TEXT,
		file_path TEXT UNIQUE,
		file_hash VARCHAR(64) UNIQUE,
		upload_id UUID NOT NULL REFERENCES uploads (id) ON DELETE CASCADE,
		dump TEXT
	);

-- Observations (Self-reference)
CREATE TABLE
	observations (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		observation_id UUID REFERENCES fiches (id) ON DELETE CASCADE
	);

-- Optional: Indexes for performance on foreign keys
CREATE INDEX idx_uploads_user_id ON uploads (user_id);

CREATE INDEX idx_fiches_source_id ON fiches (source_id);

CREATE INDEX idx_fiches_upload_id ON fiches (upload_id);

CREATE INDEX idx_fiches_created_by ON fiches (created_by);

CREATE INDEX idx_failed_fiches_created_by ON failed_fiches (created_by);

CREATE INDEX idx_documents_fiche_id ON documents (fiche_id);

CREATE INDEX idx_documents_message_id ON documents (message_id);