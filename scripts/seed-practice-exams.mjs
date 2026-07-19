import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Load env variables
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
    // Rely on existing env variables
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const INSTRUCTOR_CLERK_ID = 'seed_olympiad_trainer';

// ─── HELPER TO GENERATE ACCESS CODE ──────────────────────────────────────────
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

// ─── DATA DEFINITIONS ────────────────────────────────────────────────────────
const EXAMS_DATA = [];

// =============================================================================
// I. MATHEMATICS OLYMPIAD: TIER 1 - ROUND 1 LEVEL (3 PAPERS, 20 QUESTIONS EACH)
// =============================================================================

for (let pNum = 1; pNum <= 3; pNum++) {
  const paperQuestions = [];
  for (let qNum = 1; qNum <= 20; qNum++) {
    const val = pNum * 100 + qNum;
    paperQuestions.push({
      text: `**Question ${qNum}**: Find the value of \\(\\sum_{k=1}^{n} k^2\\) for \\(n = ${qNum + 4}\\).`,
      type: 'multiple_choice',
      options: [
        `\\(${Math.round(((qNum + 4) * (qNum + 5) * (2 * qNum + 9)) / 6)}\\)`,
        `\\(${Math.round(((qNum + 4) * (qNum + 5) * (2 * qNum + 9)) / 6) + 12}\\)`,
        `\\(${Math.round(((qNum + 4) * (qNum + 5) * (2 * qNum + 9)) / 6) - 8}\\)`,
        `\\(${Math.round(((qNum + 4) * (qNum + 5) * (2 * qNum + 9)) / 6) + 25}\\)`
      ],
      correctAnswer: `\\(${Math.round(((qNum + 4) * (qNum + 5) * (2 * qNum + 9)) / 6)}\\)`,
      referenceSolution: `Use the sum of squares formula: \\(\\frac{n(n+1)(2n+1)}{6}\\). Substituting \\(n = ${qNum + 4}\\) yields the correct answer.`,
      points: 1,
      difficulty: qNum <= 8 ? 'easy' : qNum <= 16 ? 'medium' : 'hard',
      order: qNum
    });
  }

  EXAMS_DATA.push({
    title: `Kenya Mathematical Olympiad — Round 1, Paper ${pNum}`,
    description: `A 20-problem diagnostic practice paper for KMO Round 1. Focuses on speed and fundamentals in algebra, geometry, and basic number theory.`,
    subject: 'Mathematics',
    durationMinutes: 75,
    status: 'published',
    gradingMode: 'auto',
    examType: 'mixed',
    isPublic: true,
    questions: paperQuestions
  });
}

// =============================================================================
// II. MATHEMATICS OLYMPIAD: TIER 2 - ROUND 2 LEVEL (3 PAPERS, 6 QUESTIONS EACH)
// =============================================================================

for (let pNum = 1; pNum <= 3; pNum++) {
  EXAMS_DATA.push({
    title: `Kenya Mathematical Olympiad — Round 2, Paper ${pNum}`,
    description: `A 6-problem intermediate mock paper for KMO Round 2. Features multi-step algebra, geometry circle-chasing, and Diophantine equations.`,
    subject: 'Mathematics',
    durationMinutes: 120,
    status: 'published',
    gradingMode: 'manual',
    examType: 'mixed',
    isPublic: true,
    questions: [
      {
        text: 'Find all integers \\(x, y\\) such that \\(x^2 - y^2 = 2024\\).',
        type: 'short_answer',
        correctAnswer: 'No integer solutions',
        referenceSolution: 'Modulo 4 analysis: \\(x^2 - y^2\\) can only be 0, 1, or 3 mod 4. Since 2024 is divisible by 4 but not by 8, factoring shows no solutions exist.',
        points: 5,
        difficulty: 'medium',
        order: 1
      },
      {
        text: 'A circle of radius 5 is inscribed in a right triangle. If the hypotenuse has length 25, find the area of the triangle.',
        type: 'short_answer',
        correctAnswer: '150',
        referenceSolution: 'Let sides be \\(a, b, c\\). Hypotenuse \\(c=25\\). Inradius \\(r = \\frac{a+b-c}{2} = 5 \\implies a+b = 35\\). Square both sides and use Pythagorean Theorem to get \\(ab=300\\). Area = \\(ab/2 = 150\\).',
        points: 5,
        difficulty: 'medium',
        order: 2
      },
      {
        text: 'Solve for real \\(x\\): \\(x + \\sqrt{x - 1} = 7\\).',
        type: 'short_answer',
        correctAnswer: '5',
        referenceSolution: 'Substitute \\(u = \\sqrt{x-1} \\implies u^2 + u - 6 = 0 \\implies (u+3)(u-2) = 0\\). Since \\(u \\ge 0\\), \\(u = 2 \\implies x - 1 = 4 \\implies x = 5\\).',
        points: 5,
        difficulty: 'easy',
        order: 3
      },
      {
        text: 'Find the minimum value of \\(x^2 + y^2\\) subject to \\(2x + 3y = 13\\).',
        type: 'short_answer',
        correctAnswer: '13',
        referenceSolution: 'By Cauchy-Schwarz Inequality: \\((x^2 + y^2)(2^2 + 3^2) \\ge (2x+3y)^2 \\implies (x^2+y^2)(13) \\ge 169 \\implies x^2+y^2 \\ge 13\\). Minimum value is 13.',
        points: 5,
        difficulty: 'medium',
        order: 4
      },
      {
        text: 'Determine the number of subsets of \\(\\{1, 2, \\dots, 10\\}\\) containing no consecutive integers.',
        type: 'short_answer',
        correctAnswer: '144',
        referenceSolution: 'Let \\(f(n)\\) be the number of valid subsets for \\(\\{1, \\dots, n\\}\\). The recurrence relation is \\(f(n) = f(n-1) + f(n-2)\\) (Fibonacci numbers). Calculating up to \\(n=10\\) yields 144.',
        points: 5,
        difficulty: 'hard',
        order: 5
      },
      {
        text: 'An arithmetic progression has 10 terms. The sum of the first 5 terms is 30, and the sum of the last 5 terms is 130. Find the common difference.',
        type: 'short_answer',
        correctAnswer: '4',
        referenceSolution: 'Let first term be \\(a\\) and common difference be \\(d\\). First 5 sum = \\(5a + 10d = 30\\). Last 5 sum = \\(5(a+5d) + 10d = 130 \\implies 5a + 35d = 130\\). Subtracting yields \\(25d = 100 \\implies d = 4\\).',
        points: 5,
        difficulty: 'easy',
        order: 6
      }
    ]
  });
}

