import { readFileSync } from 'node:fs';
import path from 'node:path';
import { logger } from '../../shared/logger';

// backend/data/, from both src/modules/email-domains (tsx) and dist/modules/email-domains (built)
export const DISPOSABLE_DOMAINS_FILE = path.join(__dirname, '..', '..', '..', 'data', 'disposable-email-domains.txt');

let domains: Set<string> | undefined;

/** Reads the built-in list once (about 10,000 domains), on first use. */
function load(): Set<string> {
  if (!domains) {
    const lines = readFileSync(DISPOSABLE_DOMAINS_FILE, 'utf8').split(/\r?\n/);
    domains = new Set(lines.map((l) => l.trim().toLowerCase()).filter((l) => l && !l.startsWith('#')));
    logger.debug('Disposable email domain list loaded', { domains: domains.size });
  }
  return domains;
}

/** True if exactly this domain is on the built-in disposable list (check parents separately). */
export function isDisposableDomain(domain: string): boolean {
  return load().has(domain);
}
