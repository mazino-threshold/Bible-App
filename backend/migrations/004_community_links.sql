-- Links to the club's community groups (e.g. the WhatsApp group), shown on the app's home screen.
-- Kept in the database so a link can be changed, or the group moved to another platform, without releasing a new app:
-- update the row, or add the new one and set active = false on the old.
CREATE TABLE community_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Which app the link opens, e.g. 'whatsapp' or 'telegram'. The app picks an icon from it; any other value gets a generic one.
  platform    TEXT NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  button_label TEXT NOT NULL,
  url         TEXT NOT NULL CHECK (url ~ '^https://'),
  -- Lowest first when there is more than one
  sort_order  INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO community_links (platform, title, description, button_label, url)
VALUES (
  'whatsapp',
  'Join our community',
  'Have questions while you read Scripture or want an accountability community? Join our community.',
  'Join on WhatsApp',
  'https://chat.whatsapp.com/JC5IFnBhrty1iHouI5EldK?s=sh&p=a&mlu=4&ilr=4&iam=2'
);