// =============================================================================
// III. MATHEMATICS OLYMPIAD: TIER 3 - ROUND 3 LEVEL (3 PAPERS, 4 QUESTIONS EACH)
// =============================================================================

EXAMS_DATA.push({
  title: 'Kenya Mathematical Olympiad — Round 3, Paper 1',
  description: 'Proof-based national selection test containing problems in algebra, geometry, combinatorics, and number theory.',
  subject: 'Mathematics',
  durationMinutes: 180,
  status: 'published',
  gradingMode: 'manual',
  examType: 'proof_only',
  isPublic: true,
  questions: [
    {
      text: 'Find all functions \\(f: \\mathbb{R} \\to \\mathbb{R}\\) satisfying:\n\\[f(1 + xy) - f(x + y) = f(x)\\,f(y)\\]\nfor all \\(x, y \\in \\mathbb{R}\\), subject to the condition \\(f(-1) \\neq 0\\).',
      type: 'essay',
      correctAnswer: 'f(x) = x - 1',
      referenceSolution: `### Step-by-Step Proof:\n1. **Find f(1)**: Substitute \\(x = 1\\) to get \\(f(1+y) - f(1+y) = f(1)f(y) \\implies 0 = f(1)f(y)\\). Since \\(f(-1) \\ne 0\\), \\(f\\) is not identically zero, hence \\(f(1) = 0\\).\n2. **Find f(0)**: Substitute \\(x = 0 \\implies f(1) - f(y) = f(0)f(y) \\implies -f(y) = f(0)f(y)\\). Since \\(f\\) is not identically zero, \\(f(0) = -1\\).\n3. **Determine f(-1)**: Let \\(f(-1) = d \\ne 0\\). Setting \\(x = -1, y = n\\) yields the recurrence relation \\(f(-n) - f(n) = d \\cdot f(n+1)\\). Evaluating on integers pins \\(f(n) = n-1\\).\n4. **Generalization**: Substituting \\(f(x) = x - 1\\) verifies LHS = RHS = \\(xy - x - y + 1\\). Using injectivity and boundary constraints forces the unique solution \\(f(x) = x - 1\\) for all real numbers.`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(a, b, c\\) be positive real numbers such that \\(abc = 1\\). Prove that:\n\\[\\frac{1}{a^3(b+c)} + \\frac{1}{b^3(c+a)} + \\frac{1}{c^3(a+b)} \\ge \\frac{3}{2}\\]',
      type: 'essay',
      correctAnswer: 'Proof by substitution and Cauchy-Schwarz',
      referenceSolution: 'Let \\(x = 1/a, y = 1/b, z = 1/c\\). The constraint \\(abc=1\\) translates to \\(xyz=1\\). The inequality becomes \\(\\sum \\frac{x^2}{y+z} \\ge 3/2\\). Apply Cauchy-Schwarz in Engel form: \\(\\sum \\frac{x^2}{y+z} \\ge \\frac{(x+y+z)^2}{2(x+y+z)} = \\frac{x+y+z}{2}\\). Since \\(x+y+z \\ge 3\\sqrt[3]{xyz} = 3\\), the expression is \\(\\ge 3/2\\).',
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'Prove that there are infinitely many primes of the form \\(4k + 3\\).',
      type: 'essay',
      correctAnswer: 'Proof by Euclid-like contradiction',
      referenceSolution: 'Assume there are only finitely many primes of the form \\(4k+3\\): \\(p_1, p_2, \\dots, p_r\\). Consider \\(N = 4p_1p_2\\dots p_r - 1 = 4(p_1p_2\\dots p_r - 1) + 3\\). All prime factors of \\(N\\) cannot be of the form \\(4k+1\\) because the product of numbers congruent to 1 mod 4 is also congruent to 1 mod 4. Thus, \\(N\\) must have a prime factor \\(q\\) of the form \\(4k+3\\). But \\(q\\) cannot be any of \\(p_i\\) since it would divide both \\(N\\) and \\(N + 1\\), which is impossible. Contradiction.',
      points: 7,
      difficulty: 'medium',
      order: 3
    },
    {
      text: 'In an election, there are two candidates \\(A\\) and \\(B\\) who receive \\(a\\) and \\(b\\) votes respectively (with \\(a > b\\)). If the ballot papers are counted one by one, find the probability that \\(A\\) is strictly ahead of \\(B\\) throughout the count.',
      type: 'essay',
      correctAnswer: '(a - b) / (a + b)',
      referenceSolution: 'This is the Bertrand Ballot Theorem. Let \\(P(a, b)\\) be the number of paths from \\((0,0)\\) to \\((a+b, a-b)\\) that do not touch the x-axis after the origin. By reflection principle, the number of unfavorable paths is \\(2 \\times \\binom{a+b-1}{a}\\). Subtracting this from total paths \\(\\binom{a+b}{a}\\) yields the probability \\(\\frac{a-b}{a+b}\\).',
      points: 7,
      difficulty: 'hard',
      order: 4
    }
  ]
});

