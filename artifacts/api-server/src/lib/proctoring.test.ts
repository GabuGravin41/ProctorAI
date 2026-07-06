import test from 'node:test';
import assert from 'node:assert/strict';
import { FLAG_COOLDOWN_MS, normalizeFlagType, shouldThrottleFlag } from './proctoring.ts';

test('normalizeFlagType accepts known proctoring flags', () => {
  assert.equal(normalizeFlagType('tab_switch'), 'tab_switch');
  assert.equal(normalizeFlagType('  fullscreen_exit  '), 'fullscreen_exit');
  assert.equal(normalizeFlagType('unknown_flag'), null);
});

test('shouldThrottleFlag blocks duplicate events within the cooldown window', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const recent = new Date(now.getTime() - FLAG_COOLDOWN_MS / 2);
  assert.equal(shouldThrottleFlag(recent, now), true);

  const old = new Date(now.getTime() - FLAG_COOLDOWN_MS * 2);
  assert.equal(shouldThrottleFlag(old, now), false);
});
