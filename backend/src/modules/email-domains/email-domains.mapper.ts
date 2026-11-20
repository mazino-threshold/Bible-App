import type { DomainRuleDto, DomainRuleRow } from './email-domains.types';

export function toDomainRuleDto(rule: DomainRuleRow): DomainRuleDto {
  return {
    domain: rule.domain,
    action: rule.action,
    reason: rule.reason,
    createdBy: rule.created_by,
    createdAt: rule.created_at,
    updatedAt: rule.updated_at,
  };
}
