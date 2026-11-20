import type { DomainCheckDto, DomainRuleAction } from './email-domains.types';

/** 'Ada@Mail.Example.com' -> 'mail.example.com' */
export function domainOf(email: string): string {
  return email.slice(email.lastIndexOf('@') + 1).trim().toLowerCase();
}

/**
 * The domain and each parent domain, most specific first, stopping before the top-level part:
 * 'a.b.mailinator.com' -> ['a.b.mailinator.com', 'b.mailinator.com', 'mailinator.com'].
 */
export function domainAndParents(domain: string): string[] {
  const parts = domain.split('.');
  const result: string[] = [];
  for (let i = 0; i < parts.length - 1; i++) {
    result.push(parts.slice(i).join('.'));
  }
  return result;
}

/**
 * Decides whether a domain may register. The most specific admin rule wins (so 'allow' on a subdomain beats
 * 'block' on its parent). With no admin rule, it is blocked if it or a parent is on the disposable list.
 */
export function checkDomain(
  domain: string,
  rules: Map<string, DomainRuleAction>,
  isDisposable: (domain: string) => boolean,
): DomainCheckDto {
  const candidates = domainAndParents(domain);

  for (const candidate of candidates) {
    const action = rules.get(candidate);
    if (action === 'block') return { domain, blocked: true, source: 'admin_block', matched: candidate };
    if (action === 'allow') return { domain, blocked: false, source: 'admin_allow', matched: candidate };
  }
  const listed = candidates.find(isDisposable);
  if (listed) return { domain, blocked: true, source: 'disposable_list', matched: listed };

  return { domain, blocked: false, source: null, matched: null };
}
