import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDisposableDomain } from '../../src/modules/email-domains/disposable-domains';
import { checkDomain, domainAndParents, domainOf } from '../../src/modules/email-domains/email-domains.logic';
import type { DomainRuleAction } from '../../src/modules/email-domains/email-domains.types';

const list = new Set(['mailinator.com', 'tempmail.dev']);
const isListed = (d: string) => list.has(d);
const rules = (entries: [string, DomainRuleAction][] = []) => new Map(entries);

describe('email domains', () => {
  it('takes the domain from an email', () => {
    assert.equal(domainOf('Ada@Mail.Example.COM'), 'mail.example.com');
  });

  it('lists a domain and its parents, without the top-level part', () => {
    assert.deepEqual(domainAndParents('a.b.mailinator.com'), ['a.b.mailinator.com', 'b.mailinator.com', 'mailinator.com']);
    assert.deepEqual(domainAndParents('example.com'), ['example.com']);
  });

  it('allows ordinary domains', () => {
    assert.deepEqual(checkDomain('gmail.com', rules(), isListed), {
      domain: 'gmail.com',
      blocked: false,
      source: null,
      matched: null,
    });
  });

  it('blocks listed domains and their subdomains', () => {
    assert.equal(checkDomain('mailinator.com', rules(), isListed).source, 'disposable_list');
    const sub = checkDomain('x.y.mailinator.com', rules(), isListed);
    assert.equal(sub.blocked, true);
    assert.equal(sub.matched, 'mailinator.com');
  });

  it('blocks domains an admin blocked, and their subdomains', () => {
    const r = checkDomain('mx.spam.example', rules([['spam.example', 'block']]), isListed);
    assert.deepEqual([r.blocked, r.source, r.matched], [true, 'admin_block', 'spam.example']);
  });

  it("an admin 'allow' overrides the disposable list", () => {
    const r = checkDomain('tempmail.dev', rules([['tempmail.dev', 'allow']]), isListed);
    assert.deepEqual([r.blocked, r.source], [false, 'admin_allow']);
  });

  it('the most specific admin rule wins', () => {
    const both = rules([
      ['example.org', 'block'],
      ['school.example.org', 'allow'],
    ]);
    assert.equal(checkDomain('school.example.org', both, isListed).blocked, false);
    assert.equal(checkDomain('other.example.org', both, isListed).blocked, true);
  });

  describe('the built-in list', () => {
    it('includes well-known disposable providers', () => {
      assert.ok(isDisposableDomain('mailinator.com'));
      assert.ok(isDisposableDomain('10minutemail.com'));
    });

    it("doesn't include mainstream providers", () => {
      for (const d of ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com']) {
        assert.equal(isDisposableDomain(d), false, d);
      }
    });
  });
});
