const { Client } = require('pg');

const client = new Client({ connectionString: 'postgres://postgres:Colossus123!@localhost:5432/proctor_ai' });

const stmts = [
  // exams table
  'ALTER TABLE exams ADD COLUMN IF NOT EXISTS access_code text',
  'ALTER TABLE exams ADD COLUMN IF NOT EXISTS collaborators jsonb',
  'ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type text',
  // questions table
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty text',
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS rubric jsonb',
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS reference_solution text',
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS correct_answer text',
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS options jsonb',
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS "order" integer NOT NULL DEFAULT 0',
  'ALTER TABLE questions ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()',
  // exam_sessions table — add ALL columns the new schema expects
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS student_email text',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS student_name text',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS access_code text NOT NULL DEFAULT \'LEGACY\'',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS started_at timestamptz',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS completed_at timestamptz',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS submitted_at timestamptz',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS answers jsonb',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS score integer',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS max_score integer',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS is_results_released boolean NOT NULL DEFAULT false',
  'ALTER TABLE exam_sessions ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now()',
  // cheating_flags table
  'ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS clip_data text',
  'ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS review_note text',
  'ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS reviewed_at timestamptz',
  'ALTER TABLE cheating_flags ADD COLUMN IF NOT EXISTS screenshot_url text',
  // answers table
  'ALTER TABLE answers ADD COLUMN IF NOT EXISTS attachments jsonb',
  'ALTER TABLE answers ADD COLUMN IF NOT EXISTS ocr_text text',
  'ALTER TABLE answers ADD COLUMN IF NOT EXISTS ai_score integer',
  'ALTER TABLE answers ADD COLUMN IF NOT EXISTS ai_feedback text',
  'ALTER TABLE answers ADD COLUMN IF NOT EXISTS grading_rubric_scores jsonb',
];

async function run() {
  await client.connect();
  for (const s of stmts) {
    try {
      await client.query(s);
      console.log('OK:', s.slice(0, 70));
    } catch (e) {
      console.log('ERR:', e.message.slice(0, 100));
    }
  }
  await client.end();
  console.log('\nDone!');
}

run();
