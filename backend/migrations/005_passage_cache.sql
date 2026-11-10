-- The day's Bible text, fetched from YouVersion on the first request of the day and served from here after that.
-- Kept in the database (not the server's memory) because Render's free plan restarts the server when it's idle.
-- Cleared every Sunday by the cron job (POST /internal/passage-cache/clear); older weeks are also removed
-- whenever a new day is saved, in case the cron job misses a Sunday.
CREATE TABLE passage_cache (
  reading_date  DATE NOT NULL REFERENCES readings (reading_date) ON DELETE CASCADE,
  -- YouVersion Bible version id, e.g. 111 = NIV. Part of the key so changing version fetches fresh text.
  bible_id      INTEGER NOT NULL,
  -- The day's passage as it was when fetched. If the admin changes the reading, it no longer matches and is refetched.
  passage       TEXT NOT NULL,
  version_abbreviation TEXT NOT NULL,
  version_title TEXT NOT NULL,
  -- Must be shown with the text (publisher's licence)
  copyright     TEXT NOT NULL,
  -- [{ "id": "GEN.16", "reference": "Genesis 16", "html": "<div>...</div>" }, ...] in reading order
  chapters      JSONB NOT NULL,
  fetched_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (reading_date, bible_id)
);
