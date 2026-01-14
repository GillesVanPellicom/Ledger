# Database Migrations

This directory contains SQL migration files for managing the database schema. The migration system is designed to be simple, robust, and forward-only.

## How It Works

The migration system automatically applies schema changes to the database when the application starts. It uses a dedicated `migrations` table in the database to track which migrations have already been applied.

### Migration Files

- **Naming Convention**: Each migration file must be named with a unique, timestamp-based version identifier, followed by a descriptive name. The format is `YYYYMMDDHHMMSS_description.sql` (e.g., `20240112101530_create_users.sql`).
- **Immutability**: Once a migration has been applied, its file must **never** be edited, renamed, or deleted. All schema changes must be made by creating a new migration file.
- **Order**: Migrations are executed in lexicographical order based on their filenames. The timestamp-based naming ensures they are applied in the order they were created.

### The `migrations` Table

The system maintains a `migrations` table with the following structure:

- `version` (TEXT, PRIMARY KEY): The version identifier from the migration filename (e.g., `20240112101530`).
- `checksum` (TEXT): A SHA-256 checksum of the migration file's contents.
- `applied_at` (DATETIME): The timestamp when the migration was applied.

### Process

At runtime, the system performs the following steps:
1. Scans the `migrations` directory for `.sql` files.
2. Sorts the files by name to ensure correct order.
3. For each migration file:
    a. It extracts the version from the filename.
    b. It checks if this version exists in the `migrations` table.
    c. **If the version exists**: It computes the checksum of the file and compares it with the checksum stored in the database. If they don't match, the system will fail with an error to prevent accidental changes to applied migrations.
    d. **If the version does not exist**: It executes the SQL script within a database transaction. If the script runs successfully, it records the new version and its checksum in the `migrations` table. If it fails, the transaction is rolled back, and no changes are made.

## Creating a New Migration

1. **Create a new SQL file** in this directory (`electron/migrations`).
2. **Name the file** using the `YYYYMMDDHHMMSS_description.sql` format. You can use a command like `date +%Y%m%d%H%M%S` to generate the timestamp.
3. **Write the SQL statements** for your schema changes (e.g., `CREATE TABLE`, `ALTER TABLE`).
4. **Restart the application**. The migration system will automatically detect and apply your new migration.

By following these rules, we ensure that the database schema evolves in a consistent and predictable way across all environments.