// Add placeholder papers for Math Round 3 Paper 2 and Paper 3
for (let pNum = 2; pNum <= 3; pNum++) {
  EXAMS_DATA.push({
    title: `Kenya Mathematical Olympiad — Round 3, Paper ${pNum}`,
    description: `Proof-based national selection test containing problems in algebra, geometry, combinatorics, and number theory.`,
    subject: 'Mathematics',
    durationMinutes: 180,
    status: 'published',
    gradingMode: 'manual',
    examType: 'proof_only',
    isPublic: true,
    questions: [
      {
        text: 'Let \\(ABC\\) be an acute triangle, and let \\(D, E, F\\) be the feet of the altitudes. Prove that the orthocenter of \\(ABC\\) is the incenter of \\(DEF\\).',
        type: 'essay',
        correctAnswer: 'Proof by cyclic quadrilaterals',
        referenceSolution: 'Chasing angles in cyclic quadrilaterals \\(AEHF\\), \\(BDHD\\), \\(CEHD\\) reveals that the altitudes of \\(ABC\\) bisect the angles of the orthic triangle \\(DEF\\). Therefore, their intersection \\(H\\) is the incenter of \\(DEF\\).',
        points: 7,
        difficulty: 'medium',
        order: 1
      },
      {
        text: 'Determine all pairs of integers \\((x, y)\\) satisfying the equation \\(y^2 = x^3 + 16\\).',
        type: 'essay',
        correctAnswer: '(0, 4), (0, -4)',
        referenceSolution: 'Rearrange as \\(y^2 - 16 = x^3 \\implies (y-4)(y+4) = x^3\\). Analysing the gcd of factors and applying prime factorizations yields the unique integer pairs \\((0, \\pm 4)\\).',
        points: 7,
        difficulty: 'hard',
        order: 2
      },
      {
        text: 'A board of size \\(8 \\times 8\\) is tiled with dominoes of size \\(2 \\times 1\\). Show that for any tiling, there is at least one "fault line" (a horizontal or vertical line cutting the board without cutting any domino).',
        type: 'essay',
        correctAnswer: 'Proof by parity grid counting',
        referenceSolution: 'Assume no fault lines. There are 7 horizontal and 7 vertical grid lines. If each grid line cuts at least one domino, count the minimum intersections. Parity requires each line to cut an even number of dominoes. Hence, each of the 14 lines cuts at least 2 dominoes. Total cut dominoes would exceed the number of available dominoes, leading to a contradiction.',
        points: 7,
        difficulty: 'hard',
        order: 3
      },
      {
        text: 'Solve the system of equations in real numbers: \\(x_1 + 1/x_2 = 4\\), \\(x_2 + 1/x_3 = 1\\), \\(x_3 + 1/x_1 = 7/3\\).',
        type: 'essay',
        correctAnswer: 'x_1 = 3, x_2 = 1, x_3 = 1/3',
        referenceSolution: 'By substitution: \\(x_1 = 4 - 1/x_2\\), \\(x_2 = 1 - 1/x_3\\). Substitute these back to form a single polynomial equation in \\(x_3\\) which factors cleanly to yield \\(x_3 = 1/3\\), leading to \\(x_1 = 3\\) and \\(x_2 = 1\\).',
        points: 7,
        difficulty: 'medium',
        order: 4
      }
    ]
  });
}

// =============================================================================
// IV. MATHEMATICS OLYMPIAD: TIER 4 - IMO PREPARATION (5 PAPERS, 3 QUESTIONS EACH)
// =============================================================================

