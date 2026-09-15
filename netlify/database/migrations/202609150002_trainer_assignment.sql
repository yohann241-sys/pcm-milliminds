ALTER TABLE assessments
  ADD COLUMN IF NOT EXISTS trainer_email TEXT;

CREATE INDEX IF NOT EXISTS assessments_trainer_email_idx
  ON assessments ((LOWER(trainer_email)));

-- Reprend les affectations historiques fondées sur le propriétaire de la session.
UPDATE assessments a
SET trainer_email = LOWER(s.owner_email)
FROM seminar_sessions s
WHERE a.seminar_session_id = s.id
  AND a.trainer_email IS NULL
  AND s.owner_email IS NOT NULL
  AND BTRIM(s.owner_email) <> '';

CREATE TABLE IF NOT EXISTS trainer_directory (
  email TEXT PRIMARY KEY,
  display_name TEXT,
  source TEXT NOT NULL DEFAULT 'participant',
  is_trainer BOOLEAN NOT NULL DEFAULT FALSE,
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS trainer_directory_updated_idx
  ON trainer_directory(updated_at DESC);

-- Alimente le répertoire avec les affectations déjà connues.
INSERT INTO trainer_directory (email, source, updated_at)
SELECT DISTINCT LOWER(trainer_email), 'assessment', NOW()
FROM assessments
WHERE trainer_email IS NOT NULL AND BTRIM(trainer_email) <> ''
ON CONFLICT (email) DO UPDATE SET updated_at = NOW();

INSERT INTO trainer_directory (email, source, updated_at)
SELECT DISTINCT LOWER(owner_email), 'session', NOW()
FROM seminar_sessions
WHERE owner_email IS NOT NULL AND BTRIM(owner_email) <> ''
ON CONFLICT (email) DO UPDATE SET updated_at = NOW();
