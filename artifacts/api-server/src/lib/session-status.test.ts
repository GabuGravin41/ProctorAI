import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSessionStatus } from './session-status.ts';

test('normalizeSessionStatus maps common statuses consistently', () => {
  assert.equal(normalizeSessionStatus('not_started'), 'pending');
  assert.equal(normalizeSessionStatus('in_progress'), 'active');
  assert.equal(normalizeSessionStatus('completed'), 'submitted');
  assert.equal(normalizeSessionStatus('abandoned'), 'abandoned');
});