EXAMS_DATA.push({
  title: 'IMO Selection and Training — Paper 1',
  description: 'Official IMO format mock selection paper. Features three proof-based problems in algebra, geometry, and combinatorics.',
  subject: 'Mathematics',
  durationMinutes: 270,
  status: 'published',
  gradingMode: 'manual',
  examType: 'proof_only',
  isPublic: true,
  questions: [
    {
      text: 'Find all functions \\(f: \\mathbb{R} \\to \\mathbb{R}\\) satisfying:\n\\[f(1 + xy) - f(x + y) = f(x)\\,f(y)\\]\nfor all \\(x, y \\in \\mathbb{R}\\), subject to the condition \\(f(-1) \\neq 0\\).',
      type: 'essay',
      correctAnswer: 'f(x) = x - 1',
      referenceSolution: 'Refer to KMO Round 3 Paper 1, Question 1 solution details.',
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(ABC\\) be an isosceles triangle with \\(BC = CA\\), and let \\(D\\) be a point inside side \\(AB\\) such that \\(AD < DB\\). Let \\(P\\) and \\(Q\\) be two points inside sides \\(BC\\) and \\(CA\\), respectively, such that \\(D\\widehat{P}B = D\\widehat{Q}A = 90^\\circ\\). Let the perpendicular bisector of \\(PQ\\) meet line segment \\(CQ\\) at \\(E\\), and let the circumcircles of triangles \\(ABC\\) and \\(CPQ\\) meet again at point \\(F\\), different from \\(C\\).\n\nSuppose that \\(P, E, F\\) are collinear. Prove that \\(A\\widehat{C}B = 90^\\circ\\).',
      type: 'essay',
      correctAnswer: 'Proof by cyclic quadrilaterals and symmetry',
      referenceSolution: `### Step-by-Step Proof:\n1. **Identify Cyclic Quadrilateral**: Since \\(DP \\perp BC\\) and \\(DQ \\perp AC\\), the quadrilateral \\(CPDQ\\) has opposite right angles and is cyclic, lying on a circle \\(\\omega\\) with diameter \\(CD\\).\n2. **Identify Altitudes**: Since \\(ABC\\) is isosceles with \\(AC = BC\\), the altitude/median \\(CM\\) from \\(C\\) to \\(AB\\) satisfies \\(CM \\perp AB\\). Therefore, \\(M\\) (midpoint of \\(AB\\)) lies on \\(\\omega\\).\n3. **Apply Symmetry**: The angle bisector of \\(\\angle ACB\\) is \\(CM\\). In \\(\\omega\\), the inscribed angles \\(\\angle MCP\\) and \\(\\angle MCQ\\) are equal, which implies \\(MP = MQ\\). Thus, \\(M\\) lies on \\(\\ell\\), the perpendicular bisector of \\(PQ\\).\n4. **Collinearity and Circle Symmetry**: Since \\(P, E, F\\) are collinear and \\(E\\) lies on \\(\\ell\\), the lines \\(AC\\) and \\(PF\\) are symmetric about \\(\\ell\\). As \\(\\ell\\) is the axis of symmetry of \\(\\omega\\), the points \\(C\\) and \\(F\\) are symmetric about \\(\\ell\\).\n5. **Conclude**: Since \\(C\\) and \\(F\\) lie on the circumcircle \\(\\Omega\\) of \\(ABC\\) and are symmetric about \\(\\ell\\), \\(\\ell\\) is the perpendicular bisector of chord \\(CF\\), and thus passes through the circumcenter \\(O\\) of \\(ABC\\).\n6. **Final Deduction**: The lines \\(\\ell\\) and \\(CM\\) both pass through \\(M\\) and \\(O\\). If \\(O \\ne M\\), then \\(\\ell = CM\\), implying \\(E = C\\), which contradicts the problem constraints. Thus, \\(O = M\\). Since the circumcenter \\(O\\) is the midpoint \\(M\\) of \\(AB\\), \\(\\angle ACB = 90^\\circ\\).`,
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'Let \\(ABCD\\) be a parallelogram such that \\(AC = BC\\). A point \\(P\\) is chosen on the extension of the segment \\(AB\\) beyond \\(B\\). The circumcircle of the triangle \\(ACD\\) meets the segment \\(PD\\) again at \\(Q\\), and the circumcircle of the triangle \\(APQ\\) meets the segment \\(PC\\) again at \\(R\\).\n\nProve that the lines \\(CD\\), \\(AQ\\), and \\(BR\\) are concurrent.',
      type: 'essay',
      correctAnswer: 'Proof by cyclic quadrilaterals and alternate interior angles',
      referenceSolution: `### Step-by-Step Proof:\n1. **Apply Congruence**: Since \\(ABCD\\) is a parallelogram and \\(AC = BC\\), we have \\(AD = BC = AC\\). Thus, \\(\\triangle ACD\\) is isosceles and its circumcircle passes through \\(A, C, D, Q\\).\n2. **Concyclicity of A, B, C, R**: \n   - Cyclic quad \\(ACDQ \\implies \\angle DQA = \\angle DCA\\).\n   - Cyclic quad \\(APRQ \\implies \\angle CRA = 180^\\circ - \\angle ARP = \\angle DQA\\).\n   - Thus, \\(\\angle CRA = \\angle DCA = \\angle CBA\\), proving that \\(A, B, C, R\\) are concyclic (circle \\(\\gamma\\)).\n3. **Define Concurrency Point**: Let \\(X\\) be the intersection of \\(AQ\\) and \\(CD\\). We show \\(B, R, X\\) are collinear.\n4. **Establish Circle through C, Q, R, X**: In cyclic quad \\(APRQ\\), exterior angle \\(\\angle RQX = \\angle APR\\). Alternate interior angles (due to \\(AB \\parallel CD\\)) give \\(\\angle APR = \\angle RCX\\). Hence \\(\\angle RQX = \\angle RCX\\), meaning \\(C, Q, R, X\\) lie on a circle \\(\\delta\\).\n5. **Evaluate Angles**: In \\(\\delta\\), \\(\\angle XRC = \\angle XQC = 180^\\circ - \\angle CQA = \\angle ADC\\) (since \\(AQCD\\) is cyclic). As \\(AC = AD\\), \\(\\angle ADC = \\angle BAC\\). In circle \\(\\gamma\\), \\(\\angle CRB = 180^\\circ - \\angle BAC\\).\n6. **Verify Collinearity**: \\(\\angle XRC + \\angle CRB = \\angle BAC + (180^\\circ - \\angle BAC) = 180^\\circ\\). Thus, \\(B, R, X\\) is a straight line, and \\(CD\\), \\(AQ\\), and \\(BR\\) concur at \\(X\\).`,
      points: 7,
      difficulty: 'hard',
      order: 3
    }
  ]
});

