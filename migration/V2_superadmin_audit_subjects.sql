-- =====================================================================
--  Santa Ana — Migration V2: SUPERADMIN role, audit log, subject archive
--  Run in Railway → PostgreSQL → Data → Query, BEFORE deploying the
--  new backend. Every statement is idempotent (safe to run twice).
-- =====================================================================

-- ── STEP 0 (read-only): see the current role constraint ──────────────
-- Run this alone first. If it returns a constraint with a name other
-- than users_role_check, replace the name in STEP 1.
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'users'::regclass AND contype = 'c';


-- ── STEP 1: allow the SUPERADMIN role ────────────────────────────────
-- Hibernate 6 created  CHECK (role IN ('ADMIN','TEACHER'))  when the
-- table was first built, and ddl-auto=update never changes it. Without
-- this, inserting a SUPERADMIN fails.
BEGIN;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('SUPERADMIN', 'ADMIN', 'TEACHER'));

-- Display name for admin / superadmin accounts
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name varchar(255);


-- ── STEP 2: subjects can be archived instead of deleted ──────────────
-- DEFAULT true backfills every existing subject as active.
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;


-- ── STEP 3: richer audit log ─────────────────────────────────────────
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS category       varchar(40);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_username varchar(100);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS actor_role     varchar(20);
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS description    text;
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ip_address     varchar(64);

-- Old rows are all mark entries — label them so they show in the log
UPDATE audit_log a
SET    category       = 'MARKS',
       actor_username = u.username,
       actor_role     = u.role,
       description    = 'Mark #' || a.record_id || ' (recorded before detailed logging)'
FROM   users u
WHERE  a.user_id = u.user_id
  AND  a.category IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log ("timestamp");
CREATE INDEX IF NOT EXISTS idx_audit_actor     ON audit_log (actor_username);
CREATE INDEX IF NOT EXISTS idx_audit_category  ON audit_log (category);
COMMIT;


-- ── STEP 4: create YOUR superadmin account ───────────────────────────
-- Edit the three values marked ◄ before running.
-- The password here is TEMPORARY: is_first_login = true forces you to
-- set a new one on first sign-in, so the typed one never stays in use.
-- pgcrypto's bcrypt ($2a$) is the same format Spring's BCrypt uses.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (username, password_hash, role, full_name, is_first_login, is_active)
VALUES (
    'edu',                                              -- ◄ your login username
    crypt('TempPass-ChangeMe-2026', gen_salt('bf', 10)), -- ◄ temporary password
    'SUPERADMIN',
    'Edward Maina',                                     -- ◄ name shown in the app
    true,
    true
);


-- ── STEP 5: verify ───────────────────────────────────────────────────
SELECT user_id, username, role, full_name, is_active, is_first_login,
       left(password_hash, 4) AS hash_prefix          -- expect $2a$
FROM users WHERE role IN ('SUPERADMIN', 'ADMIN') ORDER BY role, username;

SELECT count(*) AS subjects, count(*) FILTER (WHERE is_active) AS active FROM subjects;

SELECT count(*) AS audit_rows, count(category) AS labelled FROM audit_log;
