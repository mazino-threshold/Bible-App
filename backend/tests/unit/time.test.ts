import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addDays,
  isReadingDay,
  isoDayOfWeek,
  minutesIntoDayInNigeria,
  readingDaysOfWeek,
  todayInNigeria,
  weekStart,
} from '../../src/shared/time';

describe('Nigeria time', () => {
  it('uses Nigeria time, not UTC, to decide the day', () => {
    // 23:30 UTC on Saturday is already 00:30 Sunday in Lagos
    assert.equal(todayInNigeria(new Date('2026-10-31T23:30:00Z')), '2026-11-01');
    assert.equal(todayInNigeria(new Date('2026-10-31T22:59:00Z')), '2026-10-31');
  });

  it('gives minutes since midnight in Nigeria', () => {
    assert.equal(minutesIntoDayInNigeria(new Date('2026-11-02T05:05:00Z')), 6 * 60 + 5);
  });

  it('numbers days Monday = 1 to Sunday = 7', () => {
    assert.equal(isoDayOfWeek('2026-11-02'), 1);
    assert.equal(isoDayOfWeek('2026-11-07'), 6);
    assert.equal(isoDayOfWeek('2026-11-08'), 7);
  });

  it('finds the Monday of any week (Sunday belongs to the week before)', () => {
    assert.equal(weekStart('2026-11-04'), '2026-11-02');
    assert.equal(weekStart('2026-11-02'), '2026-11-02');
    assert.equal(weekStart('2026-11-08'), '2026-11-02');
  });

  it('adds days across months and years', () => {
    assert.equal(addDays('2026-12-30', 3), '2027-01-02');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  it('lists Monday to Saturday as reading days', () => {
    assert.deepEqual(readingDaysOfWeek('2026-11-02'), [
      '2026-11-02',
      '2026-11-03',
      '2026-11-04',
      '2026-11-05',
      '2026-11-06',
      '2026-11-07',
    ]);
    assert.equal(isReadingDay('2026-11-07'), true);
    assert.equal(isReadingDay('2026-11-08'), false);
  });
});