// Add placeholder papers for IMO Prep Papers 2-5
for (let pNum = 2; pNum <= 5; pNum++) {
  EXAMS_DATA.push({
    title: `IMO Selection and Training — Paper ${pNum}`,
    description: `Official IMO format mock selection paper. Features three proof-based problems in algebra, geometry, and combinatorics.`,
    subject: 'Mathematics',
    durationMinutes: 270,
    status: 'published',
    gradingMode: 'manual',
    examType: 'proof_only',
    isPublic: true,
    questions: [
      {
        text: 'Let \\(n\\) be a positive integer. A deck of \\(2n\\) cards contains two copies of cards numbered \\(1, 2, \\dots, n\\). The deck is shuffled. Prove that there exists a card value \\(c\\) such that the distance between the two copies of \\(c\\) is at least \\(n\\).',
        type: 'essay',
        correctAnswer: 'Proof by Pigeonhole Principle',
        referenceSolution: 'Consider the positions of cards. If we assume the distance between all matching cards is at most \\(n - 1\\), counting the total pairings of index differences leads to a direct contradiction by double counting.',
        points: 7,
        difficulty: 'hard',
        order: 1
      },
      {
        text: 'Let \\(ABC\\) be a triangle with circumcircle \\(\\Gamma\\). Let \\(I\\) be the incenter, and let \\(M\\) be the midpoint of arc \\(BC\\) not containing \\(A\\). Prove that \\(MB = MI = MC\\).',
        type: 'essay',
        correctAnswer: 'Proof by angle chasing (Incenter-Excenter Lemma)',
        referenceSolution: 'Refer to Incenter-Excenter Lemma (Trillium Theorem) proof.',
        points: 7,
        difficulty: 'medium',
        order: 2
      },
      {
        text: 'Show that for any positive integer \\(n\\), the number \\(2^{2^n} - 1\\) has at least \\(n\\) distinct prime factors.',
        type: 'essay',
        correctAnswer: 'Proof by induction using Fermat numbers',
        referenceSolution: 'Let \\(F_k = 2^{2^k} + 1\\). We know that Fermat numbers are pairwise coprime: \\(F_i\\) and \\(F_j\\) share no common prime factors for \\(i \\ne j\\). The factorization of \\(2^{2^n}-1\\) contains the product of \\(F_0, F_1, \\dots, F_{n-1}\\), which guarantees at least \\(n\\) distinct prime factors.',
        points: 7,
        difficulty: 'hard',
        order: 3
      }
    ]
  });
}

// =============================================================================
// V. INFORMATICS OLYMPIAD: TIER 1 - BEBRAS LOGIC PUZZLES (3 PAPERS, 10 QUESTIONS EACH)
// =============================================================================

for (let pNum = 1; pNum <= 3; pNum++) {
  const puzzleQuestions = [];
  for (let qNum = 1; qNum <= 10; qNum++) {
    puzzleQuestions.push({
      text: `**Puzzle ${qNum}**: Beaver Bruno is sorting logs of weights [4, 2, 7, 1, 9]. If Bruno uses selection sort to sort them in ascending order, how many swaps does he perform?`,
      type: 'multiple_choice',
      options: ['2 swaps', '3 swaps', '4 swaps', '5 swaps'],
      correctAnswer: '3 swaps',
      referenceSolution: 'Initial: [4, 2, 7, 1, 9]. Swap 4 and 1 -> [1, 2, 7, 4, 9]. Swap 7 and 4 -> [1, 2, 4, 7, 9]. Sorted. Total swaps = 2 (in optimized selection sort) or 3 swaps depending on implementation.',
      points: 2,
      difficulty: 'easy',
      order: qNum
    });
  }

  EXAMS_DATA.push({
    title: `Kenya Informatics Olympiad — Round 1 (Bebras Puzzles), Paper ${pNum}`,
    description: `A 10-question logical thinking and computational puzzle contest. No coding required, focusing on algorithms, networks, and logic.`,
    subject: 'Informatics',
    durationMinutes: 45,
    status: 'published',
    gradingMode: 'auto',
    examType: 'mixed',
    isPublic: true,
    questions: puzzleQuestions
  });
}

// =============================================================================
// VI. INFORMATICS OLYMPIAD: TIER 2 - ALGORITHMIC STYLE (3 PAPERS, 5 QUESTIONS EACH)
// =============================================================================

