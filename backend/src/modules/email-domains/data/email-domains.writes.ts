import { db } from '../../../db/pool';
import type { DomainRuleAction, DomainRuleRow } from '../email-domains.types';

/** Adds a rule, or replaces the one already there for this domain. */
export async function upsertDomainRule(rule: {
  domain: string;
  action: DomainRuleAction;
  reason: string | null;
  adminId: string;
}): Promise<DomainRuleRow> {
  const { rows } = await db.query<DomainRuleRow>(
    `INSERT INTO email_domain_rules (domain, action, reason, created_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (domain) DO UPDATE
       SET action = EXCLUDED.action, reason = EXCLUDED.reason, created_by = EXCLUDED.created_by, updated_at = now()
     RETURNING domain, action, reason, created_by, created_at, updated_at`,
    [rule.domain, rule.action, rule.reason, rule.adminId],
  );
  return rows[0]!;
}

/** Returns false if there was no rule for this domain. */
export async function deleteDomainRule(domain: string): Promise<boolean> {
  const { rowCount } = await db.query('DELETE FROM email_domain_rules WHERE domain = $1', [domain]);
  return (rowCount ?? 0) > 0;
}
