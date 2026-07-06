import test from 'node:test';
import assert from 'node:assert/strict';
import { formatAuditEventsCsv } from './audit-export.ts';

test('formats audit events as CSV with student and review details', () => {
  const csv = formatAuditEventsCsv([{
    id: 1,
    sessionId: 12,
    type: 'tab_switch',
    description: 'Left the exam tab',
    reviewStatus: 'confirmed',
    reviewNote: 'Student looked at notes',
    detectedAt: '2026-01-01T00:00:00.000Z',
    reviewedAt: '2026-01-01T00:01:00.000Z',
    studentName: 'Ada',
    studentEmail: 'ada@example.com',
    accessCode: 'ABC123',
    examTitle: 'Math Finals',
  }]);

  assert.match(csv, /studentName/);
  assert.match(csv, /Ada/);
  assert.match(csv, /confirmed/);
  assert.match(csv, /Math Finals/);
});