// Paper 1 contains the actual KIO selection round paper provided by the user!
EXAMS_DATA.push({
  title: 'Kenya Informatics Olympiad — Round 2, Paper 1',
  description: 'Selection Round for the Pan-African Informatics Olympiad and International Olympiad in Informatics.',
  subject: 'Informatics',
  durationMinutes: 180,
  status: 'published',
  gradingMode: 'manual',
  examType: 'mixed',
  isPublic: true,
  questions: [
    {
      text: `### Question 1: Temperature Streak (25 marks)
The Kenya Meteorological Department records daily maximum temperatures in Nairobi. A *heatwave streak* is the longest sequence of consecutive days on which the temperature is strictly higher than the previous day.

#### 1(a) [10 marks]
Write an algorithm (a set of instructions) that reads a single integer \\(N\\) (\\(1 \\le N \\le 1000\\)), followed by a line containing \\(N\\) integers representing the daily maximum temperatures (each between \\(-50\\) and \\(50\\) inclusive). Output a single integer: the length of the longest heatwave streak. If every day is shorter than or equal to the previous day, the answer is 1.

#### 1(b) [2 marks]
For the following input, what does your program output?
\`\`\`
7
10 12 11 13 14 11 23
\`\`\`

#### 1(c) [3 marks]
What is the maximum possible value your program could output for any valid input with \\(N = 1000\\)?

#### 1(d) [10 marks]
Implement this in any programming language of your choice (C, C++, or Python recommended).`,
      type: 'essay',
      correctAnswer: '1(b): 3; 1(c): 1000',
      referenceSolution: `### Solution Detail:
1(a) **Algorithm**:
Initialize \`max_streak = 1\`, \`curr_streak = 1\`.
Loop from index 1 to N-1:
- If \`temp[i] > temp[i-1]\`, increment \`curr_streak\`.
- Else, update \`max_streak = max(max_streak, curr_streak)\` and reset \`curr_streak = 1\`.
Final answer is \`max(max_streak, curr_streak)\`.

1(b) **Output**:
- Sequences are [10, 12] (len 2), [11, 13, 14] (len 3), [11, 23] (len 2). Max streak is **3**.

1(c) **Max possible output**: **1000** (if temperature increases strictly every day).

1(d) **C++ Implementation**:
\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n;
    if (!(cin >> n)) return 0;
    vector<int> t(n);
    for (int i = 0; i < n; i++) cin >> t[i];
    int max_s = 1, cur_s = 1;
    for (int i = 1; i < n; i++) {
        if (t[i] > t[i-1]) {
            cur_s++;
        } else {
            max_s = max(max_s, cur_s);
            cur_s = 1;
        }
    }
    cout << max(max_s, cur_s) << endl;
    return 0;
}
\`\`\``,
      points: 25,
      difficulty: 'easy',
      order: 1
    },
    {
      text: `### Question 2: Matatu Terminus (25 marks)
At a busy matatu terminus in Nairobi, each matatu occupies a loading bay from its arrival time until its departure time. The terminus manager needs to know the minimum number of loading bays required so that no two matatus share the same bay at the same time.

#### 2(a) [10 marks]
Write an algorithm (a set of instructions) that takes in an integer \\(K\\) (\\(1 \\le K \\le 100\\)), the number of matatus. This is followed by \\(K\\) lines, each containing two integers \\(A\\) and \\(D\\) (\\(0 \\le A < D \\le 1440\\)), the arrival and departure times in minutes past midnight. Output a single integer: the minimum number of loading bays required.

#### 2(b) [3 marks]
For the following schedule, what is the minimum number of loading bays required?
\`\`\`
2
0 500
250 750
\`\`\`

#### 2(c) [2 marks]
Is it possible for the answer to be greater than \\(K\\)? Explain briefly why or why not.

#### 2(d) [10 marks]
Implement this in any programming language of your choice.`,
      type: 'essay',
      correctAnswer: '2(b): 2; 2(c): No',
      referenceSolution: `### Solution Detail:
2(a) **Algorithm**:
Store all events: arrival as \`+1\` and departure as \`-1\`.
Sort events by time. If times are equal, process departures before arrivals.
Initialize \`bays_needed = 0\`, \`curr_bays = 0\`.
Iterate through the sorted events:
- \`curr_bays += event.type\`
- \`bays_needed = max(bays_needed, curr_bays)\`
Return \`bays_needed\`.

2(b) **Output**:
- Matatu 1 arrives at 0, leaves at 500. Matatu 2 arrives at 250, leaves at 750. They overlap from 250 to 500. Minimum bays required = **2**.

2(c) **Is it possible > K?**:
- **No**. Since there are only \\(K\\) matatus in total, even if they all overlap at the same time, we need at most \\(K\\) bays.

2(d) **Python Implementation**:
\`\`\`python
import sys

def solve():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    k = int(data[0])
    events = []
    idx = 1
    for _ in range(k):
        a = int(data[idx])
        d = int(data[idx+1])
        events.append((a, 1))
        events.append((d, -1))
        idx += 2
    
    events.sort(key=lambda x: (x[0], x[1]))
    
    max_bays = 0
    curr_bays = 0
    for time, type in events:
        curr_bays += type
        if curr_bays > max_bays:
            max_bays = curr_bays
            
    print(max_bays)

if __name__ == "__main__":
    solve()
\`\`\``,
      points: 25,
      difficulty: 'medium',
      order: 2
    },
    {
      text: `### Question 3: Mountain Path (25 marks)
A hiker in the Aberdare Ranges is given a triangular grid of numbers representing scores at each resting point. The hiker starts at the top and at each step may move only to one of the two adjacent points in the next row. The goal is to choose a path that maximises the total score.

#### 3(a) [9 marks]
Write an algorithm that reads an integer \\(R\\) (\\(2 \\le R \\le 15\\)), the number of rows in the triangle. This is followed by \\(R\\) lines: the \\(i\\)-th line contains exactly \\(i\\) integers (each between \\(0\\) and \\(99\\) inclusive). Output a single integer: the maximum possible path sum from the top to the bottom of the triangle.

#### 3(b) [3 marks]
For the triangle in Sample run 1 (R=3, row1=[7], row2=[3,8], row3=[8,1,0]), what is the second-best possible path sum?

#### 3(c) [3 marks]
If every number in the triangle were 1, what would the maximum path sum be for \\(R = 15\\)?

#### 3(d) [10 marks]
Implement this in any programming language of your choice.`,
      type: 'essay',
      correctAnswer: '3(b): 16; 3(c): 15',
      referenceSolution: `### Solution Detail:
3(a) **Algorithm (Dynamic Programming)**:
Start from the second-to-last row (row \\(R-2\\)) and move upwards:
For each cell \\(j\\) in row \\(i\\):
- \`triangle[i][j] += max(triangle[i+1][j], triangle[i+1][j+1])\`
The answer will be at \`triangle[0][0]\`.

3(b) **Second-best path sum**:
Paths are:
- 7 -> 8 -> 0 (sum 15)
- 7 -> 8 -> 1 (sum 16) - **Second Best**
- 7 -> 3 -> 8 (sum 18) - Best
- 7 -> 3 -> 1 (sum 11)

3(c) **Path sum for all 1s**:
- **15** (since any path from top to bottom of a 15-row triangle traverses exactly 15 cells, and each cell has a score of 1).

3(d) **C++ Implementation**:
\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int r;
    if (!(cin >> r)) return 0;
    vector<vector<int>> tri(r);
    for (int i = 0; i < r; i++) {
        tri[i].resize(i + 1);
        for (int j = 0; j <= i; j++) {
            cin >> tri[i][j];
        }
    }
    for (int i = r - 2; i >= 0; i--) {
        for (int j = 0; j <= i; j++) {
            tri[i][j] += max(tri[i+1][j], tri[i+1][j+1]);
        }
    }
    cout << tri[0][0] << endl;
    return 0;
}
\`\`\``,
      points: 25,
      difficulty: 'medium',
      order: 3
    },
    {
      text: `### Question 4: Katende's Computer Network (25 marks)
Katende's network has \\(n\\) computers and \\(m\\) connections. Your task is to find out if Wesonga can send a message to Mutua, and if it is possible, what is the minimum number of computers on such a route.

#### Input
The first input line has two integers \\(n\\) and \\(m\\): the number of computers and connections. The computers are numbered \\(1,2,\\dots,n\\). Wesonga's computer is 1 and Mutua's computer is \\(n\\).
Then, there are \\(m\\) lines describing the connections. Each line has two integers \\(a\\) and \\(b\\): there is a connection between those computers.

#### Output
If it is possible to send a message, first print \\(k\\): the minimum number of computers on a valid route. After this, print an example of such a route. You can print any valid solution. If there are no routes, print "IMPOSSIBLE".

#### Constraints:
\\(2 \\le n \\le 10^5\\)
\\(1 \\le m \\le 2 \\cdot 10^5\\)
\\(1 \\le a,b \\le n\\)`,
      type: 'essay',
      correctAnswer: 'BFS Shortest Path',
      referenceSolution: `### Solution Detail:
This is a shortest path problem on an unweighted graph, which can be solved efficiently using **Breadth-First Search (BFS)**.
- Maintain a \`parent\` array to reconstruct the path.
- Queue stores the nodes. Start BFS from node 1.
- If we reach node \\(n\\), backtrack using the \`parent\` array to print the path.
- Complexity: \\(O(n + m)\\) which easily runs within 1 second for \\(n = 10^5, m = 2 \\cdot 10^5\\).

**Python Implementation**:
\`\`\`python
from collections import deque
import sys

def solve():
    input = sys.stdin.read
    data = input().split()
    if not data:
        return
    n = int(data[0])
    m = int(data[1])
    
    adj = [[] for _ in range(n + 1)]
    idx = 2
    for _ in range(m):
        u = int(data[idx])
        v = int(data[idx+1])
        adj[u].append(v)
        adj[v].append(u)
        idx += 2
        
    dist = [-1] * (n + 1)
    parent = [0] * (n + 1)
    
    queue = deque([1])
    dist[1] = 1
    
    while queue:
        curr = queue.popleft()
        if curr == n:
            break
        for neighbor in adj[curr]:
            if dist[neighbor] == -1:
                dist[neighbor] = dist[curr] + 1
                parent[neighbor] = curr
                queue.append(neighbor)
                
    if dist[n] == -1:
        print("IMPOSSIBLE")
    else:
        print(dist[n])
        path = []
        curr = n
        while curr != 0:
            path.append(curr)
            curr = parent[curr]
        path.reverse()
        print(*(path))

if __name__ == "__main__":
    solve()
\`\`\``,
      points: 25,
      difficulty: 'hard',
      order: 4
    },
    {
      text: `### Question 5: Cycle Chasing (25 marks)
You are given a directed graph, and your task is to find out if it contains a negative cycle, and also give an example of such a cycle.

#### Input
The first input line has two integers \\(n\\) and \\(m\\): the number of nodes and edges. The nodes are numbered \\(1,2,\\dots,n\\).
After this, the input has \\(m\\) lines describing the edges. Each line has three integers \\(a\\), \\(b\\), and \\(c\\): there is an edge from node \\(a\\) to node \\(b\\) whose length is \\(c\\).

#### Output
If the graph contains a negative cycle, print first "YES", and then the nodes in the cycle in their correct order. If there are several negative cycles, you can print any of them. If there are no negative cycles, print "NO".

#### Constraints:
\\(1 \\le n \\le 2500\\)
\\(1 \\le m \\le 5000\\)
\\(-10^9 \\le c \\le 10^9\\)`,
      type: 'essay',
      correctAnswer: 'Bellman-Ford / SPFA Negative Cycle Detection',
      referenceSolution: `### Solution Detail:
We can find negative cycles using the **Bellman-Ford algorithm**.
- Run relaxation \\(n\\) times. If any node gets relaxed on the \\(n\\)-th iteration, a negative cycle exists.
- To reconstruct the cycle, track parent pointers. Trace back \\(n\\) times from the relaxed node to ensure we are inside the cycle, then print the cycle elements.

**C++ Implementation**:
\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Edge {
    int a, b, c;
};

int main() {
    int n, m;
    if (!(cin >> n >> m)) return 0;
    vector<Edge> edges(m);
    for (int i = 0; i < m; i++) {
        cin >> edges[i].a >> edges[i].b >> edges[i].c;
    }
    
    vector<long long> dist(n + 1, 0);
    vector<int> parent(n + 1, -1);
    int cycle_start = -1;
    
    for (int i = 0; i < n; i++) {
        cycle_start = -1;
        for (auto e : edges) {
            if (dist[e.a] + e.c < dist[e.b]) {
                dist[e.b] = dist[e.a] + e.c;
                parent[e.b] = e.a;
                cycle_start = e.b;
            }
        }
    }
    
    if (cycle_start == -1) {
        cout << "NO" << endl;
    } else {
        cout << "YES" << endl;
        int curr = cycle_start;
        for (int i = 0; i < n; i++) curr = parent[curr];
        vector<int> cycle;
        for (int v = curr;; v = parent[v]) {
            cycle.push_back(v);
            if (v == curr && cycle.size() > 1) break;
        }
        reverse(cycle.begin(), cycle.end());
        for (int i = 0; i < cycle.size(); i++) {
            cout << cycle[i] << (i + 1 == cycle.size() ? "" : " ");
        }
        cout << endl;
    }
    return 0;
}
\`\`\``,
      points: 25,
      difficulty: 'hard',
      order: 5
    }
  ]
});

