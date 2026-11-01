-- One row per reminder slot that has been sent, e.g. (2026-11-02, 6).
-- The primary key stops the same slot being sent twice if the cron job fires again or retries.
CREATE TABLE reminder_runs (
  reminder_date DATE NOT NULL,
  hour          INT NOT NULL CHECK (hour IN (6, 9, 12, 15, 18, 21)),
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at   TIMESTAMPTZ,
  users         INT,
  devices       INT,
  sent          INT,
  failed        INT,
  PRIMARY KEY (reminder_date, hour)
);
