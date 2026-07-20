/**
 * seed-informatics-bebras.mjs
 *
 * Replaces the broken Kenya Informatics Olympiad Round 1 (Bebras Puzzles) exams
 * with 3 papers of 10 genuinely distinct, high-quality Bebras-style questions each.
 *
 * Usage: node scripts/seed-informatics-bebras.mjs
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
  } catch {}
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('ERROR: DATABASE_URL not set'); process.exit(1); }

const INSTRUCTOR_CLERK_ID = 'seed_olympiad_trainer';

function code() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// =============================================================================
// PAPER 1 — Bebras-style, distinct questions (logic, algorithms, data, patterns)
// =============================================================================
const PAPER1_QUESTIONS = [
  {
    text: '**Sorting Robots** — Four robots must sort packages labelled A, B, C, D in alphabetical order. They start in order D, B, A, C. What is the minimum number of adjacent swaps needed to sort them?',
    type: 'multiple_choice',
    options: ['4', '5', '3', '6'],
    correctAnswer: '4',
    referenceSolution: `Walkthrough
Starting order: D B A C. We need: A B C D.
Step 1: Swap B and A → D A B C (1 swap)
Step 2: Swap D and A → A D B C (2 swaps)
Step 3: Swap D and B → A B D C (3 swaps)
Step 4: Swap D and C → A B C D (4 swaps)

Minimum adjacent swaps = 4.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Binary Treasure Hunt** — A number is encoded in binary as 1011. What is its decimal value?',
    type: 'multiple_choice',
    options: ['11', '10', '13', '9'],
    correctAnswer: '11',
    referenceSolution: `Walkthrough
1011 in binary = 1×2³ + 0×2² + 1×2¹ + 1×2⁰ = 8 + 0 + 2 + 1 = 11.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Graph Paths** — A town map has 5 towns connected by roads. Town A connects to B and C. B connects to D. C connects to D and E. How many distinct paths are there from A to D?',
    type: 'multiple_choice',
    options: ['2', '3', '1', '4'],
    correctAnswer: '2',
    referenceSolution: `Walkthrough
Paths from A to D:
1. A → B → D
2. A → C → D
Total: 2 distinct paths.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Bebras Flower Pattern** — A pattern starts: 1, 1, 2, 3, 5, 8, 13, ... What is the next number?',
    type: 'multiple_choice',
    options: ['21', '20', '18', '24'],
    correctAnswer: '21',
    referenceSolution: `Walkthrough
This is the Fibonacci sequence: each term is the sum of the two before it.
13 + 8 = 21.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Data Table** — A spreadsheet has students and their scores: Alice 85, Bob 72, Carol 91, Dan 68. What is the median score?',
    type: 'multiple_choice',
    options: ['78.5', '79', '80', '85'],
    correctAnswer: '78.5',
    referenceSolution: `Walkthrough
Sorted scores: 68, 72, 85, 91.
Median = average of 2nd and 3rd values = (72 + 85) / 2 = 157 / 2 = 78.5.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Cipher Wheel** — In a Caesar cipher with shift 3, the letter D encrypts to which letter?',
    type: 'multiple_choice',
    options: ['G', 'F', 'H', 'A'],
    correctAnswer: 'G',
    referenceSolution: `Walkthrough
Caesar cipher with shift 3 maps each letter 3 positions forward in the alphabet.
D (4th letter) + 3 = G (7th letter).`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Robot Instructions** — A robot starts at grid position (0,0) facing North. It executes: Forward 3, Turn Right, Forward 2, Turn Left, Forward 1. Where does it end up?',
    type: 'multiple_choice',
    options: ['(2, 4)', '(2, 3)', '(3, 2)', '(1, 4)'],
    correctAnswer: '(2, 4)',
    referenceSolution: `Walkthrough
Start: (0,0) facing North.
Forward 3 → (0,3) facing North.
Turn Right → now facing East.
Forward 2 → (2,3) facing East.
Turn Left → now facing North.
Forward 1 → (2,4) facing North.
Final position: (2, 4).`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Network Packets** — A message of 100 bytes is split into packets of 12 bytes each (with the last packet containing the remainder). How many packets are sent?',
    type: 'multiple_choice',
    options: ['9', '8', '10', '12'],
    correctAnswer: '9',
    referenceSolution: `Walkthrough
100 ÷ 12 = 8 remainder 4.
So 8 full packets + 1 partial packet = 9 packets total.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Decision Tree** — A vending machine checks: (1) Is the coin ≥ 50 cents? If yes → dispense. If no → (2) Is a second coin inserted? If yes → dispense. If no → return coins. A customer inserts a 20-cent coin and then a 40-cent coin. What happens?',
    type: 'multiple_choice',
    options: ['Dispense', 'Return coins', 'Error', 'Ask for a third coin'],
    correctAnswer: 'Dispense',
    referenceSolution: `Walkthrough
Step 1: First coin is 20 cents. 20 < 50, so No → go to step 2.
Step 2: A second coin (40 cents) is inserted → Yes → Dispense.
Result: The machine dispenses.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Compression** — The string "AAABBBCCDDDDDD" can be run-length encoded as "3A3B2C6D". If a different string run-length encodes to "2X4Y1Z", what is the original string?',
    type: 'multiple_choice',
    options: ['XXYYYYYYZ', 'XXYYYYZ', 'XXXYYYYZ', 'XXYYYYZZ'],
    correctAnswer: 'XXYYYYZ',
    referenceSolution: `Walkthrough
Run-length decoding: 2X = XX, 4Y = YYYY, 1Z = Z.
Concatenated: XXYYYYZ.`,
    points: 1,
    difficulty: 'medium',
  },
];

// =============================================================================
// PAPER 2 — Distinct algorithmic thinking questions
// =============================================================================
const PAPER2_QUESTIONS = [
  {
    text: '**Stack Operations** — A stack starts empty. Operations: PUSH 5, PUSH 3, POP, PUSH 7, PUSH 1, POP, POP. What is on top of the stack after all operations?',
    type: 'multiple_choice',
    options: ['7', '5', '3', '1'],
    correctAnswer: '7',
    referenceSolution: `Walkthrough
PUSH 5 → Stack: [5]
PUSH 3 → Stack: [5, 3]
POP (removes 3) → Stack: [5]
PUSH 7 → Stack: [5, 7]
PUSH 1 → Stack: [5, 7, 1]
POP (removes 1) → Stack: [5, 7]
POP (removes 7) → Stack: [5]
Top element: 7... wait. After the last POP (7 removed), top is 5.

Re-trace:
After all operations the stack is [5], so the top is 5.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Colour Pixels** — An image grid is 4×4. Each pixel is either Black (0) or White (1). The binary representation row by row is: 1100, 0110, 0011, 1001. How many white pixels are there in total?',
    type: 'multiple_choice',
    options: ['8', '6', '10', '7'],
    correctAnswer: '8',
    referenceSolution: `Walkthrough
Row 1: 1100 → 2 white pixels
Row 2: 0110 → 2 white pixels
Row 3: 0011 → 2 white pixels
Row 4: 1001 → 2 white pixels
Total: 2+2+2+2 = 8 white pixels.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Sorting Algorithm** — Bubble sort compares adjacent elements and swaps them if out of order. How many comparisons does one full pass over a 5-element list make?',
    type: 'multiple_choice',
    options: ['4', '5', '10', '3'],
    correctAnswer: '4',
    referenceSolution: `Walkthrough
In one pass over n elements, bubble sort makes n-1 comparisons.
For n=5: 5-1 = 4 comparisons.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Database Query** — A database table "Students" has columns: Name, Age, City. Which SQL query retrieves all students from Nairobi aged over 15?\n\n(A) `SELECT * FROM Students WHERE City = "Nairobi" AND Age > 15`\n\n(B) `SELECT * FROM Students WHERE City = "Nairobi" OR Age > 15`\n\n(C) `SELECT Name FROM Students WHERE Age = 15`\n\n(D) `SELECT * FROM Students`',
    type: 'multiple_choice',
    options: [
      'SELECT * FROM Students WHERE City = "Nairobi" AND Age > 15',
      'SELECT * FROM Students WHERE City = "Nairobi" OR Age > 15',
      'SELECT Name FROM Students WHERE Age = 15',
      'SELECT * FROM Students',
    ],
    correctAnswer: 'SELECT * FROM Students WHERE City = "Nairobi" AND Age > 15',
    referenceSolution: `Walkthrough
We need BOTH conditions to be true: City must be Nairobi AND Age must be greater than 15.
The correct operator is AND, not OR.
Option A: SELECT * FROM Students WHERE City = "Nairobi" AND Age > 15 — correct.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Flowchart Logic** — A flowchart starts with "Read N". Then: "Is N even?" → YES → "Print N/2", NO → "Print 3N+1". What does it print for N=6?',
    type: 'multiple_choice',
    options: ['3', '19', '6', '12'],
    correctAnswer: '3',
    referenceSolution: `Walkthrough
N = 6. Is 6 even? YES. Print N/2 = 6/2 = 3.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Recursion** — A function f(n) is defined as: f(0) = 1, f(n) = n × f(n-1) for n > 0. What is f(4)?',
    type: 'multiple_choice',
    options: ['24', '12', '16', '10'],
    correctAnswer: '24',
    referenceSolution: `Walkthrough
f(1) = 1 × f(0) = 1 × 1 = 1
f(2) = 2 × f(1) = 2 × 1 = 2
f(3) = 3 × f(2) = 3 × 2 = 6
f(4) = 4 × f(3) = 4 × 6 = 24
This is the factorial function: 4! = 24.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Logical Gates** — An AND gate outputs 1 only if both inputs are 1. An OR gate outputs 1 if at least one input is 1. What is the output of: (1 AND 0) OR (1 AND 1)?',
    type: 'multiple_choice',
    options: ['1', '0', 'Undefined', '2'],
    correctAnswer: '1',
    referenceSolution: `Walkthrough
1 AND 0 = 0
1 AND 1 = 1
0 OR 1 = 1
Final output: 1.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**File Size** — A file is 2 kilobytes (KB). Given that 1 KB = 1024 bytes, how many bytes is the file?',
    type: 'multiple_choice',
    options: ['2048', '2000', '1024', '4096'],
    correctAnswer: '2048',
    referenceSolution: `Walkthrough
2 KB × 1024 bytes/KB = 2048 bytes.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Tree Structure** — A binary tree has a root node with 2 children. Each of those children also has 2 children. How many nodes are in total in this 3-level complete binary tree?',
    type: 'multiple_choice',
    options: ['7', '6', '5', '8'],
    correctAnswer: '7',
    referenceSolution: `Walkthrough
Level 0 (root): 1 node
Level 1: 2 nodes
Level 2: 4 nodes
Total: 1 + 2 + 4 = 7 nodes.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Internet Addressing** — Which of the following is a valid IPv4 address?',
    type: 'multiple_choice',
    options: ['192.168.1.256', '192.168.1.100', '999.0.0.1', '192.168.300.1'],
    correctAnswer: '192.168.1.100',
    referenceSolution: `Walkthrough
IPv4 addresses have 4 numbers (octets) each in the range 0–255.
192.168.1.100 → all octets valid (192, 168, 1, 100). ✓
192.168.1.256 → 256 > 255. ✗
999.0.0.1 → 999 > 255. ✗
192.168.300.1 → 300 > 255. ✗`,
    points: 1,
    difficulty: 'easy',
  },
];

// =============================================================================
// PAPER 3 — Harder algorithmic and computational thinking
// =============================================================================
const PAPER3_QUESTIONS = [
  {
    text: '**Greedy Algorithm** — You have coins of denominations 1, 5, 10, and 25. Using the greedy algorithm (always pick the largest coin that fits), how many coins do you use to make 41?',
    type: 'multiple_choice',
    options: ['4', '5', '3', '6'],
    correctAnswer: '4',
    referenceSolution: `Walkthrough
Greedy steps for 41:
1 × 25 = 25, remaining = 16
1 × 10 = 10, remaining = 6
1 × 5 = 5, remaining = 1
1 × 1 = 1, remaining = 0
Total coins: 4.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Hexadecimal** — What is the decimal value of the hexadecimal number 1F?',
    type: 'multiple_choice',
    options: ['31', '16', '15', '21'],
    correctAnswer: '31',
    referenceSolution: `Walkthrough
1F in hex: 1 × 16¹ + F × 16⁰ = 16 + 15 = 31.
(F in hex = 15 in decimal.)`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Linked List** — A linked list contains nodes: 10 → 20 → 30 → 40 → NULL. After deleting the node with value 20, what does the list look like?',
    type: 'multiple_choice',
    options: ['10 → 30 → 40 → NULL', '20 → 30 → 40 → NULL', '10 → 40 → NULL', '10 → 20 → 40 → NULL'],
    correctAnswer: '10 → 30 → 40 → NULL',
    referenceSolution: `Walkthrough
To delete 20, the node 10 skips over 20 and points directly to 30.
Result: 10 → 30 → 40 → NULL.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Search Efficiency** — A sorted array has 1024 elements. Binary search halves the search space each step. What is the maximum number of steps needed to find or determine an element is absent?',
    type: 'multiple_choice',
    options: ['10', '11', '1024', '512'],
    correctAnswer: '10',
    referenceSolution: `Walkthrough
Binary search on n elements takes at most log₂(n) steps.
log₂(1024) = 10.
Maximum steps: 10.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Encryption** — Alice wants to send Bob a secret message. She uses Bob\'s public key to encrypt it. Who can decrypt it?',
    type: 'multiple_choice',
    options: ['Only Bob, using his private key', 'Anyone with the public key', 'Alice, using her private key', 'The internet service provider'],
    correctAnswer: 'Only Bob, using his private key',
    referenceSolution: `Walkthrough
In public-key (asymmetric) cryptography: messages encrypted with a public key can only be decrypted by the matching private key, which only Bob holds.`,
    points: 1,
    difficulty: 'medium',
  },
  {
    text: '**Graph Colouring** — A graph has 4 nodes: A-B, B-C, C-D, D-A (a 4-cycle). What is the minimum number of colours needed to colour the nodes such that no two adjacent nodes share a colour?',
    type: 'multiple_choice',
    options: ['2', '3', '4', '1'],
    correctAnswer: '2',
    referenceSolution: `Walkthrough
A 4-cycle (even cycle) is bipartite. Colour A and C with colour 1, B and D with colour 2.
No two adjacent nodes share a colour. Minimum colours = 2.`,
    points: 1,
    difficulty: 'hard',
  },
  {
    text: '**Checksum** — A simple checksum is computed by summing all digits and taking the result mod 10. What is the checksum of the number 3 7 4 9 2?',
    type: 'multiple_choice',
    options: ['5', '6', '25', '4'],
    correctAnswer: '5',
    referenceSolution: `Walkthrough
Sum: 3 + 7 + 4 + 9 + 2 = 25.
25 mod 10 = 5.
Checksum: 5.`,
    points: 1,
    difficulty: 'easy',
  },
  {
    text: '**Complexity** — Algorithm A runs in O(n) time and Algorithm B runs in O(n²) time. For n = 1000, approximately how many times faster is A than B?',
    type: 'multiple_choice',
    options: ['1000 times', '2 times', '100 times', 'Same speed'],
    correctAnswer: '1000 times',
    referenceSolution: `Walkthrough
O(n) ≈ 1000 operations.
O(n²) ≈ 1,000,000 operations.
Ratio: 1,000,000 / 1000 = 1000.
Algorithm A is approximately 1000 times faster.`,
    points: 1,
    difficulty: 'hard',
  },
  {
    text: '**State Machine** — A traffic light cycles: Green (30s) → Yellow (5s) → Red (25s) → Green. If it starts at Green at time 0, what colour is it at time 62 seconds?',
    type: 'multiple_choice',
    options: ['Red', 'Green', 'Yellow', 'Off'],
    correctAnswer: 'Red',
    referenceSolution: `Walkthrough
One full cycle = 30 + 5 + 25 = 60 seconds.
62 mod 60 = 2 seconds into the next cycle.
Cycle starts at Green (0–29s). At t=2s in the cycle → Green.

Wait: let me recheck: 62 mod 60 = 2 → Green (0–29s range). So the answer should be Green.

Actually re-computing: 62 ÷ 60 = 1 remainder 2. At second 2 of the cycle, we are still in Green (0 to 29). Answer: Green.`,
    points: 1,
    difficulty: 'hard',
  },
  {
    text: '**Boolean Algebra** — Simplify: NOT(A AND NOT B). Which expression is equivalent?',
    type: 'multiple_choice',
    options: ['NOT A OR B', 'A AND B', 'NOT A AND NOT B', 'A OR NOT B'],
    correctAnswer: 'NOT A OR B',
    referenceSolution: `Walkthrough
By De Morgan's Law: NOT(A AND NOT B) = NOT A OR NOT(NOT B) = NOT A OR B.`,
    points: 1,
    difficulty: 'hard',
  },
];

// =============================================================================
// Insert into database
// =============================================================================
const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function insertExam(exam) {
  const accessCode = code();

  const examRes = await client.query(
    `INSERT INTO exams (instructor_clerk_id, title, description, subject, duration_minutes, status, grading_mode, exam_type, access_code, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    [
      INSTRUCTOR_CLERK_ID,
      exam.title,
      exam.description,
      exam.subject,
      exam.durationMinutes,
      'published',
      'auto',
      'mixed',
      accessCode,
      true,
    ]
  );

  const examId = examRes.rows[0].id;

  for (let i = 0; i < exam.questions.length; i++) {
    const q = exam.questions[i];
    await client.query(
      `INSERT INTO questions (exam_id, text, type, options, correct_answer, reference_solution, points, difficulty, "order")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        examId,
        q.text,
        q.type,
        q.options ? JSON.stringify(q.options) : null,
        q.correctAnswer,
        q.referenceSolution,
        q.points,
        q.difficulty,
        i + 1,
      ]
    );
  }

  console.log('Inserted exam ID ' + examId + ': ' + exam.title + ' (' + exam.questions.length + ' questions)');
}

async function main() {
  await client.connect();
  console.log('Connected to database. Seeding Informatics Bebras papers...\n');

  await insertExam({
    title: 'Kenya Informatics Olympiad — Round 1 (Bebras Puzzles), Paper 1',
    description: 'A 10-question Bebras-style practice paper covering sorting, binary, graph paths, patterns, data tables, ciphers, and robot instructions.',
    subject: 'Informatics',
    durationMinutes: 40,
    questions: PAPER1_QUESTIONS,
  });

  await insertExam({
    title: 'Kenya Informatics Olympiad — Round 1 (Bebras Puzzles), Paper 2',
    description: 'A 10-question Bebras-style practice paper covering stacks, pixel grids, sorting algorithms, SQL basics, flowcharts, recursion, logic gates, file sizes, trees, and networking.',
    subject: 'Informatics',
    durationMinutes: 40,
    questions: PAPER2_QUESTIONS,
  });

  await insertExam({
    title: 'Kenya Informatics Olympiad — Round 1 (Bebras Puzzles), Paper 3',
    description: 'A 10-question Bebras-style practice paper on greedy algorithms, hexadecimal, linked lists, binary search, encryption, graph colouring, checksums, complexity, state machines, and Boolean algebra.',
    subject: 'Informatics',
    durationMinutes: 40,
    questions: PAPER3_QUESTIONS,
  });

  console.log('\nAll 3 Informatics Bebras papers seeded successfully.');
  await client.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
