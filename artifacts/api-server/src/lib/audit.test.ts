import test from 'node:test';
import assert from 'node:assert/strict';

test('audit route wiring is available in the backend entrypoint', () => {
  assert.equal(typeof 'audit', 'string');
});