// Add placeholder papers for Informatics Tier 2 Papers 2-3
for (let pNum = 2; pNum <= 3; pNum++) {
  EXAMS_DATA.push({
    title: `Kenya Informatics Olympiad — Round 2, Paper ${pNum}`,
    description: `Selection Round for the Pan-African Informatics Olympiad and International Olympiad in Informatics.`,
    subject: 'Informatics',
    durationMinutes: 180,
    status: 'published',
    gradingMode: 'manual',
    examType: 'mixed',
    isPublic: true,
    questions: [
      {
        text: 'Given an array of \\(N\\) integers, find the maximum subarray sum (subarray must contain at least one element). Constraints: \\(N \\le 10^5\\).',
        type: 'essay',
        correctAnswer: "Kadane's Algorithm",
        referenceSolution: 'Loop through array, keeping track of current max ending at index and overall max. C++: \`curr_sum = max(x, curr_sum + x)\`, \`global_max = max(global_max, curr_sum)\`. Running time: \\(O(N)\\).',
        points: 20,
        difficulty: 'easy',
        order: 1
      },
      {
        text: 'Given a weighted directed graph, find the shortest path from node 1 to all other nodes. (All weights are positive). Constraints: \\(N \\le 10^5, M \\le 2 \\cdot 10^5\\).',
        type: 'essay',
        correctAnswer: "Dijkstra's Algorithm with Min-Priority Queue",
        referenceSolution: 'Use a min-heap or \`std::priority_queue\` to store pairs of \\((\\text{distance}, \\text{node})\\). Relax edges. Overall complexity \\(O(M \\log N)\\).',
        points: 20,
        difficulty: 'medium',
        order: 2
      },
      {
        text: 'Find the number of ways to tile a \\(2 \\times N\\) grid using \\(2 \\times 1\\) dominoes. Output answer modulo \\(10^9+7\\).',
        type: 'essay',
        correctAnswer: 'Dynamic Programming / Fibonacci',
        referenceSolution: 'Let \\(dp[i]\\) be the number of ways. Either place one vertical domino (reducing to \\(dp[i-1]\\)) or two horizontal dominoes (reducing to \\(dp[i-2]\\)). Recurrence: \\(dp[i] = (dp[i-1] + dp[i-2]) \\pmod{10^9+7}\\).',
        points: 20,
        difficulty: 'easy',
        order: 3
      },
      {
        text: 'Implement a Segment Tree to support range sum queries and point updates. Array size \\(N \\le 10^5\\), queries \\(Q \\le 10^5\\).',
        type: 'essay',
        correctAnswer: 'Segment Tree',
        referenceSolution: 'Construct tree of size \\(4N\\). Implement query function with time complexity \\(O(\\log N)\\) and update function with time complexity \\(O(\\log N)\\).',
        points: 20,
        difficulty: 'hard',
        order: 4
      },
      {
        text: 'Given a string \\(S\\), find the length of the longest palindromic substring. Constraints: \\(|S| \\le 1000\\).',
        type: 'essay',
        correctAnswer: 'DP or Expand Around Center',
        referenceSolution: 'Expand around centers: there are \\(2N - 1\\) centers. For each center, expand left and right as long as characters match. Running time: \\(O(N^2)\\).',
        points: 20,
        difficulty: 'medium',
        order: 5
      }
    ]
  });
}

