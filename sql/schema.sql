-- Drop types (if needed)
DROP TYPE IF EXISTS user_role,
user_status,
upload_type,
upload_status CASCADE;

-- Create enums
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superAdmin');

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');

CREATE TYPE upload_type AS ENUM ('form', 'file', 'api');

CREATE TYPE upload_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Drop tables
DROP TABLE IF EXISTS upload,
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