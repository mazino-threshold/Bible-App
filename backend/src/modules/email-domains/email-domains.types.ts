export type DomainRuleAction = 'block' | 'allow';

export interface DomainRuleRow {
  domain: string;
  action: DomainRuleAction;
  reason: string | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DomainRuleDto {
  domain: string;
  action: DomainRuleAction;
  reason: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Whether an email's domain may register, and why.
 * 'admin_block' / 'admin_allow' = an admin rule decided it; 'disposable_list' = it is on the built-in list.
 */
export interface DomainCheckDto {
  domain: string;
  blocked: boolean;
  source: 'admin_block' | 'admin_allow' | 'disposable_list' | null;
  /** The rule or list entry that matched, e.g. 'mailinator.com' for 'x.mailinator.com'. */
  matched: string | null;
}
