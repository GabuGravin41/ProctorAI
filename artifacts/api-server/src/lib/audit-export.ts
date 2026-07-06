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
}

export function formatAuditEventsCsv(rows: AuditExportRow[]): string {
  const headers = [
    'id',
    'sessionId',
    'type',
    'description',
    'reviewStatus',
    'reviewNote',
    'detectedAt',
    'reviewedAt',
    'studentName',
    'studentEmail',
    'accessCode',
    'examTitle',
  ];

  const escape = (value: string | null | undefined) => {
    const text = value ?? '';
    return `"${text.replace(/"/g, '""')}"`;
  };

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
