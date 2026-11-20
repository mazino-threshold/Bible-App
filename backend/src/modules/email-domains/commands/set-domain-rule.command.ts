import { HttpError } from '../../../shared/errors';
import { logger } from '../../../shared/logger';
import { deleteDomainRule, upsertDomainRule } from '../data/email-domains.writes';
import { toDomainRuleDto } from '../email-domains.mapper';
import type { DomainRuleInput } from '../email-domains.schemas';
import type { DomainRuleDto } from '../email-domains.types';

/** Blocks or allows a domain (and its subdomains) for sign-up. Replaces any rule already there. */
export async function setDomainRule(domain: string, input: DomainRuleInput, adminId: string): Promise<DomainRuleDto> {
  const rule = await upsertDomainRule({ domain, action: input.action, reason: input.reason || null, adminId });
  logger.info('Email domain rule set', { domain, action: input.action, changedBy: adminId });
  return toDomainRuleDto(rule);
}

/** Removes an admin rule, so the domain goes back to the default (blocked only if on the disposable list). */
export async function removeDomainRule(domain: string, adminId: string): Promise<void> {
  if (!(await deleteDomainRule(domain))) {
    throw new HttpError(404, 'There is no rule for this domain');
  }
  logger.info('Email domain rule removed', { domain, changedBy: adminId });
}
