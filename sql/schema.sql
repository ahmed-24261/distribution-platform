-- DROP RELATION TABLES FIRST
DROP TABLE IF EXISTS attachments,
exchanges,
observations,
fiche_themes,
fiche_services,
source_themes,
failed_fiches,
processes,
uploads,
user_permissions,
permissions,
group_sources,
group_members,
fiches,
users,
groups,
sources,
services,
themes,
exchangers CASCADE;

-- DROP ENUM TYPES
DROP TYPE IF EXISTS user_role,
user_status,
upload_type,
process_status,
fiche_type,
importance_level,
fiche_status,
language_enum CASCADE;

-- CREATE ENUM TYPES
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superAdmin');

CREATE TYPE user_status AS ENUM ('active', 'inactive');

CREATE TYPE upload_type AS ENUM ('form', 'file', 'api');

CREATE TYPE process_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TYPE fiche_type AS ENUM ('PLI', 'FICHE');

CREATE TYPE importance_level AS ENUM ('URGENT', 'IMPORTANT', 'INFORMATION');

CREATE TYPE fiche_status AS ENUM ('valid', 'suspended', 'canceled');

CREATE TYPE language_enum AS ENUM (
	'ANGLAIS',
	'ARABE',
	'ESPAGNOL',
	'FRANÇAIS',
	'ITALIEN',
	'SUISSE',
	'AUTRE'
);

-- CREATE TABLES
CREATE TABLE
	groups (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		name TEXT NOT NULL UNIQUE,
		description TEXT
	);

CREATE TABLE
	users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		username VARCHAR(64) NOT NULL UNIQUE,
		password VARCHAR(64) NOT NULL,
		role user_role DEFAULT 'user' NOT NULL,
		status user_status DEFAULT 'active' NOT NULL,
		created_at TIMESTAMP DEFAULT now () NOT NULL,
		updated_at TIMESTAMP DEFAULT now () NOT NULL,
		last_login TIMESTAMP,
		creator_id UUID REFERENCES users (id)
	);

CREATE TABLE
	group_members (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		user_id UUID REFERENCES users (id) ON DELETE CASCADE,
		group_id UUID REFERENCES groups (id) ON DELETE CASCADE,
		joined_at TIMESTAMP DEFAULT now (),
		UNIQUE (user_id, group_id)
	);

CREATE TABLE
	sources (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		name TEXT
	);

CREATE TABLE
	group_sources (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		group_id UUID REFERENCES groups (id) ON DELETE CASCADE,
		source_id UUID REFERENCES sources (id) ON DELETE CASCADE,
		UNIQUE (group_id, source_id)
	);

CREATE TABLE
	permissions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		name TEXT,
		description TEXT
	);

CREATE TABLE
	user_permissions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		user_id UUID REFERENCES users (id) ON DELETE CASCADE,
		permission_id UUID REFERENCES permissions (id) ON DELETE CASCADE,
		UNIQUE (user_id, permission_id)
	);

CREATE TABLE
	uploads (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		user_id UUID REFERENCES users (id) ON DELETE CASCADE,
		uploaded_at TIMESTAMP DEFAULT now (),
		type upload_type NOT NULL,
		file_name TEXT NOT NULL,
		file_path TEXT NOT NULL,
		file_hash VARCHAR(64) NOT NULL UNIQUE
	);

CREATE TABLE
	processes (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		upload_id UUID REFERENCES uploads (id) ON DELETE CASCADE,
		user_id UUID REFERENCES users (id) ON DELETE CASCADE,
		started_at TIMESTAMP DEFAULT now () NOT NULL,
		ended_at TIMESTAMP,
		status process_status,
		attempt INTEGER DEFAULT 1,
		remark TEXT
	);

CREATE TABLE
	failed_fiches (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		upload_id UUID REFERENCES uploads (id) ON DELETE CASCADE,
		failed_at TIMESTAMP,
		file_name TEXT,
		file_path TEXT,
		file_hash VARCHAR,
		message TEXT
	);

CREATE TABLE
	services (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		name TEXT NOT NULL UNIQUE
	);

CREATE TABLE
	fiches (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		ref TEXT NOT NULL UNIQUE,
		type fiche_type,
		source_id UUID REFERENCES sources (id) ON DELETE CASCADE,
		submitted_at TIMESTAMP,
		object TEXT,
		summary TEXT,
		writer_name TEXT,
		writer_service TEXT,
		reviewer_name TEXT,
		reviewer_service TEXT,
		language language_enum,
		importance importance_level,
		keywords TEXT ARRAY,
		remarks TEXT,
		distributed_at TIMESTAMP,
		status fiche_status,
		upload_id UUID REFERENCES uploads (id) ON DELETE CASCADE
	);

CREATE TABLE
	observations (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		observation_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		description TEXT,
		UNIQUE (fiche_id, observation_id)
	);

CREATE TABLE
	fiche_services (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		service_id UUID REFERENCES services (id) ON DELETE CASCADE,
		UNIQUE (fiche_id, service_id)
	);

CREATE TABLE
	themes (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		name TEXT NOT NULL UNIQUE
	);

CREATE TABLE
	fiche_themes (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		theme_id UUID REFERENCES themes (id) ON DELETE CASCADE,
		UNIQUE (fiche_id, theme_id)
	);

CREATE TABLE
	source_themes (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		source_id UUID REFERENCES sources (id) ON DELETE CASCADE,
		theme_id UUID REFERENCES themes (id) ON DELETE CASCADE,
		UNIQUE (source_id, theme_id)
	);

CREATE TABLE
	exchanges (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		ref TEXT NOT NULL UNIQUE,
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		sender JSONB,
		receivers JSONB,
		date TIMESTAMP,
		subject TEXT,
		body TEXT
	);

CREATE TABLE
	exchangers (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		name TEXT NOT NULL UNIQUE
	);

CREATE TABLE
	attachments (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
		ref TEXT NOT NULL,
		fiche_id UUID REFERENCES fiches (id) ON DELETE CASCADE,
		file_name TEXT NOT NULL,
		file_path TEXT NOT NULL,
		file_hash VARCHAR(64) UNIQUE NOT NULL,
		content TEXT,
		translation TEXT,
		language language_enum
	);