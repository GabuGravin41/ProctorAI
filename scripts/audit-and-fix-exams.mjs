/**
 * audit-and-fix-exams.mjs
 *
 * Audits all public practice exams in the database:
 *  1. Detects exact duplicate question texts within the same exam
 *  2. Detects near-duplicate questions (same question, minor wording changes)
 *  3. Reports sensible vs. nonsensical questions
 *  4. Offers to fix: delete duplicate questions or delete entire exams with too many issues
 *
 * Usage:
 *   node scripts/audit-and-fix-exams.mjs          # audit only (dry run)
 *   node scripts/audit-and-fix-exams.mjs --fix     # apply fixes
 *   node scripts/audit-and-fix-exams.mjs --nuke-exam <examId>  # delete a specific exam
 */

import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

function loadEnv() {
  try {
    const env = readFileSync('.env', 'utf8');
    for (const line of env.split('\n')) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const val = match[2].trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  } catch {
    // fallback to environment variables
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  process.exit(1);
}

const FIX_MODE = process.argv.includes('--fix');
const NUKE_EXAM_IDX = process.argv.indexOf('--nuke-exam');
const NUKE_EXAM_ID = NUKE_EXAM_IDX !== -1 ? parseInt(process.argv[NUKE_EXAM_IDX + 1]) : null;

// Normalise a question string for comparison
function normalise(text) {
  return text
    .toLowerCase()
    .replace(/\\[\(\)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Simple similarity: share >= 85% of words
function isTooSimilar(a, b) {
  const wordsA = new Set(normalise(a).split(' ').filter(w => w.length > 3));
  const wordsB = new Set(normalise(b).split(' ').filter(w => w.length > 3));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let common = 0;
  for (const w of wordsA) if (wordsB.has(w)) common++;
  const similarity = common / Math.min(wordsA.size, wordsB.size);
  return similarity >= 0.85;
}

// Sanity checks for a single question
function assessQuestion(q) {
  const issues = [];

  if (!q.text || q.text.trim().length < 10) {
    issues.push('Question text is too short or empty');
  }

  if (q.type === 'multiple_choice') {
    const opts = q.options;
    if (!opts || opts.length < 2) {
      issues.push('Multiple-choice question has fewer than 2 options');
    } else {
      const uniqueOpts = new Set(opts.map(o => o && o.trim().toLowerCase()));
      if (uniqueOpts.size < opts.length) {
        issues.push('Duplicate options in multiple-choice question');
      }
      if (!q.correct_answer || !opts.map(o => String(o)).includes(String(q.correct_answer))) {
        issues.push('Correct answer is not among the options');
      }
    }
  }

  if (q.type === 'true_false') {
    const ca = String(q.correct_answer || '').toLowerCase();
    if (!['true', 'false'].includes(ca)) {
      issues.push('true/false question has invalid correct_answer: ' + q.correct_answer);
    }
  }

  if ((q.type === 'short_answer' || q.type === 'essay') && !q.reference_solution && !q.correct_answer) {
    issues.push('No reference solution or correct answer provided for open-ended question');
  }

  return issues;
}

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
  await client.connect();
  console.log('Connected to database\n');

  if (NUKE_EXAM_ID) {
    console.log('Nuking exam ID ' + NUKE_EXAM_ID + '...');
    await client.query('DELETE FROM questions WHERE exam_id = $1', [NUKE_EXAM_ID]);
    await client.query('DELETE FROM exams WHERE id = $1', [NUKE_EXAM_ID]);
    console.log('Exam ' + NUKE_EXAM_ID + ' deleted.');
    await client.end();
    return;
  }

  const examsResult = await client.query(
    'SELECT id, title, subject, status, is_public, grading_mode, exam_type, duration_minutes FROM exams WHERE is_public = true ORDER BY id'
  );

  const exams = examsResult.rows;
  console.log('Found ' + exams.length + ' public practice exam(s).\n');

  const SUMMARY = { totalExams: exams.length, examsWithIssues: 0, totalDuplicates: 0, totalBadQuestions: 0, deletedQuestions: 0, deletedExams: 0 };

  for (const exam of exams) {
    const qResult = await client.query(
      'SELECT id, text, type, options, correct_answer, reference_solution, points, "order" FROM questions WHERE exam_id = $1 ORDER BY "order"',
      [exam.id]
    );

    const questions = qResult.rows;
    const examIssues = [];
    const duplicatesToDelete = new Set();

    // Check for duplicate / near-duplicate questions
    for (let i = 0; i < questions.length; i++) {
      for (let j = i + 1; j < questions.length; j++) {
        const qi = questions[i];
        const qj = questions[j];
        const normI = normalise(qi.text);
        const normJ = normalise(qj.text);

        if (normI === normJ) {
          examIssues.push('  EXACT DUPLICATE: Q' + (i+1) + ' (id:' + qi.id + ') == Q' + (j+1) + ' (id:' + qj.id + ')');
          duplicatesToDelete.add(qj.id);
          SUMMARY.totalDuplicates++;
        } else if (isTooSimilar(qi.text, qj.text)) {
          examIssues.push('  NEAR-DUPLICATE:  Q' + (i+1) + ' (id:' + qi.id + ') ~= Q' + (j+1) + ' (id:' + qj.id + ')');
          duplicatesToDelete.add(qj.id);
          SUMMARY.totalDuplicates++;
        }
      }
    }

    // Sanity-check individual questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const issues = assessQuestion(q);
      if (issues.length > 0) {
        for (const iss of issues) {
          examIssues.push('  BAD Q' + (i+1) + ' (id:' + q.id + '): ' + iss);
        }
        SUMMARY.totalBadQuestions++;
      }
    }

    const hasIssues = examIssues.length > 0;
    if (hasIssues) SUMMARY.examsWithIssues++;

    const icon = hasIssues ? '[ISSUES]' : '[OK]    ';
    console.log(icon + ' [ID:' + exam.id + '] "' + exam.title + '" (' + exam.subject + ') -- ' + questions.length + ' questions');

    if (examIssues.length > 0) {
      for (const iss of examIssues) console.log(iss);

      const badRatio = (duplicatesToDelete.size) / Math.max(questions.length, 1);

      if (FIX_MODE && duplicatesToDelete.size > 0) {
        for (const qid of duplicatesToDelete) {
          await client.query('DELETE FROM questions WHERE id = $1', [qid]);
          SUMMARY.deletedQuestions++;
        }
        console.log('  --> Deleted ' + duplicatesToDelete.size + ' duplicate question(s) from exam ID ' + exam.id);
      }

      if (FIX_MODE && badRatio > 0.6 && questions.length > 0) {
        console.log('  --> Over 60% duplicates -- deleting entire exam ID ' + exam.id + '...');
        await client.query('DELETE FROM questions WHERE exam_id = $1', [exam.id]);
        await client.query('DELETE FROM exams WHERE id = $1', [exam.id]);
        SUMMARY.deletedExams++;
        console.log('  --> Exam ID ' + exam.id + ' deleted.');
      }
    }

    console.log('');
  }

  console.log('==========================================================');
  console.log('SUMMARY');
  console.log('==========================================================');
  console.log('Total public exams:          ' + SUMMARY.totalExams);
  console.log('Exams with issues:           ' + SUMMARY.examsWithIssues);
  console.log('Duplicate questions found:   ' + SUMMARY.totalDuplicates);
  console.log('Bad/incomplete questions:    ' + SUMMARY.totalBadQuestions);
  if (FIX_MODE) {
    console.log('Duplicate questions deleted: ' + SUMMARY.deletedQuestions);
    console.log('Exams deleted (>60% dups):   ' + SUMMARY.deletedExams);
  } else {
    console.log('\nRun with --fix to apply fixes automatically.');
    console.log('Run with --nuke-exam <id> to delete one specific exam.');
  }

  await client.end();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
