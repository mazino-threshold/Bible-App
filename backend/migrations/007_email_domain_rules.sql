-- Admin-managed rules for which email domains may register.
-- Sign-up is also refused for the built-in list of disposable email domains (data/disposable-email-domains.txt).
--   'block' = refuse sign-ups from this domain and its subdomains (e.g. one used by spammers)
--   'allow' = accept it even if it is on the built-in disposable list (for a domain listed by mistake)
-- Only sign-up is checked: people who already have an account can still sign in. Deactivate or delete them if needed.
CREATE TABLE email_domain_rules (
  -- Lowercase, no '@', e.g. 'example.com'
  domain     TEXT PRIMARY KEY CHECK (domain = lower(domain) AND domain NOT LIKE '%@%'),
  action     TEXT NOT NULL CHECK (action IN ('block', 'allow')),
  reason     TEXT,
  created_by UUID REFERENCES users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
