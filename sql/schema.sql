-- Drop types (if needed)
DROP TYPE IF EXISTS user_role,
user_status CASCADE;

-- Create enums
CREATE TYPE user_role AS ENUM ('user', 'admin', 'superAdmin');

CREATE TYPE user_status AS ENUM ('active', 'inactive', 'banned');

-- Drop tables
DROP TABLE IF EXISTS users_permissions,
permissions,
users CASCADE;

-- Create users table
CREATE TABLE
	users (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		username VARCHAR(32) NOT NULL UNIQUE,
		password VARCHAR(64) NOT NULL,
		role user_role DEFAULT 'user' NOT NULL,
		status user_status DEFAULT 'active' NOT NULL,
		created_at TIMESTAMP DEFAULT now () NOT NULL,
		updated_at TIMESTAMP DEFAULT now () NOT NULL,
		created_by UUID
	);

-- Create permissions table
CREATE TABLE
	permissions (
		id UUID PRIMARY KEY DEFAULT gen_random_uuid () NOT NULL,
		name TEXT NOT NULL UNIQUE,
		description TEXT
	);

-- Create user_permissions junction table
CREATE TABLE
	users_permissions (
		user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
		permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE CASCADE,
		PRIMARY KEY (user_id, permission_id)
	);