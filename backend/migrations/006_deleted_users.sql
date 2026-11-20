-- Deleted accounts, held for a short time before being erased for good (Nigeria Data Protection Act 2023:
-- keep personal data no longer than needed, and erase it when the person asks).
--
-- Deleting an account (by the user, or by an admin) removes the row from users, which also removes their sessions,
-- login codes, push tokens, check-ins and status history (ON DELETE CASCADE). A copy goes here first so an admin
-- can restore the account if it was a mistake or the person changes their mind. That is the only reason it is kept:
-- it is not shown in reports or used for anything else, only admins can see it, and once purge_after passes the
-- row is deleted (checked whenever the existing cron jobs run, and when an admin lists deleted accounts).
-- Their email is free to register again straight away; that is a brand new account.
CREATE TABLE deleted_users (
  -- Their id from users, kept so a restored account keeps the same id
  id                  UUID PRIMARY KEY,
  name                TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT NOT NULL,
  role                TEXT NOT NULL,
  reminders_enabled   BOOLEAN NOT NULL,
  -- When they registered
  created_at          TIMESTAMPTZ NOT NULL,
  deactivated_at      TIMESTAMPTZ,
  deactivation_reason TEXT,
  -- ["2026-11-03", "2026-11-04", ...] oldest first
  check_ins           JSONB NOT NULL DEFAULT '[]',
  -- [{ "action": "deactivated", "reason": "...", "changedBy": "<user id>", "changedAt": "..." }, ...] oldest first
  status_changes      JSONB NOT NULL DEFAULT '[]',
  -- 'user' = they deleted their own account, 'admin' = an admin deleted it
  requested_by        TEXT NOT NULL CHECK (requested_by IN ('user', 'admin')),
  -- The admin who deleted it; null when the user deleted their own account (or that admin is gone)
  deleted_by          UUID REFERENCES users (id) ON DELETE SET NULL,
  deletion_reason     TEXT,
  deleted_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Erased for good after this
  purge_after         TIMESTAMPTZ NOT NULL
);

CREATE INDEX deleted_users_purge_idx ON deleted_users (purge_after);
