-- =====================================================================
--  Santa Ana — V3: login hardening (data checks + cleanup)
--  Run in Railway → PostgreSQL → Data → Query, AFTER the V3 backend is
--  Active. Run each step on its own and look at the result first.
--  No schema changes in V3 — the old backend keeps working with this data.
-- =====================================================================

-- ── STEP 1 (read-only): usernames that contain spaces ───────────────
-- These can never log in reliably. Expect 0 rows. If any appear, send
-- them to Claude before changing anything.
SELECT user_id, '[' || username || ']' AS username_with_brackets, role
FROM users
WHERE username <> trim(username) OR username ~ '\s';


-- ── STEP 2 (read-only): who is still on the old default password ────
-- Checks every account against "username + 123" using the same bcrypt
-- hash. Takes a few seconds (bcrypt is deliberately slow).
SELECT username, role, is_first_login, last_login
FROM users
WHERE password_hash = crypt(username || '123', password_hash)
ORDER BY role, username;


-- ── STEP 3: force those accounts to choose a real password ──────────
-- Their password is guessable by anyone who knows the old pattern.
-- After this, their next sign-in goes straight to "set a new password",
-- and the server refuses everything else until they do.
-- They sign in with the password they already use (username + 123).
UPDATE users
SET    is_first_login = true
WHERE  password_hash = crypt(username || '123', password_hash)
  AND  is_first_login = false;


-- ── STEP 4: redact unknown usernames already in the activity log ────
-- People type passwords into the username box; those were stored as typed.
UPDATE audit_log
SET    actor_username = left(trim(actor_username), 2)
                     || repeat(chr(8226), least(greatest(length(trim(actor_username)) - 2, 0), 20))
                     || ' (unknown)'
WHERE  action = 'LOGIN_FAILED'
  AND  user_id IS NULL
  AND  actor_username IS NOT NULL
  AND  actor_username NOT LIKE '%(unknown)';


-- ── STEP 5 (read-only): verify ──────────────────────────────────────
SELECT count(*) AS still_on_default_password
FROM users
WHERE password_hash = crypt(username || '123', password_hash) AND is_first_login = false;   -- expect 0

SELECT actor_username, description, "timestamp"
FROM audit_log
WHERE action = 'LOGIN_FAILED'
ORDER BY "timestamp" DESC
LIMIT 15;
