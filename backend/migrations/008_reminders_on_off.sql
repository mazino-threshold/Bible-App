-- Reminders now go out only at 6 AM and 9 PM (Nigeria time), the same for everyone. That means fewer cron calls and
-- less server work. The high / mid / low / off frequency setting is replaced by a simple on/off switch.
-- Anyone who had chosen 'off' stays off; everyone else is on.
ALTER TABLE users ADD COLUMN reminders_enabled BOOLEAN NOT NULL DEFAULT true;

UPDATE users SET reminders_enabled = (reminder_frequency <> 'off');

ALTER TABLE users DROP COLUMN reminder_frequency;

-- reminder_runs keeps its CHECK on the old six hours, so past rows for 9, 12, 15 and 18 stay valid as history.
-- The app now only ever sends 6 and 21.
