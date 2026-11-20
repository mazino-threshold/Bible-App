import type { Request, Response } from 'express';
import { currentUser } from '../auth/auth.middleware';
import { removeDomainRule, setDomainRule } from './commands/set-domain-rule.command';
import { findDomainRules } from './data/email-domains.reads';
import { toDomainRuleDto } from './email-domains.mapper';
import { domainCheckSchema, domainParams, domainRuleSchema } from './email-domains.schemas';
import { checkEmailDomain } from './queries/check-email-domain.query';

/** GET /admin/email-domains */
export async function listDomainRulesHandler(_req: Request, res: Response) {
  res.json({ rules: (await findDomainRules()).map(toDomainRuleDto) });
}

/** GET /admin/email-domains/check?email=...|domain=... */
export async function checkDomainHandler(req: Request, res: Response) {
  const query = domainCheckSchema.parse(req.query);
  res.json({ check: await checkEmailDomain('email' in query ? query.email : query.domain) });
}

/** PUT /admin/email-domains/:domain */
export async function setDomainRuleHandler(req: Request, res: Response) {
  const { domain } = domainParams.parse(req.params);
  const rule = await setDomainRule(domain, domainRuleSchema.parse(req.body ?? {}), currentUser(req).id);
  res.json({ rule });
}

/** DELETE /admin/email-domains/:domain */
export async function removeDomainRuleHandler(req: Request, res: Response) {
  const { domain } = domainParams.parse(req.params);
  await removeDomainRule(domain, currentUser(req).id);
  res.status(204).end();
}
