import { db } from '../../../db/pool';
import type { DomainRuleAction, DomainRuleRow } from '../email-domains.types';

const COLUMNS = 'domain, action, reason, created_by, created_at, updated_at';

/** Every admin rule, blocks first, then by domain. */
export async function findDomainRules(): Promise<DomainRuleRow[]> {
  const { rows } = await db.query<DomainRuleRow>(
    `SELECT ${COLUMNS} FROM email_domain_rules ORDER BY action DESC, domain`,
  );
  return rows;
}

/** Rules for any of these domains (a domain and its parents). */
export async function findRulesFor(domains: string[]): Promise<Map<string, DomainRuleAction>> {
  const { rows } = await db.query<{ domain: string; action: DomainRuleAction }>(
    'SELECT domain, action FROM email_domain_rules WHERE domain = ANY($1)',
    [domains],
  );
  return new Map(rows.map((r) => [r.domain, r.action]));
}
