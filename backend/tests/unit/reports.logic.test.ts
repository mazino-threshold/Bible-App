import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyFilters, summarize } from '../../src/modules/reports/reports.logic';
import type { WeeklyReportRow } from '../../src/modules/reports/reports.types';

const row = (name: string, days_read: number): WeeklyReportRow => ({
  id: name,
  name,
  email: `${name}@example.com`,
  role: 'user',
  active: true,
  days_read,
  checked_in_dates: [],
});
const rows = [row('ada', 6), row('bola', 5), row('chidi', 4), row('dayo', 3), row('efe', 0)];

describe('report summary', () => {
  it('counts users, everyone who read every scheduled day, and the average', () => {
    assert.deepEqual(summarize(rows, 6), { totalUsers: 5, readEveryDay: 1, averageDaysRead: 3.6 });
  });

  it('measures "every day" against the days actually scheduled', () => {
    assert.equal(summarize(rows, 5).readEveryDay, 2);
  });

  it('nobody read every day in a week with nothing scheduled', () => {
    assert.equal(summarize([row('efe', 0)], 0).readEveryDay, 0);
  });

  it('handles no users', () => {
    assert.deepEqual(summarize([], 6), { totalUsers: 0, readEveryDay: 0, averageDaysRead: 0 });
  });
});

describe('report filters', () => {
  const names = (list: WeeklyReportRow[]) => list.map((r) => r.name);

  it('minDays and maxDays are inclusive', () => {
    assert.deepEqual(names(applyFilters(rows, { minDays: 6 })), ['ada']);
    assert.deepEqual(names(applyFilters(rows, { minDays: 4, maxDays: 5 })), ['bola', 'chidi']);
    assert.deepEqual(names(applyFilters(rows, { maxDays: 3 })), ['dayo', 'efe']);
  });

  it('no filters keeps everyone', () => {
    assert.equal(applyFilters(rows, {}).length, 5);
  });
});
