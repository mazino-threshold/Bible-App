-- Admins can deactivate users (e.g. they keep defaulting, or they've left) and reactivate them when they return.
-- A deactivated user can't sign in, gets no reminders, and is left out of weekly reports for weeks they were away.
-- Their check-in history is kept.
ALTER TABLE users
  ADD COLUMN deactivated_at      TIMESTAMPTZ,
  ADD COLUMN deactivation_reason TEXT;

-- Every deactivation and reactivation, newest last.
-- Weekly reports use this to work out who was active during a past week.
CREATE TABLE user_status_changes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action     TEXT NOT NULL CHECK (action IN ('deactivated', 'reactivated')),
  reason     TEXT,
  changed_by UUID REFERENCES users (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX user_status_changes_user_idx ON user_status_changes (user_id, changed_at DESC);
