import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { reminderMessage, slotForTime } from '../../src/modules/reminders/reminders.logic';

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

describe('reminder slot', () => {
  it('matches 6 AM and 9 PM', () => {
    assert.equal(slotForTime(at(6)), 6);
    assert.equal(slotForTime(at(21)), 21);
  });

  it('allows the cron job to be up to 15 minutes early or late', () => {
    assert.equal(slotForTime(at(5, 45)), 6);
    assert.equal(slotForTime(at(6, 15)), 6);
    assert.equal(slotForTime(at(5, 44)), null);
    assert.equal(slotForTime(at(6, 16)), null);
    assert.equal(slotForTime(at(20, 50)), 21);
  });

  it('is null at any other time, including the old daytime slots', () => {
    for (const hour of [0, 7, 9, 12, 15, 18, 23]) {
      assert.equal(slotForTime(at(hour)), null, String(hour));
    }
  });
});

describe('reminder message', () => {
  it('greets in the morning and gives a last call at night', () => {
    assert.equal(reminderMessage(6, 'Genesis 1-3').title, "Good morning! Today's reading");
    assert.equal(reminderMessage(6, 'Genesis 1-3').body, 'Genesis 1-3');
    assert.equal(reminderMessage(21, 'Genesis 1-3').title, "Last call for today's reading");
    assert.match(reminderMessage(21, 'Genesis 1-3').body, /before midnight/);
  });
});
