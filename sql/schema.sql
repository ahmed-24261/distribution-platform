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

CREATE TYPE document_type AS ENUM ('File', 'Message');

-- Drop tables
DROP TABLE IF EXISTS "failedFiche",
"groupSource",
document,
fiche,
source,
upload,
"userPermission",
permission,
"user",
"group" CASCADE;

-- Create group table
CREATE TABLE
	"group" (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name TEXT NOT NULL UNIQUE,
		description TEXT UNIQUE
	);

-- Create user table
CREATE TABLE
	"user" (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		username VARCHAR(32) NOT NULL UNIQUE,
		password VARCHAR(64) NOT NULL,
		role user_role DEFAULT 'user' NOT NULL,
		status user_status DEFAULT 'active' NOT NULL,
		"createdAt" TIMESTAMP DEFAULT now () NOT NULL,
		"updatedAt" TIMESTAMP DEFAULT now () NOT NULL,
		"createdBy" UUID REFERENCES "user" (id) ON DELETE CASCADE,
		"groupId" UUID REFERENCES "group" (id) ON DELETE CASCADE
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
	"userPermission" (
		"userId" UUID NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
		"permissionId" UUID NOT NULL REFERENCES permission (id) ON DELETE CASCADE,
		PRIMARY KEY ("userId", "permissionId")
	);

-- Create upload table
CREATE TABLE
	upload (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"userId" UUID NOT NULL REFERENCES "user" (id) ON DELETE CASCADE,
		"displayName" TEXT NOT NULL UNIQUE,
		date TIMESTAMP DEFAULT now () NOT NULL,
		type upload_type NOT NULL,
		status upload_status DEFAULT 'pending' NOT NULL,
		"fileName" TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		hash VARCHAR(64) NOT NULL UNIQUE
	);

-- Create source table
CREATE TABLE
	source (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name VARCHAR(30) NOT NULL UNIQUE,
		description TEXT
	);

-- Create fiche table
CREATE TABLE
	fiche (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		ref VARCHAR(32) NOT NULL UNIQUE,
		"sourceId" UUID NOT NULL REFERENCES source (id) ON DELETE CASCADE,
		date TIMESTAMP DEFAULT now () NOT NULL,
		object TEXT NOT NULL,
		summary TEXT NOT NULL,
		"createdBy" TEXT,
		"dateDistribute" TIMESTAMP,
		status fiche_status DEFAULT 'suspended' NOT NULL,
		path TEXT NOT NULL UNIQUE,
		hash VARCHAR(64) NOT NULL UNIQUE,
		"uploadId" UUID NOT NULL REFERENCES upload (id) ON DELETE CASCADE,
		dump TEXT
	);

-- Create document table
CREATE TABLE
	document (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		type document_type NOT NULL,
		"ficheId" UUID REFERENCES fiche (id) ON DELETE CASCADE,
		"fileName" TEXT NOT NULL,
		path TEXT NOT NULL UNIQUE,
		hash VARCHAR(64) NOT NULL UNIQUE,
		content TEXT,
		meta JSONB,
		"messageId" UUID REFERENCES document (id) ON DELETE CASCADE,
		original JSONB,
		"dumpInfo" JSONB
	);

-- Create group_source table
CREATE TABLE
	"groupSource" (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"groupId" UUID NOT NULL REFERENCES "group" (id) ON DELETE CASCADE,
		"sourceId" UUID NOT NULL REFERENCES source (id) ON DELETE CASCADE
	);

-- Create failed_fiche table
CREATE TABLE
	"failedFiche" (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		"sourceId" UUID REFERENCES source (id) ON DELETE CASCADE,
		date TIMESTAMP DEFAULT now (),
		"createdBy" TEXT,
		path TEXT UNIQUE,
		hash VARCHAR(64) UNIQUE,
		"uploadId" UUID NOT NULL REFERENCES upload (id) ON DELETE CASCADE,
		dump TEXT
	);