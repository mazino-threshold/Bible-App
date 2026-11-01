import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { frequenciesForHour, reminderMessage, slotForTime } from '../../src/modules/reminders/reminders.logic';

const at = (hours: number, minutes = 0) => hours * 60 + minutes;

describe('reminder slot', () => {
  it('matches each reminder hour', () => {
    for (const hour of [6, 9, 12, 15, 18, 21]) {
      assert.equal(slotForTime(at(hour)), hour);
    }
  });

  it('allows the cron job to be up to 15 minutes early or late', () => {
    assert.equal(slotForTime(at(5, 45)), 6);
    assert.equal(slotForTime(at(6, 15)), 6);
    assert.equal(slotForTime(at(5, 44)), null);
    assert.equal(slotForTime(at(6, 16)), null);
  });

  it('is null between slots and at night', () => {
    assert.equal(slotForTime(at(7)), null);
    assert.equal(slotForTime(at(0)), null);
    assert.equal(slotForTime(at(23)), null);
  });
});

describe('who gets which reminder', () => {
  it('follows the agreed frequencies', () => {
    assert.deepEqual(frequenciesForHour(6).sort(), ['high', 'low', 'mid']);
    assert.deepEqual(frequenciesForHour(9), ['high']);
    assert.deepEqual(frequenciesForHour(12).sort(), ['high', 'mid']);
    assert.deepEqual(frequenciesForHour(15), ['high']);
    assert.deepEqual(frequenciesForHour(18).sort(), ['high', 'mid']);
    assert.deepEqual(frequenciesForHour(21).sort(), ['high', 'low', 'mid']);
  });

  it('never includes off', () => {
    for (const hour of [6, 9, 12, 15, 18, 21] as const) {
      assert.ok(!frequenciesForHour(hour).includes('off'));
    }
  });
});

describe('reminder message', () => {
  it('greets in the morning, nudges in the day, and gives a last call at night', () => {
    assert.equal(reminderMessage(6, 'Genesis 1-3').title, "Good morning! Today's reading");
    assert.equal(reminderMessage(6, 'Genesis 1-3').body, 'Genesis 1-3');
    assert.equal(reminderMessage(12, 'Genesis 1-3').title, "Have you read today's portion?");
    assert.match(reminderMessage(21, 'Genesis 1-3').body, /before midnight/);
  });
});
