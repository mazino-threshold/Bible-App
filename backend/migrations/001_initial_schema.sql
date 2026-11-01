-- Users of the app. Admins are users with role = 'admin'.
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  email              TEXT NOT NULL,
  phone              TEXT NOT NULL,
  role               TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  reminder_frequency TEXT NOT NULL DEFAULT 'mid' CHECK (reminder_frequency IN ('high', 'mid', 'low', 'off')),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Emails are unique regardless of capitalisation
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

-- 6-digit codes emailed to users to sign in. Only a hash of the code is stored.
CREATE TABLE login_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash  TEXT NOT NULL,
  attempts   INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX login_codes_user_idx ON login_codes (user_id, created_at DESC);

-- Signed-in devices. The app holds the raw token; only its hash is stored.
CREATE TABLE sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash   TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_idx ON sessions (user_id);

-- The reading portion for each day, entered by an admin a week at a time.
-- Only Monday (1) to Saturday (6) are allowed.
CREATE TABLE readings (
  reading_date DATE PRIMARY KEY CHECK (EXTRACT(ISODOW FROM reading_date) BETWEEN 1 AND 6),
  passage      TEXT NOT NULL,
  notes        TEXT,
  created_by   UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One row per user per day they checked in.
-- The primary key makes a second check-in for the same day impossible.
CREATE TABLE check_ins (
  user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL REFERENCES readings (reading_date) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, check_in_date)
);

CREATE INDEX check_ins_date_idx ON check_ins (check_in_date);

-- Expo push tokens, one per installed device.
CREATE TABLE push_tokens (
  token      TEXT PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX push_tokens_user_idx ON push_tokens (user_id);
