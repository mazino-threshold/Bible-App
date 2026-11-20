import { findRulesFor } from '../data/email-domains.reads';
import { isDisposableDomain } from '../disposable-domains';
import { checkDomain, domainAndParents, domainOf } from '../email-domains.logic';
import type { DomainCheckDto } from '../email-domains.types';

/** Whether this email (or bare domain) may be used to register, and which rule or list entry decided it. */
export async function checkEmailDomain(emailOrDomain: string): Promise<DomainCheckDto> {
  const domain = emailOrDomain.includes('@') ? domainOf(emailOrDomain) : emailOrDomain.toLowerCase();
  const rules = await findRulesFor(domainAndParents(domain));
  return checkDomain(domain, rules, isDisposableDomain);
}
