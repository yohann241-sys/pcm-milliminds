ALTER TABLE seminar_sessions
  ADD COLUMN IF NOT EXISTS owner_email TEXT;

CREATE INDEX IF NOT EXISTS seminar_sessions_owner_email_idx
  ON seminar_sessions(owner_email);
