import { Router } from 'express';
import { requireAdmin, requireAuth } from '../auth/auth.middleware';
import {
  checkDomainHandler,
  listDomainRulesHandler,
  removeDomainRuleHandler,
  setDomainRuleHandler,
} from './email-domains.controller';

/** Admins only: which email domains may register. Mounted at /admin/email-domains */
export const adminEmailDomainsRouter = Router();

adminEmailDomainsRouter.use(requireAuth, requireAdmin);

adminEmailDomainsRouter.get('/', listDomainRulesHandler);
// Before /:domain so 'check' isn't read as a domain
adminEmailDomainsRouter.get('/check', checkDomainHandler);
adminEmailDomainsRouter.put('/:domain', setDomainRuleHandler);
adminEmailDomainsRouter.delete('/:domain', removeDomainRuleHandler);
