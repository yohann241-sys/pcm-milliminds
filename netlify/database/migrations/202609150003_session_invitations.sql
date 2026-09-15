CREATE TABLE IF NOT EXISTS session_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seminar_session_id UUID NOT NULL REFERENCES seminar_sessions(id) ON DELETE CASCADE,
  trainer_email TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  invite_url TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'resend',
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS session_invitations_session_idx
  ON session_invitations(seminar_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS session_invitations_trainer_idx
  ON session_invitations((LOWER(trainer_email)), created_at DESC);

CREATE INDEX IF NOT EXISTS session_invitations_recipient_idx
  ON session_invitations((LOWER(recipient_email)), created_at DESC);
