// Downloads the latest community list of disposable email domains into data/disposable-email-domains.txt.
// Review the git diff before committing (e.g. check no mainstream provider like gmail.com was added).
// Usage: npm run update-disposable-domains
import { writeFileSync } from 'node:fs';
import { DISPOSABLE_DOMAINS_FILE } from '../modules/email-domains/disposable-domains';

const SOURCE =
  'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf';
// Never block these, whatever the list says
const NEVER_BLOCK = ['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'proton.me', 'protonmail.com'];

async function main() {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);

  const domains = [...new Set((await res.text()).split(/\r?\n/).map((l) => l.trim().toLowerCase()))]
    .filter((d) => d && !d.startsWith('#') && /^[a-z0-9.-]+\.[a-z0-9-]+$/.test(d) && !NEVER_BLOCK.includes(d))
    .sort();
  if (domains.length < 1000) throw new Error(`Only ${domains.length} domains downloaded; refusing to overwrite`);

  const header = [
    "# Disposable / throwaway email domains. People can't register with these (or any subdomain of them).",
    '# Source: https://github.com/disposable-email-domains/disposable-email-domains (CC0 1.0, public domain)',
    `# Updated: ${new Date().toISOString().slice(0, 10)}. Refresh with: npm run update-disposable-domains`,
    "# Admins can override a domain here with an 'allow' rule (PUT /admin/email-domains/{domain}).",
  ];
  writeFileSync(DISPOSABLE_DOMAINS_FILE, [...header, ...domains, ''].join('\n'));
  console.log(`Wrote ${domains.length} domains to ${DISPOSABLE_DOMAINS_FILE}`);
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exitCode = 1;
});
