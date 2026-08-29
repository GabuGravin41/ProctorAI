export interface AuditExportRow {
  id: number;
  sessionId: number;
  type: string;
  description: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  detectedAt: string | null;
  reviewedAt: string | null;
  studentName: string | null;
  studentEmail: string | null;
  accessCode: string | null;
  examTitle: string | null;
  screenshotUrl?: string | null;
}

const escape = (value: string | number | null | undefined): string => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export function formatAuditEventsCsv(rows: AuditExportRow[]): string {
  const headers = [
    'id', 'sessionId', 'type', 'description', 'reviewStatus',
    'reviewNote', 'detectedAt', 'reviewedAt', 'studentName',
    'studentEmail', 'accessCode', 'examTitle',
  ];

  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push([
      row.id,
      row.sessionId,
      escape(row.type),
      escape(row.description),
      escape(row.reviewStatus),
      escape(row.reviewNote),
      escape(row.detectedAt),
      escape(row.reviewedAt),
      escape(row.studentName),
      escape(row.studentEmail),
      escape(row.accessCode),
      escape(row.examTitle),
    ].join(','));
  }

  return lines.join('\n');
}

// ─── Per-exam structured audit CSV ───────────────────────────────────────────

interface ExamAuditFlag {
  type: string;
  description: string | null;
  detectedAt: string | null;
  reviewStatus: string;
  reviewNote: string | null;
  screenshotUrl?: string | null;
}

interface ExamAuditSession {
  studentName: string | null;
  studentEmail: string | null;
  accessCode: string;
  status: string;
  score: number | null;
  maxScore: number | null;
  submittedAt: string | null;
  flags: ExamAuditFlag[];
}

/**
 * Generates a two-section CSV audit report for a single exam:
 *
 * Section 1 — Student Summary (one row per student)
 * Section 2 — Proctoring Flag Detail (one row per flag event)
 */
export function formatExamAuditCsv(examTitle: string, sessions: ExamAuditSession[]): string {
  const lines: string[] = [];

  // Header metadata
  lines.push(escape(`ProctorAI Audit Report — ${examTitle}`));
  lines.push(escape(`Generated: ${new Date().toISOString()}`));
  lines.push('');

  // ── Section 1: Student Summary ──────────────────────────────────────────
  lines.push('"=== SECTION 1: STUDENT SUMMARY ==="');
  const summaryHeaders = [
    'Rank', 'Student Name', 'Student Email', 'Access Code',
    'Status', 'Score', 'Max Score', 'Percentage', 'Total Flags', 'Submitted At',
  ];
  lines.push(summaryHeaders.join(','));

  // Sort submitted sessions by score desc, then pending, then others
  const sorted = [...sessions].sort((a, b) => {
    const aScore = a.score ?? -1;
    const bScore = b.score ?? -1;
    return bScore - aScore;
  });

  let rank = 0;
  let lastScore: number | null = null;
  sorted.forEach((s, idx) => {
    const isSubmitted = s.status === 'submitted';
    if (isSubmitted && s.score !== lastScore) {
      rank = idx + 1;
      lastScore = s.score;
    }
    const pct = s.score !== null && s.maxScore
      ? `${Math.round((s.score / s.maxScore) * 100)}%`
      : '';
    lines.push([
      isSubmitted ? rank : escape('N/A'),
      escape(s.studentName),
      escape(s.studentEmail),
      escape(s.accessCode),
      escape(s.status),
      s.score !== null ? s.score : '',
      s.maxScore ?? '',
      escape(pct),
      s.flags.length,
      escape(s.submittedAt ?? ''),
    ].join(','));
  });

  lines.push('');

  // ── Section 2: Flag Detail ───────────────────────────────────────────────
  lines.push('"=== SECTION 2: PROCTORING FLAG DETAIL ==="');
  const flagHeaders = [
    'Student Name', 'Student Email', 'Access Code',
    'Flag Type', 'Description', 'Detected At',
    'Review Status', 'Review Note', 'Screenshot URL',
  ];
  lines.push(flagHeaders.join(','));

  for (const s of sessions) {
    for (const f of s.flags) {
      lines.push([
        escape(s.studentName),
        escape(s.studentEmail),
        escape(s.accessCode),
        escape(f.type.replace(/_/g, ' ')),
        escape(f.description),
        escape(f.detectedAt),
        escape(f.reviewStatus),
        escape(f.reviewNote),
        escape(f.screenshotUrl ?? ''),
      ].join(','));
    }
  }

  return lines.join('\n');
}