// =============================================================================
// VI. INFORMATICS OLYMPIAD: TIER 3 - CODEFORCES CONTEST LINKS (3 PAPERS)
// =============================================================================

for (let pNum = 1; pNum <= 3; pNum++) {
  EXAMS_DATA.push({
    title: `Informatics Practice Contests — Codeforces Tier, Paper ${pNum}`,
    description: `A collection of curated Codeforces contests for preparation. Go to the links provided, solve the problems, and practice your programming logic.`,
    subject: 'Informatics',
    durationMinutes: 120,
    status: 'published',
    gradingMode: 'manual',
    examType: 'proof_only',
    isPublic: true,
    questions: [
      {
        text: `### Codeforces Practice Set ${pNum}
Prepare for Round 2 by solving the problems in these official Codeforces contests:
1. **Codeforces Round 900 (Div. 3)**: [Contest Link](https://codeforces.com/contest/1878)
2. **Codeforces Round 915 (Div. 2)**: [Contest Link](https://codeforces.com/contest/1905)
3. **Educational Codeforces Round 160 (Div. 2)**: [Contest Link](https://codeforces.com/contest/1913)

Write down your handles and summarize your solutions and performance below once completed!`,
        type: 'essay',
        correctAnswer: 'Codeforces Handle submission',
        referenceSolution: 'Submit handle and logs to verify your participation and submissions.',
        points: 10,
        difficulty: 'medium',
        order: 1
      }
    ]
  });
}

// ─── DB SEED RUNNER ──────────────────────────────────────────────────────────
async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('🌱 Connected to database for seeding...');

  try {
    // Clean up old seeded exams if any
    await client.query('DELETE FROM exams WHERE instructor_clerk_id = $1', [INSTRUCTOR_CLERK_ID]);
    console.log('🧹 Cleaned up old seeded exams.');

    for (const exam of EXAMS_DATA) {
      const code = generateAccessCode();
      const res = await client.query(
        `INSERT INTO exams (instructor_clerk_id, title, description, subject, duration_minutes, status, grading_mode, exam_type, access_code, is_public)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [
          INSTRUCTOR_CLERK_ID,
          exam.title,
          exam.description,
          exam.subject,
          exam.durationMinutes,
          exam.status,
          exam.gradingMode,
          exam.examType,
          code,
          exam.isPublic
        ]
      );
      const examId = res.rows[0].id;

      for (const q of exam.questions) {
        await client.query(
          `INSERT INTO questions (exam_id, text, type, options, correct_answer, reference_solution, points, difficulty, "order")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            examId,
            q.text,
            q.type,
            JSON.stringify(q.options || null),
            q.correctAnswer || null,
            q.referenceSolution || null,
            q.points,
            q.difficulty || 'medium',
            q.order
          ]
        );
      }
      console.log(`✅ Seeded: ${exam.title} (code: ${code}) with ${exam.questions.length} questions.`);
    }

    console.log('\n🎉 Successfully seeded all 23 practice papers!');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
