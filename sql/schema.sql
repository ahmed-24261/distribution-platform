-- Drop types (if needed)
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

CREATE TYPE document_type AS ENUM ('File', 'Message', 'Attachment');

-- Drop tables
DROP TABLE IF EXISTS document,
fiche,
source,
upload,
user_permission,
permission,
"user" CASCADE;

-- Create user table
CREATE TABLE
	"user" (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		username VARCHAR(32) NOT NULL UNIQUE,
		password VARCHAR(64) NOT NULL,
		role user_role DEFAULT 'user' NOT NULL,
		status user_status DEFAULT 'active' NOT NULL,
		created_at TIMESTAMP DEFAULT now () NOT NULL,
		updated_at TIMESTAMP DEFAULT now () NOT NULL,
		created_by UUID
	);

-- Create permission table
CREATE TABLE
	permission (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name TEXT NOT NULL UNIQUE,
		description TEXT
	);

-- Create user_permission junction table
CREATE TABLE
	user_permission (
		user_id UUID NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
		permission_id UUID NOT NULL REFERENCES permission (id) ON DELETE CASCADE,
		PRIMARY KEY (user_id, permission_id)
	);

-- Create upload table
CREATE TABLE
	upload (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		user_id UUID NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
		display_name TEXT NOT NULL UNIQUE,
		date TIMESTAMP DEFAULT now () NOT NULL,
		type upload_type NOT NULL,
		status upload_status DEFAULT 'pending' NOT NULL,
		file_name TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		hash VARCHAR(64) NOT NULL UNIQUE
	);

-- CreateTable
CREATE TABLE
	source (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name VARCHAR(30) NOT NULL UNIQUE,
		description TEXT
	);

-- CreateTable
CREATE TABLE
	fiche (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		ref VARCHAR(32) NOT NULL UNIQUE,
		source_id UUID NOT NULL REFERENCES source (id) ON DELETE CASCADE,
		date TIMESTAMP DEFAULT now () NOT NULL,
		object TEXT NOT NULL,
		summary TEXT NOT NULL,
		created_by TEXT,
		date_distribute TIMESTAMP,
		status fiche_status DEFAULT 'suspended' NOT NULL,
		path TEXT NOT NULL UNIQUE,
		hash VARCHAR(64) NOT NULL UNIQUE,
		upload_id UUID NOT NULL REFERENCES upload (id) ON DELETE CASCADE,
		dump TEXT
	);

CREATE TABLE
	document (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		type document_type NOT NULL,
		fiche_id UUID NOT NULL REFERENCES fiche (id) ON DELETE CASCADE,
		file_name TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		hash VARCHAR(64) NOT NULL UNIQUE,
		origin JSONB,
		content TEXT,
		dumpInfo JSONB,
		meta JSONB
	);