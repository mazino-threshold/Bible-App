import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateStreak, canToggle, dayStatus } from '../../src/modules/checkins/checkins.logic';

const TODAY = '2026-11-04'; // Wednesday

describe('day status', () => {
  it('read wins over everything', () => {
    assert.equal(dayStatus('2026-11-02', TODAY, true, true), 'read');
    assert.equal(dayStatus(TODAY, TODAY, true, true), 'read');
  });

  it('today with a reading is pending until ticked', () => {
    assert.equal(dayStatus(TODAY, TODAY, true, false), 'pending');
  });

  it('a past day with a reading not ticked is missed', () => {
    assert.equal(dayStatus('2026-11-03', TODAY, true, false), 'missed');
  });

  it('future days are upcoming, with or without a reading', () => {
    assert.equal(dayStatus('2026-11-05', TODAY, true, false), 'upcoming');
    assert.equal(dayStatus('2026-11-05', TODAY, false, false), 'upcoming');
  });

  it('days with nothing scheduled are no_reading', () => {
    assert.equal(dayStatus('2026-11-03', TODAY, false, false), 'no_reading');
    assert.equal(dayStatus(TODAY, TODAY, false, false), 'no_reading');
  });
});

describe('canToggle', () => {
  it('only today, and only if there is a reading', () => {
    assert.equal(canToggle(TODAY, TODAY, true), true);
    assert.equal(canToggle(TODAY, TODAY, false), false);
    assert.equal(canToggle('2026-11-03', TODAY, true), false);
    assert.equal(canToggle('2026-11-05', TODAY, true), false);
  });
});

describe('streak', () => {
  // History is scheduled reading days only (Sundays and unscheduled days never appear), newest first
  const day = (reading_date: string, checked_in: boolean) => ({ reading_date, checked_in });

  it('counts consecutive read days back from today', () => {
    const history = [day(TODAY, true), day('2026-11-03', true), day('2026-11-02', true), day('2026-10-31', false)];
    assert.equal(calculateStreak(history, TODAY), 3);
  });

  it('today not ticked yet does not break the streak', () => {
    const history = [day(TODAY, false), day('2026-11-03', true), day('2026-11-02', true)];
    assert.equal(calculateStreak(history, TODAY), 2);
  });

  it('carries across Sunday', () => {
    // Monday 2 Nov, then Saturday 31 Oct: Sunday 1 Nov is not in the history at all
    const history = [day('2026-11-02', true), day('2026-10-31', true), day('2026-10-30', true)];
    assert.equal(calculateStreak(history, '2026-11-02'), 3);
  });

  it('a missed past day resets it', () => {
    const history = [day(TODAY, true), day('2026-11-03', false), day('2026-11-02', true)];
    assert.equal(calculateStreak(history, TODAY), 1);
  });

  it('is 0 with no history', () => {
    assert.equal(calculateStreak([], TODAY), 0);
  });
});
