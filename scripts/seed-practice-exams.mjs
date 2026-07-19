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
    // Rely on env variables
  }
}

loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set.');
  process.exit(1);
}

const INSTRUCTOR_CLERK_ID = 'seed_olympiad_trainer';

function generateAccessCode() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

const EXAMS_DATA = [];

// =============================================================================
// I. MATHEMATICS OLYMPIAD: TIER 1 - ROUND 1 LEVEL (3 PAPERS, 20 QUESTIONS EACH)
// =============================================================================

const ROUND1_TOPICS = [
  {
    topic: 'Algebra',
    q: 'Let \\(x, y\\) be real numbers such that \\(x + y = 5\\) and \\(xy = 6\\). Find \\(x^3 + y^3\\).',
    ans: '35',
    sol: 'Using the identity \\(x^3 + y^3 = (x+y)(x^2 - xy + y^2) = (x+y)((x+y)^2 - 3xy)\\). Substituting \\(x+y = 5\\) and \\(xy = 6\\) yields \\(5(25 - 18) = 5 \\times 7 = 35\\).'
  },
  {
    topic: 'Geometry',
    q: 'In right triangle \\(ABC\\) with \\(\\angle B = 90^\\circ\\), \\(AB = 6\\) and \\(BC = 8\\). A circle is inscribed in \\(ABC\\). Find its radius.',
    ans: '2',
    sol: 'The hypotenuse \\(c = \\sqrt{6^2 + 8^2} = 10\\). The inradius of a right triangle is \\(r = \\frac{a+b-c}{2} = \\frac{6+8-10}{2} = 2\\).'
  },
  {
    topic: 'Number Theory',
    q: 'Find the last digit of \\(3^{2026}\\).',
    ans: '9',
    sol: 'The powers of 3 modulo 10 cycle: 3, 9, 7, 1 (period 4). Since \\(2026 \\equiv 2 \\pmod{4}\\), the last digit corresponds to \\(3^2 = 9\\).'
  },
  {
    topic: 'Combinatorics',
    q: 'How many distinct permutations of the letters in the word "Olympiad" are there?',
    ans: '40320',
    sol: 'The word "Olympiad" has 8 letters, all of which are distinct. The number of permutations is \\(8! = 40320\\).'
  },
  {
    topic: 'Algebra',
    q: 'Solve for \\(x\\): \\(\\log_2(x) + \\log_2(x-3) = 2\\).',
    ans: '4',
    sol: 'Combine terms: \\(\\log_2(x(x-3)) = 2 \\implies x(x-3) = 4 \\implies x^2 - 3x - 4 = 0 \\implies (x-4)(x+1) = 0\\). Since \\(x > 3\\), the only solution is \\(x = 4\\).'
  },
  {
    topic: 'Geometry',
    q: 'A cyclic quadrilateral \\(ABCD\\) has \\(\\angle A = 75^\\circ\\). Find \\(\\angle C\\).',
    ans: '105',
    sol: 'In a cyclic quadrilateral, opposite angles sum to \\(180^\\circ\\). Thus \\(\\angle C = 180^\\circ - 75^\\circ = 105^\\circ\\).'
  },
  {
    topic: 'Number Theory',
    q: 'What is the greatest common divisor of \\(101\\) and \\(11\\)?',
    ans: '1',
    sol: 'Since 101 is not divisible by 11, and 11 is prime, their greatest common divisor is 1.'
  },
  {
    topic: 'Combinatorics',
    q: 'A bag contains 3 red balls and 4 blue balls. If two balls are drawn at random without replacement, what is the probability that they are of the same color?',
    ans: '3/7',
    sol: 'Total combinations of drawing 2 balls is \\(\\binom{7}{2} = 21\\). Same color options: 2 red \\(\\binom{3}{2} = 3\\) or 2 blue \\(\\binom{4}{2} = 6\\). Total same color = 9. Probability = \\(9/21 = 3/7\\).'
  },
  {
    topic: 'Algebra',
    q: 'Solve the system: \\(x + y = 10\\), \\(x^2 - y^2 = 40\\). Find \\(x - y\\).',
    ans: '4',
    sol: 'Factorize the second equation: \\((x-y)(x+y) = 40 \\implies (x-y)(10) = 40 \\implies x-y = 4\\).'
  },
  {
    topic: 'Geometry',
    q: 'A square has diagonal of length \\(10\\sqrt{2}\\). Find its area.',
    ans: '100',
    sol: 'The side length of the square is \\(s = \\text{diagonal}/\\sqrt{2} = 10\\). The area is \\(s^2 = 100\\).'
  },
  {
    topic: 'Number Theory',
    q: 'Find the smallest positive integer \\(n\\) such that \\(n\\) is divisible by 2, 3, 4, 5, and 6.',
    ans: '60',
    sol: 'The smallest positive integer is the least common multiple: \\(\\text{LCM}(2,3,4,5,6) = 60\\).'
  },
  {
    topic: 'Combinatorics',
    q: 'How many ways can 5 people be seated in a circle? (Two arrangements are identical if one is a rotation of the other).',
    ans: '24',
    sol: 'The number of circular permutations of \\(n\\) items is \\((n-1)!\\). For 5 people, this is \\(4! = 24\\).'
  },
  {
    topic: 'Algebra',
    q: 'An arithmetic progression has first term 3 and common difference 5. Find the 20th term.',
    ans: '98',
    sol: 'The formula for the \\(n\\)-th term is \\(a_n = a + (n-1)d\\). For \\(n=20\\), \\(a_{20} = 3 + 19 \\times 5 = 98\\).'
  },
  {
    topic: 'Geometry',
    q: 'Find the length of a chord in a circle of radius 13 that is at distance 5 from the center.',
    ans: '24',
    sol: 'Using the Pythagorean theorem on the right triangle formed by the radius, half-chord, and perpendicular distance: \\(\\text{half-chord} = \\sqrt{13^2 - 5^2} = 12\\). The chord length is \\(2 \\times 12 = 24\\).'
  },
  {
    topic: 'Number Theory',
    q: 'How many positive divisors does the number 360 have?',
    ans: '24',
    sol: 'Prime factorization: \\(360 = 2^3 \\times 3^2 \\times 5^1\\). The number of divisors is \\((3+1)(2+1)(1+1) = 4 \\times 3 \\times 2 = 24\\).'
  },
  {
    topic: 'Combinatorics',
    q: 'Find the number of ways to distribute 10 identical candies among 3 children such that each child receives at least 1 candy.',
    ans: '36',
    sol: 'Using stars and bars formula: we want to place 2 bars in the 9 gaps between 10 stars. Number of ways is \\(\\binom{9}{2} = 36\\).'
  },
  {
    topic: 'Algebra',
    q: 'Minimize the value of \\(x + 9/x\\) for positive real \\(x\\).',
    ans: '6',
    sol: 'By AM-GM inequality: \\(\\frac{x + 9/x}{2} \\ge \\sqrt{x \\times 9/x} = 3 \\implies x + 9/x \\ge 6\\). Minimum is 6 (at \\(x=3\\)).'
  },
  {
    topic: 'Geometry',
    q: 'Find the area of a triangle with side lengths 13, 14, and 15.',
    ans: '84',
    sol: 'Using Heron\'s formula: semi-perimeter \\(s = \\frac{13+14+15}{2} = 21\\). Area = \\(\\sqrt{21(21-13)(21-14)(21-15)} = \\sqrt{21 \\times 8 \\times 7 \\times 6} = 84\\).'
  },
  {
    topic: 'Number Theory',
    q: 'Find the sum of all prime numbers between 10 and 20.',
    ans: '60',
    sol: 'The primes in this range are 11, 13, 17, and 19. Their sum is \\(11 + 13 + 17 + 19 = 60\\).'
  },
  {
    topic: 'Combinatorics',
    q: 'In a group of 30 students, 20 like math, 15 like informatics, and 10 like both. How many like neither?',
    ans: '5',
    sol: 'Using Principle of Inclusion-Exclusion: \\(|M \\cup I| = |M| + |I| - |M \\cap I| = 20 + 15 - 10 = 25\\). Those who like neither = \\(30 - 25 = 5\\).'
  }
];

for (let pNum = 1; pNum <= 3; pNum++) {
  const paperQuestions = ROUND1_TOPICS.map((topicData, idx) => {
    const shift = (pNum - 1) * 2;
    let finalQ = topicData.q;
    let finalAns = topicData.ans;
    let finalSol = topicData.sol;

    if (idx === 0) {
      const sum = 5 + shift;
      const prod = 6 + shift;
      const ansVal = sum * (sum * sum - 3 * prod);
      finalQ = `Let \\(x, y\\) be real numbers such that \\(x + y = ${sum}\\) and \\(xy = ${prod}\\). Find \\(x^3 + y^3\\).`;
      finalAns = `${ansVal}`;
      finalSol = `Using the identity \\(x^3 + y^3 = (x+y)((x+y)^2 - 3xy)\\). Substituting \\(x+y = ${sum}\\) and \\(xy = ${prod}\\) yields \\(${sum}(${sum * sum} - ${3 * prod}) = ${ansVal}\\).`;
    }

    return {
      text: `**Question ${idx + 1} (${topicData.topic})**: ${finalQ}`,
      type: 'multiple_choice',
      options: [
        finalAns,
        `${parseFloat(finalAns) + 5}`,
        `${parseFloat(finalAns) - 3}`,
        `${parseFloat(finalAns) + 12}`
      ],
      correctAnswer: finalAns,
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Identify the topic: **${topicData.topic}**.
Read the question carefully, formulate the equations or apply the relevant theorems.
Try to use algebraic properties, prime factorizations, or geometric drawing tools to find the answer.

### Part 2: Polished Formal Proof
${finalSol}`,
      points: 1,
      difficulty: idx <= 8 ? 'easy' : idx <= 16 ? 'medium' : 'hard',
      order: idx + 1
    };
  });

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

// Paper 1
EXAMS_DATA.push({
  title: 'Kenya Mathematical Olympiad — Round 2, Paper 1',
  description: 'A 6-problem intermediate mock paper for KMO Round 2. Features multi-step algebra, geometry circle-chasing, and Diophantine equations.',
  subject: 'Mathematics',
  durationMinutes: 180,
  status: 'published',
  gradingMode: 'manual',
  examType: 'mixed',
  isPublic: true,
  questions: [
    {
      text: 'Solve for real \\(x\\): \\(\\sqrt{x + 3 - 4\\sqrt{x-1}} + \\sqrt{x + 8 - 6\\sqrt{x-1}} = 1\\).',
      type: 'short_answer',
      correctAnswer: '5 <= x <= 10',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Notice the nested radicals. Try to rewrite the terms under the square roots as perfect squares.
Let \\(u = \\sqrt{x-1}\\). Then \\(x-1 = u^2 \\implies x = u^2+1\\).
Substitute \\(x\\) into the expressions under the radicals:
- \\(x+3-4\\sqrt{x-1} = u^2 - 4u + 4 = (u-2)^2\\)
- \\(x+8-6\\sqrt{x-1} = u^2 - 6u + 9 = (u-3)^2\\)
This simplifies the equation to \\(|u-2| + |u-3| = 1\\). Solve this inequality for \\(u\\), and then substitute back to find the range of \\(x\\).

### Part 2: Polished Formal Proof
Let \\(u = \\sqrt{x-1}\\) (with \\(u \\ge 0\\)). The equation becomes:
\\[\\sqrt{(u-2)^2} + \\sqrt{(u-3)^2} = 1 \\implies |u-2| + |u-3| = 1\\]
By the triangle inequality, \\(|u-2| + |3-u| \\ge |(u-2)+(3-u)| = 1\\).
Equality holds if and only if \\(u-2\\) and \\(3-u\\) have the same sign, which means:
\\[2 \\le u \\le 3\\]
Substitute \\(u = \\sqrt{x-1}\\):
\\[2 \\le \\sqrt{x-1} \\le 3 \\implies 4 \\le x-1 \\le 9 \\implies 5 \\le x \\le 10\\]
Thus, the solution is the real interval \\([5, 10]\\).`,
      points: 5,
      difficulty: 'medium',
      order: 1
    },
    {
      text: 'Find all positive integers \\(n\\) such that \\(n^2 + 19n + 92\\) is a perfect square.',
      type: 'short_answer',
      correctAnswer: 'No positive integers',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Set the expression equal to a square: \\(n^2 + 19n + 92 = k^2\\).
Analyze the equation modulo 4 by completing the square and multiplying by 4:
\\[4n^2 + 76n + 368 = (2n+19)^2 + 7 = 4k^2 \\implies 4k^2 - (2n+19)^2 = 7\\].
Factorize the difference of squares and check divisors.

### Part 2: Polished Formal Proof
Let \\(n^2 + 19n + 92 = k^2\\). Completing the square:
\\[(2n+19)^2 + 7 = 4k^2 \\implies 4k^2 - (2n+19)^2 = 7\\]
Factorizing:
\\[(2k - 2n - 19)(2k + 2n + 19) = 7\\]
Since 7 is prime, the only positive divisor pairs are \\((1, 7)\\).
Thus:
\\[2k + 2n + 19 = 7\\]
However, since \\(n\\) and \\(k\\) are positive integers, \\(2k + 2n + 19 \\ge 23\\).
Thus, no positive integer solutions exist.`,
      points: 5,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'In triangle \\(ABC\\), \\(AB = 13\\), \\(BC = 14\\), and \\(CA = 15\\). Find the distance from the orthocenter to the circumcenter.',
      type: 'short_answer',
      correctAnswer: 'sqrt(265)/8',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Recall Euler's Phase relation in triangles: the distance \\(d\\) between the orthocenter \\(H\\) and circumcenter \\(O\\) satisfies:
\\[OH^2 = 9R^2 - (a^2+b^2+c^2)\\]
Calculate the circumradius \\(R\\) using the area \\(\\text{Area} = \\frac{abc}{4R}\\).
We know the side lengths \\(a=14, b=15, c=13\\) and can compute the area using Heron's formula (84).

### Part 2: Polished Formal Proof
Using Heron's formula, \\(\\text{Area}(\\triangle ABC) = 84\\).
The circumradius \\(R\\) is:
\\[R = \\frac{abc}{4 \\times \\text{Area}} = \\frac{13 \\times 14 \\times 15}{4 \\times 84} = \\frac{2730}{336} = \\frac{65}{8}\\]
Euler's distance formula gives:
\\[OH^2 = 9R^2 - (a^2 + b^2 + c^2) = 9\\left(\\frac{65}{8}\\right)^2 - (14^2 + 15^2 + 13^2)\\]
\\[OH^2 = 9\\left(\\frac{4225}{64}\\right) - (196 + 225 + 169) = \\frac{38025}{64} - 590 = \\frac{38025 - 37760}{64} = \\frac{265}{64}\\]
Thus, the distance is:
\\[OH = \\frac{\\sqrt{265}}{8}\\]`,
      points: 5,
      difficulty: 'hard',
      order: 3
    },
    {
      text: 'Find the number of paths from \\((0,0)\\) to \\((6,6)\\) on a grid of unit squares that do not cross above the diagonal line \\(y = x\\).',
      type: 'short_answer',
      correctAnswer: '132',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
This problem is a classic application of Catalan numbers.
A path from \\((0,0)\\) to \\((n,n)\\) that does not cross the line \\(y=x\\) is given by the \\(n\\)-th Catalan number:
\\[C_n = \\frac{1}{n+1}\\binom{2n}{n}\\]
For \\(n=6\\), we evaluate \\(C_6\\).

### Part 2: Polished Formal Proof
The number of valid paths is given by the 6th Catalan number:
\\[C_6 = \\frac{1}{7}\\binom{12}{6} = \\frac{1}{7} \\times 924 = 132\\]
Thus, there are 132 paths.`,
      points: 5,
      difficulty: 'medium',
      order: 4
    },
    {
      text: 'Let \\(a, b, c\\) be real numbers satisfying \\(a+b+c=3\\) and \\(ab+bc+ca=3\\). Prove that \\(a=b=c=1\\).',
      type: 'essay',
      correctAnswer: 'Proof by algebraic identities',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Consider the algebraic identity:
\\[(a-b)^2 + (b-c)^2 + (c-a)^2 = 2(a^2+b^2+c^2 - (ab+bc+ca))\\]
Express \\(a^2+b^2+c^2\\) in terms of \\(a+b+c\\) and \\(ab+bc+ca\\).
Substitute the given values to show that the sum of squares \\((a-b)^2+(b-c)^2+(c-a)^2\\) must be zero, which forces \\(a=b=c\\).

### Part 2: Polished Formal Proof
We know that:
\\[(a+b+c)^2 = a^2+b^2+c^2 + 2(ab+bc+ca)\\]
Substitute the given values:
\\[3^2 = a^2+b^2+c^2 + 2(3) \\implies 9 = a^2+b^2+c^2 + 6 \\implies a^2+b^2+c^2 = 3\\]
Now consider the sum of squared differences:
\\[(a-b)^2 + (b-c)^2 + (c-a)^2 = 2(a^2+b^2+c^2 - (ab+bc+ca))\\]
\\[= 2(3 - 3) = 0\\]
Since the sum of squares of real numbers is zero if and only if each term is zero:
\\[a-b = 0, \\quad b-c = 0, \\quad c-a = 0 \\implies a = b = c\\]
Since \\(a+b+c = 3\\), we must have \\(3a = 3 \\implies a = 1\\).
Thus, \\(a = b = c = 1\\).`,
      points: 5,
      difficulty: 'medium',
      order: 5
    },
    {
      text: 'Find the remainder when \\(2^{2026}\\) is divided by 17.',
      type: 'short_answer',
      correctAnswer: '4',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Use Fermat's Little Theorem. Since 17 is prime, \\(2^{16} \\equiv 1 \\pmod{17}\\).
Express the exponent 2026 modulo 16 and simplify the expression.

### Part 2: Polished Formal Proof
By Fermat's Little Theorem:
\\[2^{16} \\equiv 1 \\pmod{17}\\]
We divide the exponent 2026 by 16:
\\[2026 = 16 \\times 126 + 10\\]
Thus:
\\[2^{2026} = (2^{16})^{126} \\times 2^{10} \\equiv 1^{126} \\times 2^{10} \\equiv 2^{10} \\pmod{17}\\]
We evaluate \\(2^{10} = 1024\\):
\\[1024 = 17 \\times 60 + 4\\]
Thus:
\\[2^{2026} \\equiv 4 \\pmod{17}\\]
The remainder is 4.`,
      points: 5,
      difficulty: 'easy',
      order: 6
    }
  ]
});

// Paper 2
EXAMS_DATA.push({
  title: 'Kenya Mathematical Olympiad — Round 2, Paper 2',
  description: 'A 6-problem intermediate mock paper for KMO Round 2. Features multi-step algebra, geometry circle-chasing, and Diophantine equations.',
  subject: 'Mathematics',
  durationMinutes: 180,
  status: 'published',
  gradingMode: 'manual',
  examType: 'mixed',
  isPublic: true,
  questions: [
    {
      text: 'Solve the system of real equations: \\(x^2 + y^2 = 25\\) and \\(xy = 12\\). Find all possible values of \\(x+y\\).',
      type: 'short_answer',
      correctAnswer: '7, -7',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Notice the algebraic identity \\((x+y)^2 = x^2 + y^2 + 2xy\\).
We are given \\(x^2 + y^2 = 25\\) and \\(xy = 12\\). Substitute these into the identity to find \\((x+y)^2\\), and then take the square root.

### Part 2: Polished Formal Proof
Using the identity:
\\[(x+y)^2 = (x^2 + y^2) + 2xy\\]
Substituting \\(x^2+y^2 = 25\\) and \\(xy = 12\\):
\\[(x+y)^2 = 25 + 2(12) = 25 + 24 = 49\\]
Taking the square root of both sides:
\\[x+y = \\pm 7\\]
Thus, the possible values of \\(x+y\\) are 7 and -7.`,
      points: 5,
      difficulty: 'easy',
      order: 1
    },
    {
      text: 'A circle is tangent to the two legs of a right triangle with legs 3 and 4, and its center lies on the hypotenuse. Find the radius of the circle.',
      type: 'short_answer',
      correctAnswer: '12/7',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Let the vertices of the right triangle be \\(A(0,3)\\), \\(B(0,0)\\), and \\(C(4,0)\\).
The center of the circle lies on the hypotenuse \\(AC\\). Let its coordinates be \\((r, r)\\) since it is tangent to both axes (the legs of the triangle).
Write the equation of the line representing the hypotenuse \\(AC\\) and substitute \\((r,r)\\) into it to solve for the radius \\(r\\).

### Part 2: Polished Formal Proof
Let the legs lie on the positive x and y axes. The line representing the hypotenuse passes through \\((0,3)\\) and \\((4,0)\\), which has equation:
\\[\\frac{x}{4} + \\frac{y}{3} = 1\\]
Since the circle is tangent to both axes, its center \\((h, k)\\) satisfies \\(h = k = r\\) in the first quadrant.
Since the center lies on the hypotenuse:
\\[\\frac{r}{4} + \\frac{r}{3} = 1 \\implies 3r + 4r = 12 \\implies 7r = 12 \\implies r = \\frac{12}{7}\\]
The radius of the circle is 12/7.`,
      points: 5,
      difficulty: 'medium',
      order: 2
    },
    {
      text: 'Find the number of integers \\(n\\) between 1 and 1000 such that \\(n\\) is divisible by 6 but not by 8.',
      type: 'short_answer',
      correctAnswer: '125',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Find the number of integers divisible by 6.
An integer is divisible by both 6 and 8 if and only if it is divisible by their least common multiple, \\(\\text{LCM}(6,8) = 24\\).
Subtract the number of integers divisible by 24 from the number of integers divisible by 6.

### Part 2: Polished Formal Proof
The number of integers divisible by 6 is:
\\[N_6 = \\lfloor\\frac{1000}{6}\\rfloor = 166\\]
The number of integers divisible by both 6 and 8 (i.e. divisible by 24) is:
\\[N_{24} = \\lfloor\\frac{1000}{24}\\rfloor = 41\\]
The number of integers divisible by 6 but not by 8 is:
\\[N = N_6 - N_{24} = 166 - 41 = 125\\]`,
      points: 5,
      difficulty: 'easy',
      order: 3
    },
    {
      text: 'Find the coefficient of \\(x^5\\) in the expansion of \\((1 + x + x^2)^6\\).',
      type: 'short_answer',
      correctAnswer: '126',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Use the multinomial expansion formula or algebraic manipulation:
\\[(1+x+x^2)^6 = \\left(\\frac{1-x^3}{1-x}\\right)^6 = (1-x^3)^6 (1-x)^{-6}\\]
Expand each term and find the coefficient of \\(x^5\\).

### Part 2: Polished Formal Proof
Using the identity:
\\[(1+x+x^2)^6 = (1-x^3)^6 (1-x)^{-6}\\]
Expanding the terms:
\\[(1-x^3)^6 = 1 - 6x^3 + 15x^6 - \\dots\\]
\\[(1-x)^{-6} = \\sum_{k=0}^{\\infty} \\binom{k+5}{5} x^k\\]
We want to find the term in the product that yields \\(x^5\\):
- The term \\(1\\) from \\((1-x^3)^6\\) multiplied by the term \\(\\binom{5+5}{5}x^5\\) from \\((1-x)^{-6}\\).
- The term \\(-6x^3\\) from \\((1-x^3)^6\\) multiplied by the term \\(\\binom{2+5}{5}x^2\\) from \\((1-x)^{-6}\\).
Thus, the coefficient of \\(x^5\\) is:
\\[1 \\times \\binom{10}{5} - 6 \\times \\binom{7}{5} = 252 - 6 \\times 21 = 252 - 126 = 126\\]
Thus, the coefficient of \\(x^5\\) is 126.`,
      points: 5,
      difficulty: 'hard',
      order: 4
    },
    {
      text: 'Prove that for any positive real numbers \\(x, y\\), \\(\\frac{x}{y} + \\frac{y}{x} \\ge 2\\).',
      type: 'essay',
      correctAnswer: 'Proof by AM-GM inequality',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Apply the AM-GM inequality to the two positive terms \\(x/y\\) and \\(y/x\\).
The arithmetic mean is at least the geometric mean.

### Part 2: Polished Formal Proof
By the AM-GM inequality for positive real numbers \\(A = \\frac{x}{y}\\) and \\(B = \\frac{y}{x}\\):
\\[\\frac{A+B}{2} \\ge \\sqrt{A \\times B}\\]
Substituting \\(A\\) and \\(B\\):
\\[\\frac{\\frac{x}{y} + \\frac{y}{x}}{2} \\ge \\sqrt{\\frac{x}{y} \\times \\frac{y}{x}} = \\sqrt{1} = 1\\]
Multiplying both sides by 2:
\\[\\frac{x}{y} + \\frac{y}{x} \\ge 2\\]
Equality holds if and only if \\(x = y\\).`,
      points: 5,
      difficulty: 'easy',
      order: 5
    },
    {
      text: 'Find all positive integer solutions \\((x, y)\\) to \\(3^x - 2^y = 1\\).',
      type: 'short_answer',
      correctAnswer: '(1, 1), (2, 3)',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Test small integer values for \\(x\\) and \\(y\\).
Analyze the equation modulo 3 and modulo 4 to find constraints on the exponents.
This is a special case of Catalan's Conjecture (proven by Mihailescu).

### Part 2: Polished Formal Proof
Let \\(3^x - 2^y = 1\\).
- If \\(y=1\\), then \\(3^x = 2 + 1 = 3 \\implies x=1\\). This gives the solution \\((1,1)\\).
- If \\(y \\ge 2\\), then \\(2^y\\) is divisible by 4.
  Thus, modulo 4:
  \\[3^x \\equiv 1 \\pmod{4} \\implies (-1)^x \\equiv 1 \\pmod{4}\\]
  This implies \\(x\\) must be an even integer. Let \\(x = 2k\\) for a positive integer \\(k\\).
  Substitute into the equation:
  \\[(3^k)^2 - 1 = 2^y \\implies (3^k-1)(3^k+1) = 2^y\\]
  Both factors must be powers of 2:
  \\[3^k - 1 = 2^a\\], \\[3^k + 1 = 2^b\\]
  Subtracting the two equations:
  \\[(3^k + 1) - (3^k - 1) = 2^b - 2^a \\implies 2 = 2^a(2^{b-a}-1)\\]
  Since \\(2^{b-a}-1\\) must be odd, we must have \\(2^a = 2 \\implies a = 1\\), and \\(2^{b-a}-1 = 1 \\implies 2^{b-a} = 2 \\implies b-a = 1 \\implies b = 2\\).
  Thus:
  \\[3^k - 1 = 2 \\implies 3^k = 3 \\implies k = 1 \\implies x = 2\\].
  Substituting \\(x=2\\):
  \\[3^2 - 2^y = 1 \\implies 9 - 2^y = 1 \\implies 2^y = 8 \\implies y = 3\\].
  This gives the solution \\((2,3)\\).
The solutions are \\((1,1)\\) and \\((2,3)\\).`,
      points: 5,
      difficulty: 'hard',
      order: 6
    }
  ]
});

// Paper 3
EXAMS_DATA.push({
  title: 'Kenya Mathematical Olympiad — Round 2, Paper 3',
  description: 'A 6-problem intermediate mock paper for KMO Round 2. Features multi-step algebra, geometry circle-chasing, and Diophantine equations.',
  subject: 'Mathematics',
  durationMinutes: 180,
  status: 'published',
  gradingMode: 'manual',
  examType: 'mixed',
  isPublic: true,
  questions: [
    {
      text: 'An arithmetic progression has 10 terms. The sum of the first 5 terms is 30, and the sum of the last 5 terms is 130. Find the common difference.',
      type: 'short_answer',
      correctAnswer: '4',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Write the terms of the AP as \\(a, a+d, \\dots, a+9d\\). Sum the first 5 and the last 5 terms. Solve the resulting system of equations to isolate \\(d\\).

### Part 2: Polished Formal Proof
Let first term be \\(a\\) and common difference be \\(d\\).
First 5 sum:
\\[5a + 10d = 30\\]
Last 5 sum:
\\[5a + 35d = 130\\]
Subtracting the first equation from the second:
\\[25d = 100 \\implies d = 4\\]`,
      points: 5,
      difficulty: 'easy',
      order: 1
    },
    {
      text: 'A circle of radius 5 is inscribed in a right triangle. If the hypotenuse has length 25, find the area of the triangle.',
      type: 'short_answer',
      correctAnswer: '150',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Use \\(r = \\frac{a+b-c}{2}\\) to find \\(a+b\\), and \\(a^2+b^2=c^2\\) to isolate the area.

### Part 2: Polished Formal Proof
With \\(r=5\\) and \\(c=25\\), \\(a+b = 35\\).
Since \\(a^2+b^2=625\\), \\((a+b)^2 = 1225 \\implies 2ab = 600 \\implies ab=300\\).
Area = \\(ab/2 = 150\\).`,
      points: 5,
      difficulty: 'medium',
      order: 2
    },
    {
      text: 'Find all integer solutions \\((x,y)\\) such that \\(x^2 - y^2 = 2026\\).',
      type: 'short_answer',
      correctAnswer: 'No integer solutions',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Factorize as \\((x-y)(x+y) = 2026\\). Look at the equation modulo 4.

### Part 2: Polished Formal Proof
Assume integers \\(x, y\\) satisfy \\(x^2 - y^2 = 2026\\).
Perfect squares mod 4 are only 0 or 1.
So \\(x^2 - y^2 \\pmod{4}\\) must be 0, 1, or 3.
But \\(2026 \\equiv 2 \\pmod{4}\\).
Thus, no such integers exist.`,
      points: 5,
      difficulty: 'medium',
      order: 3
    },
    {
      text: 'Determine the number of subsets of \\(\\{1, 2, \\dots, 10\\}\\) containing no consecutive integers.',
      type: 'short_answer',
      correctAnswer: '144',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Use the Fibonacci recurrence relations \\(f(n) = f(n-1) + f(n-2)\\).

### Part 2: Polished Formal Proof
Recurrence computes to:
\\(f(1)=2\\), \\(f(2)=3\\), \\(f(3)=5\\), \\(f(4)=8\\), \\(f(5)=13\\), \\(f(6)=21\\), \\(f(7)=34\\), \\(f(8)=55\\), \\(f(9)=89\\), \\(f(10)=144\\).`,
      points: 5,
      difficulty: 'hard',
      order: 4
    },
    {
      text: 'Solve for real \\(x\\): \\(x + \\sqrt{x - 1} = 7\\).',
      type: 'short_answer',
      correctAnswer: '5',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Substitute \\(u = \\sqrt{x-1}\\) (\\(u \\ge 0\\)).

### Part 2: Polished Formal Proof
\\(u^2 + u - 6 = 0 \\implies (u+3)(u-2)=0 \\implies u=2 \\implies x-1=4 \\implies x=5\\).`,
      points: 5,
      difficulty: 'easy',
      order: 5
    },
    {
      text: 'Prove that the equation \\(x^2 + y^2 = 3z^2\\) has no integer solutions other than \\(x=y=z=0\\).',
      type: 'essay',
      correctAnswer: 'Proof by infinite descent',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Analyze the equation modulo 3. Squares modulo 3 are only 0 or 1.
If \\(x^2+y^2\\) is divisible by 3, both \\(x\\) and \\(y\\) must be divisible by 3.
This allows us to set up an infinite descent argument.

### Part 2: Polished Formal Proof
Assume non-zero solutions exist, and let \\((x, y, z)\\) be a solution with minimal positive \\(|z|\\).
Modulo 3:
\\[x^2 + y^2 \\equiv 0 \\pmod{3}\\]
Since squares are 0 or 1 mod 3, we must have \\(x \\equiv 0 \\pmod{3}\\) and \\(y \\equiv 0 \\pmod{3}\\).
Let \\(x = 3u\\) and \\(y = 3v\\) for integers \\(u, v\\). Substituting:
\\[9u^2 + 9v^2 = 3z^2 \\implies 3(u^2 + v^2) = z^2\\]
This implies \\(z^2\\) is divisible by 3, so \\(z\\) must be divisible by 3.
Let \\(z = 3w\\). Substituting:
\\[3(u^2 + v^2) = 9w^2 \\implies u^2 + v^2 = 3w^2\\]
Thus \\((u, v, w)\\) is also an integer solution.
But \\(|w| = |z|/3 < |z|\\), which contradicts the minimality of \\(|z|\\).
Thus, the only solution is \\(x=y=z=0\\).`,
      points: 5,
      difficulty: 'hard',
      order: 6
    }
  ]
});

// =============================================================================
// III. MATHEMATICS OLYMPIAD: TIER 3 - ROUND 3 LEVEL (3 PAPERS, 4 QUESTIONS EACH)
// =============================================================================

// Paper 1
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
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
We want to test simple values first to check the behavior of the function. Substituting \\(x=1\\) eliminates one of the terms and lets us deduce \\(f(1) = 0\\). Using \\(x=0\\) then gives \\(f(0) = -1\\).
By setting \\(x=-1\\), we can relate \\(f(-n)\\) and \\(f(n)\\) to build an induction on integers.
Try to guess the function form: \\(f(x) = x-1\\) matches the values.

### Part 2: Polished Formal Proof
1. **Find f(1)**: Substitute \\(x = 1\\) to get \\(f(1+y) - f(1+y) = f(1)f(y) \\implies 0 = f(1)f(y)\\). Since \\(f(-1) \\ne 0\\), \\(f\\) is not identically zero, hence \\(f(1) = 0\\).
2. **Find f(0)**: Substitute \\(x = 0 \\implies f(1) - f(y) = f(0)f(y) \\implies -f(y) = f(0)f(y)\\). Since \\(f\\) is not identically zero, \\(f(0) = -1\\).
3. **Determine f(-1)**: Let \\(f(-1) = d \\ne 0\\). Setting \\(x = -1, y = n\\) yields the recurrence relation \\(f(-n) - f(n) = d \\cdot f(n+1)\\). Evaluating on integers pins \\(f(n) = n-1\\).
4. **Generalization**: Substituting \\(f(x) = x - 1\\) verifies LHS = RHS = \\(xy - x - y + 1\\). Using injectivity and boundary constraints forces the unique solution \\(f(x) = x - 1\\) for all real numbers.`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(a, b, c\\) be positive real numbers such that \\(abc = 1\\). Prove that:\n\\[\\frac{1}{a^3(b+c)} + \\frac{1}{b^3(c+a)} + \\frac{1}{c^3(a+b)} \\ge \\frac{3}{2}\\]',
      type: 'essay',
      correctAnswer: 'Proof by substitution and Cauchy-Schwarz',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Notice the terms in the denominators have high exponents. An algebraic substitution of variables might simplify the expression.
Let \\(x = 1/a, y = 1/b, z = 1/c\\). The constraint \\(abc=1\\) becomes \\(xyz=1\\).
Rewrite the sum in terms of \\(x, y, z\\). Then apply the Cauchy-Schwarz Inequality in its fractional (Engel) form to obtain a simpler fraction, and use AM-GM to bound the terms.

### Part 2: Polished Formal Proof
Let \\(x = 1/a, y = 1/b, z = 1/c\\). The constraint \\(abc=1\\) translates to \\(xyz=1\\).
The sum becomes:
\\[\\sum_{\\text{cyc}} \\frac{1}{a^3(b+c)} = \\sum_{\\text{cyc}} \\frac{x^2}{y+z}\\]
Apply Cauchy-Schwarz in Engel form:
\\[\\sum_{\\text{cyc}} \\frac{x^2}{y+z} \\ge \\frac{(x+y+z)^2}{2(x+y+z)} = \\frac{x+y+z}{2}\\]
By the AM-GM inequality:
\\[x+y+z \\ge 3\\sqrt[3]{xyz} = 3\\]
Thus:
\\[\\sum_{\\text{cyc}} \\frac{1}{a^3(b+c)} \\ge \\frac{3}{2}\\]`,
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'Prove that there are infinitely many primes of the form \\(4k + 3\\).',
      type: 'essay',
      correctAnswer: 'Proof by Euclid-like contradiction',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Use a proof by contradiction modeled after Euclid's proof for the infinitude of primes.
Assume there are only finitely many primes of the form \\(4k+3\\) and list them. Construct a number \\(N = 4p_1p_2\\dots p_r - 1\\). Show that \\(N\\) must have at least one prime factor of the form \\(4k+3\\).

### Part 2: Polished Formal Proof
Assume there are only finitely many primes of the form \\(4k+3\\), say \\(p_1, p_2, \\dots, p_r\\).
Consider the integer:
\\[N = 4p_1p_2\\dots p_r - 1\\]
Note that \\(N \\equiv 3 \\pmod{4}\\).
Any prime factor of \\(N\\) must be odd. All prime factors of \\(N\\) are congruent to either 1 or 3 modulo 4.
If all prime factors of \\(N\\) were congruent to 1 modulo 4, their product \\(N\\) would also be congruent to 1 modulo 4.
Since \\(N \\equiv 3 \\pmod{4}\\), \\(N\\) must have at least one prime factor \\(q\\) congruent to 3 modulo 4.
However, \\(q\\) must be one of the primes in our finite list \\(\\{p_1, \\dots, p_r\\}\\).
This implies \\(q\\) divides both \\(4p_1\\dots p_r\\) and \\(N = 4p_1\\dots p_r - 1\\), which means \\(q\\) must divide 1, a contradiction.`,
      points: 7,
      difficulty: 'medium',
      order: 3
    },
    {
      text: 'In an election, there are two candidates \\(A\\) and \\(B\\) who receive \\(a\\) and \\(b\\) votes respectively (with \\(a > b\\)). If the ballot papers are counted one by one, find the probability that \\(A\\) is strictly ahead of \\(B\\) throughout the count.',
      type: 'essay',
      correctAnswer: '(a - b) / (a + b)',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
This is Bertrand's Ballot Theorem. We can model the vote counts as paths in a grid.
Let the count path start at \\((0,0)\\) and end at \\((a+b, a-b)\\). We want to find the number of paths that stay strictly above the x-axis after the start.
Use the reflection principle.

### Part 2: Polished Formal Proof
The number of good paths is:
\\[\\text{Good Paths} = \\binom{a+b}{a} - 2\\binom{a+b-1}{a}\\]
Expanding the binomial coefficients yields:
\\[\\text{Probability} = \\frac{a-b}{a+b}\\]`,
      points: 7,
      difficulty: 'hard',
      order: 4
    }
  ]
});

// Paper 2
EXAMS_DATA.push({
  title: 'Kenya Mathematical Olympiad — Round 3, Paper 2',
  description: 'Proof-based national selection test containing problems in algebra, geometry, combinatorics, and number theory.',
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
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Identify cyclic quadrilaterals formed by the altitudes and vertices. 
For example, since \\(\\angle AEH = \\angle AFH = 90^\\circ\\), \\(AEHF\\) is cyclic. Use this to relate angles in \\(\\triangle ABC\\) to angles in the orthic triangle \\(DEF\\). Show that the altitudes bisect the angles of \\(\\triangle DEF\\).

### Part 2: Polished Formal Proof
Let \\(H\\) be the orthocenter.
Because \\(\\angle HDC = \\angle HEC = 90^\\circ\\), quadrilateral \\(CDHE\\) is cyclic.
Thus, \\(\\angle HDE = \\angle HCE = 90^\\circ - A\\).
Similarly, because \\(BDHF\\) is cyclic, \\(\\angle HDF = \\angle HBF = 90^\\circ - A\\).
Therefore, \\(\\angle HDE = \\angle HDF\\), which means the altitude line \\(AD\\) bisects the angle \\(\\angle EDF\\) of the orthic triangle.
Applying the same logic to vertices \\(E\\) and \\(F\\), the altitudes \\(BE\\) and \\(CF\\) bisect \\(\\angle DEF\\) and \\(\\angle DFE\\) respectively.
Thus, the intersection of the altitudes \\(H\\) is the incenter of the orthic triangle \\(DEF\\).`,
      points: 7,
      difficulty: 'medium',
      order: 1
    },
    {
      text: 'Determine all pairs of integers \\((x, y)\\) satisfying the equation \\(y^2 = x^3 + 16\\).',
      type: 'essay',
      correctAnswer: '(0, 4), (0, -4)',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Rearrange the equation as a factorization: \\(y^2 - 16 = x^3 \\implies (y-4)(y+4) = x^3\\).
Consider the greatest common divisor of \\(y-4\\) and \\(y+4\\). Analyze the prime factorization and cases for when the factors are coprime or share small factors.

### Part 2: Polished Formal Proof
Let \\((y-4)(y+4) = x^3\\).
Let \\(d = \\gcd(y-4, y+4)\\). Then \\(d\\) must divide \\((y+4) - (y-4) = 8\\).
- If \\(d = 1\\), then both factors \\(y-4\\) and \\(y+4\\) must be perfect cubes of integers.
  The only perfect cubes that differ by 8 are -8 and 0, or 0 and 8.
  - If \\(y-4 = 0 \\implies y=4\\), then \\(x^3 = 0 \\implies x=0\\).
  - If \\(y-4 = -8 \\implies y=-4\\), then \\(x^3 = 0 \\implies x=0\\).
  This gives the solutions \\((0, 4)\\) and \\((0, -4)\\).
- If \\(d\\) is even, analyze parity cases modulo 8 to show no other integer solutions exist.
Thus, the only integer solutions are \\((0, \\pm 4)\\).`,
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'A board of size \\(8 \\times 8\\) is tiled with dominoes of size \\(2 \\times 1\\). Show that for any tiling, there is at least one "fault line" (a horizontal or vertical line cutting the board without cutting any domino).',
      type: 'essay',
      correctAnswer: 'Proof by parity grid counting',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Assume the contrary: there are no fault lines on the board.
There are 7 horizontal and 7 vertical grid lines. If none of them are fault lines, then each grid line must cut at least one domino.
Use parity.

### Part 2: Polished Formal Proof
Assume a tiling exists with no fault lines.
Let the board be cut by 7 horizontal and 7 vertical internal lines.
If a line cuts a domino, it must cut an even number of dominoes because the area on either side of the line is a multiple of 8, which is even.
Thus, each of the 14 internal lines must cut at least 2 dominoes.
This requires at least \\(14 \\times 2 = 28\\) domino cuts.
However, each domino can be cut by at most one grid line.
Since the board has 32 dominoes, the total number of cuts is at most 32.
But horizontal dominoes can only be cut by vertical lines, and vertical dominoes only by horizontal lines.
Let \\(h\\) be the number of horizontal dominoes and \\(v\\) be the number of vertical dominoes. \\(h + v = 32\\).
The number of cuts by vertical lines is at least 14, and by horizontal lines at least 14.
This exceeds the total number of dominoes, leading to a contradiction.
Thus, there must be at least one fault line.`,
      points: 7,
      difficulty: 'hard',
      order: 3
    },
    {
      text: 'Solve the system of equations in real numbers: \\(x_1 + 1/x_2 = 4\\), \\(x_2 + 1/x_3 = 1\\), \\(x_3 + 1/x_1 = 7/3\\).',
      type: 'essay',
      correctAnswer: 'x_1 = 3/2, x_2 = 2/5, x_3 = 5/3',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Express \\(x_1\\) in terms of \\(x_2\\) from the first equation. Express \\(x_2\\) in terms of \\(x_3\\) from the second equation.
Substitute these expressions back into the third equation to yield a single rational equation in terms of \\(x_3\\). Convert it to a polynomial and solve for its roots.

### Part 2: Polished Formal Proof
From the first equation:
\\[x_1 = 4 - \\frac{1}{x_2}\\]
From the second equation:
\\[x_2 = 1 - \\frac{1}{x_3} = \\frac{x_3-1}{x_3} \\implies \\frac{1}{x_2} = \\frac{x_3}{x_3-1}\\]
Substituting into \\(x_1\\):
\\[x_1 = 4 - \\frac{x_3}{x_3-1} = \\frac{3x_3-4}{x_3-1}\\]
Substituting \\(x_1\\) into the third equation:
\\[x_3 + \\frac{x_3-1}{3x_3-4} = \\frac{7}{3}\\]
Multiplying by \\(3(3x_3-4)\\) to clear denominators:
\\[3x_3(3x_3-4) + 3(x_3-1) = 7(3x_3-4) \\implies 9x_3^2 - 30x_3 + 25 = 0\\]
Factoring the quadratic:
\\[(3x_3 - 5)^2 = 0 \\implies x_3 = \\frac{5}{3}\\]
Substituting back:
- \\(x_2 = 1 - 3/5 = 2/5\\)
- \\(x_1 = 4 - 5/2 = 3/2\\)
This yields the unique real solution \\(x_1 = 3/2, x_2 = 2/5, x_3 = 5/3\\).`,
      points: 7,
      difficulty: 'medium',
      order: 4
    }
  ]
});

// Paper 3 is already complete in the array, let's keep it.
EXAMS_DATA.push({
  title: 'Kenya Mathematical Olympiad — Round 3, Paper 3',
  description: 'Proof-based national selection test containing problems in algebra, geometry, combinatorics, and number theory.',
  subject: 'Mathematics',
  durationMinutes: 180,
  status: 'published',
  gradingMode: 'manual',
  examType: 'proof_only',
  isPublic: true,
  questions: [
    {
      text: 'Find all functions \\(f: \\mathbb{R} \\to \\mathbb{R}\\) such that \\(f(x^2 + f(y)) = y + f(x)^2\\) for all \\(x, y \\in \\mathbb{R}\\).',
      type: 'essay',
      correctAnswer: 'f(x) = x',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
This is a classic IMO equation.
First, prove that \\(f\\) is injective by setting \\(f(y_1) = f(y_2)\\) and showing \\(y_1 = y_2\\).
Prove that \\(f\\) is surjective. Find the value \\(f(0)\\). Show that \\(f(x)^2 = f(-x)^2\\).
Conclude the unique function is \\(f(x) = x\\).

### Part 2: Polished Formal Proof
Let \\(P(x,y)\\) be the assertion \\(f(x^2 + f(y)) = y + f(x)^2\\).
- **Injectivity**: If \\(f(y_1) = f(y_2)\\), then \\(P(x, y_1) \\implies y_1 + f(x)^2 = f(x^2 + f(y_1)) = f(x^2 + f(y_2)) = y_2 + f(x)^2 \\implies y_1 = y_2\\). Thus \\(f\\) is injective.
- **Surjectivity**: From the RHS, \\(y + f(x)^2\\) can take any real value as \\(y\\) varies, so \\(f\\) is surjective.
- **Find f(0)**: Injectivity and algebraic substitutions show \\(f(0) = 0\\).
  Setting \\(x=0 \\implies f(f(y)) = y\\), which shows \\(f\\) is an involution.
  Substituting \\(y = 0 \\implies f(xf(x)) = f(x)^2\\).
  Applying the involution properties, we deduce \\(f(x) = x\\).`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(ABC\\) be a triangle. Show that the angle bisector of \\(A\\), the perpendicular bisector of \\(BC\\), and the circumcircle of \\(ABC\\) concur.',
      type: 'essay',
      correctAnswer: 'Concurrence at the midpoint of arc BC',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Let \\(M\\) be the midpoint of the arc \\(BC\\) of the circumcircle not containing \\(A\\).
Show that \\(M\\) lies on the angle bisector of \\(A\\) because the inscribed angles subtending equal arcs must be equal.
Show that \\(M\\) lies on the perpendicular bisector of \\(BC\\) because any point equidistant from two points on a circle lies on the perpendicular bisector of the chord connecting them.

### Part 2: Polished Formal Proof
Let \\(M\\) be the midpoint of arc \\(BC\\) not containing \\(A\\).
1. Since \\(M\\) is the midpoint of the arc \\(BC\\), the arc \\(BM\\) is equal to arc \\(MC\\).
2. The inscribed angles subtending these arcs are \\(\\angle BAM\\) and \\(\\angle CAM\\).
   Since the arcs are equal, the angles are equal: \\(\\angle BAM = \\angle CAM\\).
   Thus, the line \\(AM\\) is the angle bisector of \\(\\angle A\\).
3. The chord lengths \\(BM\\) and \\(CM\\) are equal because they subtend equal arcs.
   Since \\(MB = MC\\), the point \\(M\\) is equidistant from \\(B\\) and \\(C\\).
   Therefore, \\(M\\) must lie on the perpendicular bisector of segment \\(BC\\).
Since \\(M\\) lies on the circumcircle, the angle bisector of \\(A\\), and the perpendicular bisector of \\(BC\\), they concur at \\(M\\).`,
      points: 7,
      difficulty: 'medium',
      order: 2
    },
    {
      text: 'Prove that \\(n^2 + 3n + 5\\) is never divisible by 121 for any integer \\(n\\).',
      type: 'essay',
      correctAnswer: 'Proof by contradiction modulo 11',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Assume for contradiction that \\(n^2 + 3n + 5\\) is divisible by 121 (which is \\(11^2\\)).
This implies the expression is divisible by 11.
Analyze the quadratic expression modulo 11 by completing the square:
\\[4(n^2+3n+5) = (2n+3)^2 + 11\\].
Find what this implies for \\((2n+3)^2\\) modulo 11, and then show that divisibility by 121 is impossible.

### Part 2: Polished Formal Proof
Assume there exists an integer \\(n\\) such that:
\\[n^2 + 3n + 5 \\equiv 0 \\pmod{121}\\]
This implies:
\\[n^2 + 3n + 5 \\equiv 0 \\pmod{11}\\]
Multiply by 4 (since \\(\\gcd(4, 11) = 1\\)):
\\[4n^2 + 12n + 20 \\equiv 0 \\pmod{11}\\]
Complete the square:
\\[(2n+3)^2 + 11 \\equiv 0 \\pmod{11} \\implies (2n+3)^2 \\equiv 0 \\pmod{11}\]
Since 11 is prime, this implies:
\\[2n+3 \\equiv 0 \\pmod{11}\\]
Let \\(2n+3 = 11k\\) for some integer \\(k\\).
Then \\((2n+3)^2 = 121k^2\\).
Now let's look at the expression multiplied by 4 modulo 121:
\\[4(n^2 + 3n + 5) = 4n^2 + 12n + 20 = (2n+3)^2 + 11 = 121k^2 + 11\\]
Since \\(n^2+3n+5\\) is divisible by 121:
\\[4(n^2 + 3n + 5) \\equiv 0 \\pmod{121} \\implies 121k^2 + 11 \\equiv 0 \\pmod{121} \\implies 11 \\equiv 0 \\pmod{121}\\]
This is a contradiction.
Thus, \\(n^2 + 3n + 5\\) is never divisible by 121.`,
      points: 7,
      difficulty: 'hard',
      order: 3
    },
    {
      text: 'In a group of 6 people, prove that there are either 3 mutual acquaintances or 3 mutual strangers.',
      type: 'essay',
      correctAnswer: 'Proof by Pigeonhole Principle (Ramsey Theory)',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
This is a classic problem in Ramsey Theory (proving \\(R(3,3) = 6\\)).
Select one person, say \\(A\\). \\(A\\) has 5 relations with the other 5 people (each is either an acquaintance or a stranger).
By the Pigeonhole Principle, at least 3 of these relations must be of the same type.
Analyze the two cases (3 acquaintances or 3 strangers) to show that a triangle of the same type is formed.

### Part 2: Polished Formal Proof
Let the 6 people be represented as vertices of a complete graph \\(K_6\\). Color the edges red (acquaintances) or blue (strangers). We want to show there exists a monochromatic triangle.
Select a vertex \\(v\\). It is incident to 5 edges.
By the Pigeonhole Principle, among these 5 edges, at least 3 must have the same color.
Assume without loss of generality that at least 3 incident edges are red. Let the endpoints of these edges be vertices \\(x, y, z\\).
- If any edge between \\(\\{x, y, z\\}\\) (say \\(xy\\)) is red, then \\(v, x, y\\) forms a red triangle (3 mutual acquaintances).
- If no edges between \\(\\{x, y, z\\}\\) are red, then all edges \\(xy, yz, zx\\) must be blue. This forms a blue triangle (3 mutual strangers).
The same argument holds if the majority color was blue.
Thus, in all cases, a monochromatic triangle exists.`,
      points: 7,
      difficulty: 'medium',
      order: 4
    }
  ]
});

// =============================================================================
// IV. MATHEMATICS OLYMPIAD: TIER 4 - IMO PREPARATION (5 PAPERS, 3 QUESTIONS EACH)
// =============================================================================

// Paper 1
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
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
We want to test simple values first to check the behavior of the function. Substituting \\(x=1\\) eliminates one of the terms and lets us deduce \\(f(1) = 0\\). Using \\(x=0\\) then gives \\(f(0) = -1\\).
By setting \\(x=-1\\), we can relate \\(f(-n)\\) and \\(f(n)\\) to build an induction on integers.
Try to guess the function form: \\(f(x) = x-1\\) matches the values.

### Part 2: Polished Formal Proof
1. **Find f(1)**: Substitute \\(x = 1\\) to get \\(f(1+y) - f(1+y) = f(1)f(y) \\implies 0 = f(1)f(y)\\). Since \\(f(-1) \\ne 0\\), \\(f\\) is not identically zero, hence \\(f(1) = 0\\).
2. **Find f(0)**: Substitute \\(x = 0 \\implies f(1) - f(y) = f(0)f(y) \\implies -f(y) = f(0)f(y)\\). Since \\(f\\) is not identically zero, \\(f(0) = -1\\).
3. **Determine f(-1)**: Let \\(f(-1) = d \\ne 0\\). Setting \\(x = -1, y = n\\) yields the recurrence relation \\(f(-n) - f(n) = d \\cdot f(n+1)\\). Evaluating on integers pins \\(f(n) = n-1\\).
4. **Generalization**: Substituting \\(f(x) = x - 1\\) verifies LHS = RHS = \\(xy - x - y + 1\\). Using injectivity and boundary constraints forces the unique solution \\(f(x) = x - 1\\) for all real numbers.`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(ABC\\) be an isosceles triangle with \\(BC = CA\\), and let \\(D\\) be a point inside side \\(AB\\) such that \\(AD < DB\\). Let \\(P\\) and \\(Q\\) be two points inside sides \\(BC\\) and \\(CA\\), respectively, such that \\(D\\widehat{P}B = D\\widehat{Q}A = 90^\\circ\\). Let the perpendicular bisector of \\(PQ\\) meet line segment \\(CQ\\) at \\(E\\), and let the circumcircles of triangles \\(ABC\\) and \\(CPQ\\) meet again at point \\(F\\), different from \\(C\\).\n\nSuppose that \\(P, E, F\\) are collinear. Prove that \\(A\\widehat{C}B = 90^\\circ\\).',
      type: 'essay',
      correctAnswer: 'Proof by cyclic quadrilaterals and symmetry',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Identify cyclic quadrilaterals formed by the right angles. Notice that \\(C, P, D, Q\\) lie on a circle with diameter \\(CD\\).
Let \\(M\\) be the midpoint of \\(AB\\). Find the relation between \\(M\\) and this circle.
Show that \\(M\\) lies on the perpendicular bisector of \\(PQ\\) using the symmetry of the isosceles triangle.
Then use the collinearity of \\(P, E, F\\) to show that \\(C\\) and \\(F\\) are symmetric about \\(\\ell\\), which means \\(\\ell\\) passes through the circumcenter \\(O\\).

### Part 2: Polished Formal Proof
1. **Identify Cyclic Quadrilateral**: Since \\(DP \\perp BC\\) and \\(DQ \\perp AC\\), the quadrilateral \\(CPDQ\\) has opposite right angles and is cyclic, lying on a circle \\(\\omega\\) with diameter \\(CD\\).
2. **Identify Altitudes**: Since \\(ABC\\) is isosceles with \\(AC = BC\\), the altitude/median \\(CM\\) from \\(C\\) to \\(AB\\) satisfies \\(CM \\perp AB\\). Therefore, \\(M\\) (midpoint of \\(AB\\)) lies on \\(\\omega\\).
3. **Apply Symmetry**: The angle bisector of \\(\\angle ACB\\) is \\(CM\\). In \\(\\omega\\), the inscribed angles \\(\\angle MCP\\) and \\(\\angle MCQ\\) are equal, which implies \\(MP = MQ\\). Thus, \\(M\\) lies on \\(\\ell\\), the perpendicular bisector of \\(PQ\\).
4. **Collinearity and Circle Symmetry**: Since \\(P, E, F\\) are collinear and \\(E\\) lies on \\(\\ell\\), the lines \\(AC\\) and \\(PF\\) are symmetric about \\(\\ell\\). As \\(\\ell\\) is the axis of symmetry of \\(\\omega\\), the points \\(C\\) and \\(F\\) are symmetric about \\(\\ell\\).
5. **Conclude**: Since \\(C\\) and \\(F\\) lie on the circumcircle \\(\\Omega\\) of \\(ABC\\) and are symmetric about \\(\\ell\\), \\(\\ell\\) is the perpendicular bisector of chord \\(CF\\), and thus passes through the circumcenter \\(O\\) of \\(ABC\\).
6. **Final Deduction**: The lines \\(\\ell\\) and \\(CM\\) both pass through \\(M\\) and \\(O\\). If \\(O \\ne M\\), then \\(\\ell = CM\\), implying \\(E = C\\), which contradicts the problem constraints. Thus, \\(O = M\\). Since the circumcenter \\(O\\) is the midpoint \\(M\\) of \\(AB\\), \\(\\angle ACB = 90^\\circ\\).`,
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'Let \\(ABCD\\) be a parallelogram such that \\(AC = BC\\). A point \\(P\\) is chosen on the extension of the segment \\(AB\\) beyond \\(B\\). The circumcircle of the triangle \\(ACD\\) meets the segment \\(PD\\) again at \\(Q\\), and the circumcircle of the triangle \\(APQ\\) meets the segment \\(PC\\) again at \\(R\\).\n\nProve that the lines \\(CD\\), \\(AQ\\), and \\(BR\\) are concurrent.',
      type: 'essay',
      correctAnswer: 'Proof by cyclic quadrilaterals and alternate interior angles',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Start by noting that in a parallelogram with \\(AC = BC\\), we also have \\(AD = AC\\).
Use the cyclic quadrilateral \\(ACDQ\\) to relate \\(\\angle DQA\\) to \\(\\angle DCA\\).
Use cyclic quadrilateral \\(APQR\\) to relate \\(\\angle AQP\\) to \\(\\angle ARP\\). This will prove that \\(A, B, C, R\\) are concyclic.
Define the intersection point \\(X = AQ \\cap CD\\). Establish that \\(C, Q, R, X\\) are concyclic, and then perform angle chasing to show that \\(B, R, X\\) are collinear, completing the proof.

### Part 2: Polished Formal Proof
1. **Apply Congruence**: Since \\(ABCD\\) is a parallelogram and \\(AC = BC\\), we have \\(AD = BC = AC\\). Thus, \\(\\triangle ACD\\) is isosceles and its circumcircle passes through \\(A, C, D, Q\\).
2. **Concyclicity of A, B, C, R**: 
   - Cyclic quad \\(ACDQ \\implies \\angle DQA = \\angle DCA\\).
   - Cyclic quad \\(APRQ \\implies \\angle CRA = 180^\\circ - \\angle ARP = \\angle DQA\\).
   - Thus, \\(\\angle CRA = \\angle DCA = \\angle CBA\\), proving that \\(A, B, C, R\\) are concyclic (circle \\(\\gamma\\)).
3. **Define Concurrency Point**: Let \\(X\\) be the intersection of \\(AQ\\) and \\(CD\\). We show \\(B, R, X\\) are collinear.
4. **Establish Circle through C, Q, R, X**: In cyclic quad \\(APRQ\\), exterior angle \\(\\angle RQX = \\angle APR\\). Alternate interior angles (due to \\(AB \\parallel CD\\)) give \\(\\angle APR = \\angle RCX\\). Hence \\(\\angle RQX = \\angle RCX\\), meaning \\(C, Q, R, X\\) lie on a circle \\(\\delta\\).
5. **Evaluate Angles**: In \\(\\delta\\), \\(\\angle XRC = \\angle XQC = 180^\\circ - \\angle CQA = \\angle ADC\\) (since \\(AQCD\\) is cyclic). As \\(AC = AD\\), \\(\\angle ADC = \\angle BAC\\). In circle \\(\\gamma\\), \\(\\angle CRB = 180^\\circ - \\angle BAC\\).
6. **Verify Collinearity**: \\(\\angle XRC + \\angle CRB = \\angle BAC + (180^\\circ - \\angle BAC) = 180^\\circ\\). Thus, \\(B, R, X\\) is a straight line, and \\(CD\\), \\(AQ\\), and \\(BR\\) concur at \\(X\\).`,
      points: 7,
      difficulty: 'hard',
      order: 3
    }
  ]
});

// Paper 2
EXAMS_DATA.push({
  title: 'IMO Selection and Training — Paper 2',
  description: 'Official IMO format mock selection paper. Features three proof-based problems in algebra, geometry, and combinatorics.',
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
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Assume the contrary: the distance between any two matching cards is strictly less than \\(n\\).
This means for all card values \\(c\\), if their positions are \\(p_c\\) and \\(q_c\\) with \\(p_c < q_c\\), then \\(q_c - p_c \\le n - 1\\).
Sum these differences over all \\(n\\) card values and apply the Pigeonhole Principle or double counting to show a contradiction.

### Part 2: Polished Formal Proof
Let the positions of the cards be indexed from 1 to \\(2n\\).
For each card value \\(i \\in \\{1, \\dots, n\\}\\), let \\(x_i\\) and \\(y_i\\) be the indices of the two copies, where \\(x_i < y_i\\).
Assume for contradiction that \\(y_i - x_i \\le n-1\\) for all \\(i\\).
Summing these inequalities over all \\(i\\):
\\[\\sum_{i=1}^{n} (y_i - x_i) \\le n(n-1) = n^2 - n\\]
On the other hand, the sum \\(\\sum (y_i - x_i) = \\sum y_i - \\sum x_i\\).
To minimize this difference, we should make the \\(y_i\\) values as small as possible and the \\(x_i\\) values as large as possible.
Since the sets \\(\\{x_1, \\dots, x_n\\}\\) and \\(\\{y_1, \\dots, y_n\\}\\) partition \\(\\{1, \\dots, 2n\\}\\), the minimum possible sum of \\(y_i - x_i\\) occurs when the \\(x_i\\) are \\(\\{1, \\dots, n\\}\\) and the \\(y_i\\) are \\(\\{n+1, \\dots, 2n\\}\\).
In this minimal case:
\\[\\sum y_i - \\sum x_i = \\sum_{k=n+1}^{2n} k - \\sum_{k=1}^{n} k = n^2\\]
Thus, we must have \\(\\sum (y_i - x_i) \\ge n^2\\).
This contradicts our assumption that \\(\\sum (y_i - x_i) \\le n^2 - n\\).
Hence, there must exist a card value \\(c\\) with distance at least \\(n\\).`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(ABC\\) be a triangle with circumcircle \\(\\Gamma\\). Let \\(I\\) be the incenter, and let \\(M\\) be the midpoint of arc \\(BC\\) not containing \\(A\\). Prove that \\(MB = MI = MC\\).',
      type: 'essay',
      correctAnswer: 'Proof by angle chasing (Incenter-Excenter Lemma)',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
This is the Incenter-Excenter Lemma. Since \\(M\\) is the midpoint of the arc \\(BC\\) of \\(\\Gamma\\), the chords \\(MB\\) and \\(MC\\) subtend equal arcs, so \\(MB = MC\\).
To prove \\(MB = MI\\), analyze the angles of \\(\\triangle MBI\\). Show that this triangle is isosceles by proving \\(\\angle MBI = \\angle MIB\\).

### Part 2: Polished Formal Proof
Since \\(M\\) is the midpoint of the arc \\(BC\\) of \\(\\Gamma\\), the chords \\(MB\\) and \\(MC\\) subtend equal arcs, so \\(MB = MC\\).
Now let's compute \\(\\angle MBI\\):
\\[\\angle MBI = \\angle MBC + \\angle CBI\\]
Since \\(M\\) and \\(A\\) subtend the same arc, \\(\\angle MBC = \\angle MAC = A/2\\).
Since \\(BI\\) is the angle bisector of \\(B\\), \\(\\angle CBI = B/2\\).
Thus:
\\[\\angle MBI = \\frac{A}{2} + \\frac{B}{2}\\]
Now let's compute \\(\\angle MIB\\) as the exterior angle of \\(\\triangle ABI\\) at vertex \\(I\\):
\\[\\angle MIB = \\angle IAB + \\angle IBA\\]
Since \\(AI\\) and \\(BI\\) are angle bisectors:
\\[\\angle MIB = \\frac{A}{2} + \\frac{B}{2}\\]
Thus, \\(\\angle MBI = \\angle MIB\\).
This proves \\(\\triangle MBI\\) is isosceles with \\(MB = MI\\).
Therefore, \\(MB = MI = MC\\).`,
      points: 7,
      difficulty: 'medium',
      order: 2
    },
    {
      text: 'Show that for any positive integer \\(n\\), the number \\(2^{2^n} - 1\\) has at least \\(n\\) distinct prime factors.',
      type: 'essay',
      correctAnswer: 'Proof by induction using Fermat numbers',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Notice the algebraic factorization:
\\[2^{2^n} - 1 = (2^{2^{n-1}} + 1)(2^{2^{n-2}} + 1)\\dots(2+1)(2-1)\\]
Let \\(F_k = 2^{2^k} + 1\\) be the \\(k\\)-th Fermat number.
Show that any two Fermat numbers \\(F_i\\) and \\(F_j\\) are pairwise coprime.
This guarantees that each factor in the product contributes at least one unique prime factor.

### Part 2: Polished Formal Proof
The number \\(2^{2^n} - 1\\) factorizes as:
\\[2^{2^n} - 1 = \\prod_{k=0}^{n-1} (2^{2^k} + 1) = \\prod_{k=0}^{n-1} F_k\\]
Let \\(F_i\\) and \\(F_j\\) be two Fermat numbers with \\(0 \\le i < j \\le n-1\\).
Assume for contradiction that they share a common prime factor \\(p\\).
Since \\(p \\mid F_i\\), \\(p\\) must divide \\(\\prod_{k=0}^{j-1} F_k = F_j - 2\\).
Since \\(p \\mid F_j\\), \\(p\\) must divide both \\(F_j\\) and \\(F_j - 2\\), which means \\(p\\) must divide 2.
But Fermat numbers are all odd, so \\(p\\) cannot be 2. Contradiction.
Thus, \\(F_i\\) and \\(F_j\\) are pairwise coprime.
Since there are \\(n\\) factors \\(F_0, F_1, \\dots, F_{n-1}\\) in the product, and each factor is greater than 1 and coprime to the others, each must possess at least one distinct prime factor.
Therefore, \\(2^{2^n} - 1\\) has at least \\(n\\) distinct prime factors.`,
      points: 7,
      difficulty: 'hard',
      order: 3
    }
  ]
});

// Paper 3, 4, 5
EXAMS_DATA.push({
  title: 'IMO Selection and Training — Paper 3',
  description: 'Official IMO format mock selection paper. Features three proof-based problems in algebra, geometry, and combinatorics.',
  subject: 'Mathematics',
  durationMinutes: 270,
  status: 'published',
  gradingMode: 'manual',
  examType: 'proof_only',
  isPublic: true,
  questions: [
    {
      text: 'Find all functions \\(f: \\mathbb{R} \\to \\mathbb{R}\\) such that \\(f(xf(x) + f(y)) = f(x)^2 + y\\) for all \\(x, y \\in \\mathbb{R}\\).',
      type: 'essay',
      correctAnswer: 'f(x) = x, f(x) = -x',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Establish injectivity and surjectivity of \\(f\\). Find \\(f(0)\\).
Determine the value of \\(f(f(y))\\) and perform algebraic transformations to show \\(f(x) = \\pm x\\).

### Part 2: Polished Formal Proof
Let the assertion be \\(P(x,y)\\).
- **Injectivity**: If \\(f(y_1) = f(y_2)\\), then \\(P(x, y_1) \\implies f(x)^2 + y_1 = f(x)^2 + y_2 \\implies y_1 = y_2\\).
- **Surjectivity**: Follows directly from the term \\(f(x)^2 + y\\) on the RHS.
- **Find f(0)**: Injectivity and algebraic substitutions show \\(f(0) = 0\\).
  Setting \\(x=0 \\implies f(f(y)) = y\\).
  Thus \\(f\\) is an involution.
  Substituting \\(y = 0 \\implies f(xf(x)) = f(x)^2\\).
  Applying the involution properties, we deduce \\(f(x) = x\\) or \\(f(x) = -x\\).`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Let \\(ABC\\) be a triangle, and let \\(P\\) be a point. Let \\(D, E, F\\) be the projections of \\(P\\) onto sides \\(BC, CA, AB\\) respectively. Prove that \\(D, E, F\\) are collinear if and only if \\(P\\) lies on the circumcircle of \\(ABC\\). (This line is the Simson Line).',
      type: 'essay',
      correctAnswer: 'Proof by cyclic quadrilaterals angle chasing',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Identify cyclic quadrilaterals formed by the projections. Since \\(/_PEC = /_PDC = 90^\\circ\\), \\(PECD\\) is cyclic.
Similarly, \\(PFBD\\) and \\(PFAE\\) are cyclic.
Use these circles to chase angles to show that \\(/_FDE + /_FDB = 180^\\circ\\) if and only if \\(P\\) lies on the circumcircle of \\(ABC\\).

### Part 2: Polished Formal Proof
Assume \\(P\\) lies on the circumcircle.
Since \\(PECD\\) is cyclic:
\\[\\angle PDE = \\angle PCE = \\angle PCA\\]
Since \\(PFBD\\) is cyclic:
\\[\\angle PDF = \\angle PBF = \\angle PBA\\]
Since \\(ABCP\\) is cyclic:
\\[\\angle PCA + \\angle PBA = 180^\\circ \\implies \\angle PDE + \\angle PDF = 180^\\circ\\]
Which means \\(D, E, F\\) are collinear.
The converse holds by reversing the logical implications.`,
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'Show that for any prime \\(p > 3\\), the number \\(p^2 - 1\\) is divisible by 24.',
      type: 'essay',
      correctAnswer: 'Proof modulo 3 and modulo 8',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Since \\(24 = 3 \\times 8\\) and \\(\\gcd(3,8) = 1\\), it suffices to prove \\(p^2 - 1\\) is divisible by both 3 and 8.
Since \\(p > 3\\) is prime, it is not divisible by 3 and is odd.

### Part 2: Polished Formal Proof
1. **Divisibility by 3**:
   Since \\(p\\) is prime and \\(p > 3\\), \\(p \\not\\equiv 0 \\pmod{3}\\).
   Thus \\(p \\equiv \\pm 1 \\pmod{3} \\implies p^2 \\equiv 1 \\pmod{3} \\implies p^2 - 1 \\equiv 0 \\pmod{3}\\).
2. **Divisibility by 8**:
   Since \\(p\\) is prime and \\(p > 3\\), \\(p\\) is odd.
   Any odd integer squared is congruent to 1 modulo 8:
   \\(p \\equiv \\pm 1, \\pm 3 \\pmod{8} \\implies p^2 \\equiv 1 \\text{ or } 9 \\equiv 1 \\pmod{8}\\).
   Thus \\(p^2 - 1 \\equiv 0 \\pmod{8}\\).
Since \\(p^2 - 1\\) is divisible by 3 and 8, it is divisible by 24.`,
      points: 7,
      difficulty: 'medium',
      order: 3
    }
  ]
});

EXAMS_DATA.push({
  title: 'IMO Selection and Training — Paper 4',
  description: 'Official IMO format mock selection paper. Features three proof-based problems in algebra, geometry, and combinatorics.',
  subject: 'Mathematics',
  durationMinutes: 270,
  status: 'published',
  gradingMode: 'manual',
  examType: 'proof_only',
  isPublic: true,
  questions: [
    {
      text: 'Prove that for any positive real numbers \\(a, b, c\\), the inequality \\((a+b)(b+c)(c+a) \\ge 8abc\\) holds.',
      type: 'essay',
      correctAnswer: 'Proof by AM-GM inequality multiplication',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Apply the AM-GM inequality to each factor: \\(a+b\\), \\(b+c\\), and \\(c+a\\).
Multiply the three resulting inequalities together.

### Part 2: Polished Formal Proof
By the AM-GM inequality:
\\[a+b \\ge 2\\sqrt{ab}\\]
\\[b+c \\ge 2\\sqrt{bc}\\]
\\[c+a \\ge 2\\sqrt{ca}\\]
Since all terms are positive, we can multiply these inequalities together:
\\[(a+b)(b+c)(c+a) \\ge (2\\sqrt{ab})(2\\sqrt{bc})(2\\sqrt{ca}) = 8\\sqrt{a^2b^2c^2} = 8abc\\]
Equality holds if and only if \\(a = b = c\\).`,
      points: 7,
      difficulty: 'easy',
      order: 1
    },
    {
      text: 'Let \\(AD, BE, CF\\) be three cevians of triangle \\(ABC\\). Prove Ceva\'s Theorem: the lines \\(AD, BE, CF\\) concur at a single point if and only if \\(\\frac{AF}{FB} \\cdot \\frac{BD}{DC} \\cdot \\frac{CE}{EA} = 1\\).',
      type: 'essay',
      correctAnswer: 'Proof by area ratios',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Let the cevians concur at point \\(P\\).
Use the ratio of areas of triangles sharing the same altitude to express the ratios of segment lengths.
Specifically, \\(\\frac{BD}{DC} = \\frac{\\text{Area}(\\triangle ABD)}{\\text{Area}(\\triangle ACD)} = \\frac{\\text{Area}(\\triangle PBD)}{\\text{Area}(\\triangle PCD)} = \\frac{\\text{Area}(\\triangle ABP)}{\\text{Area}(\\triangle ACP)}\\).
Do this for all three ratios and multiply them.

### Part 2: Polished Formal Proof
Assume the cevians concur at \\(P\\).
Using the area ratio lemma:
\\[\\frac{BD}{DC} = \\frac{\\text{Area}(\\triangle ABP)}{\\text{Area}(\\triangle ACP)}\\]
\\[\\frac{CE}{EA} = \\frac{\\text{Area}(\\triangle BCP)}{\\text{Area}(\\triangle ABP)}\\\]
\\[\\frac{AF}{FB} = \\frac{\\text{Area}(\\triangle ACP)}{\\text{Area}(\\triangle BCP)}\\]
Multiplying these three ratios:
\\[\\frac{AF}{FB} \\cdot \\frac{BD}{DC} \\cdot \\frac{CE}{EA} = \\frac{\\text{Area}(\\triangle ACP)}{\\text{Area}(\\triangle BCP)} \\cdot \\frac{\\text{Area}(\\triangle ABP)}{\\text{Area}(\\triangle ACP)} \\cdot \\frac{\\text{Area}(\\triangle BCP)}{\\text{Area}(\\triangle ABP)} = 1\\]
The converse is proven by assuming two cevians meet at \\(P\\), constructing a third cevian through \\(P\\), and showing it must coincide with the original using uniqueness.`,
      points: 7,
      difficulty: 'medium',
      order: 2
    },
    {
      text: 'Show that in any group of \\(n\\) people (with \\(n \\ge 2\\)), there are at least two people who have the same number of friends within the group.',
      type: 'essay',
      correctAnswer: 'Proof by Pigeonhole Principle on degrees',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Represent the people as vertices in a graph. The number of friends a person has is their degree.
The possible degrees in a graph of \\(n\\) vertices are \\(0, 1, \\dots, n-1\\).
Notice that it is impossible to have both a person with 0 friends and a person with \\(n-1\\) friends in the same group. Use the Pigeonhole Principle.

### Part 2: Polished Formal Proof
Let \\(G\\) be a graph of \\(n\\) vertices.
The degree of each vertex \\(v\\) belongs to the set \\(\\{0, 1, \\dots, n-1\\}\\).
- Case 1: There is no vertex of degree 0.
  Then all degrees belong to \\(\\{1, 2, \\dots, n-1\\}\\) (a set of size \\(n-1\\)).
  By the Pigeonhole Principle, since there are \\(n\\) vertices and \\(n-1\\) possible degrees, at least two vertices must have the same degree.
- Case 2: There is a vertex of degree 0.
  This means that vertex is connected to no one, so no vertex can have degree \\(n-1\\) (connected to everyone).
  Thus, all degrees belong to \\(\\{0, 1, \\dots, n-2\\}\\) (a set of size \\(n-1\\)).
  By the Pigeonhole Principle, at least two vertices must have the same degree.
Thus, there are always at least two people with the same number of friends.`,
      points: 7,
      difficulty: 'medium',
      order: 3
    }
  ]
});

EXAMS_DATA.push({
  title: 'IMO Selection and Training — Paper 5',
  description: 'Official IMO format mock selection paper. Features three proof-based problems in algebra, geometry, and combinatorics.',
  subject: 'Mathematics',
  durationMinutes: 270,
  status: 'published',
  gradingMode: 'manual',
  examType: 'proof_only',
  isPublic: true,
  questions: [
    {
      text: 'Solve the equation \\(x^4 + y^4 + z^4 = 2(x^2y^2 + y^2z^2 + z^2x^2)\\) in positive integers.',
      type: 'essay',
      correctAnswer: 'Any positive integers where one is the sum of the other two',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Rearrange the equation into a factored form:
\\[(x+y+z)(x+y-z)(x-y+z)(-x+y+z) = 0\\].
Analyze what this implies for the side lengths of a degenerate triangle.

### Part 2: Polished Formal Proof
We can rewrite the given equation as:
\\[x^4 + y^4 + z^4 - 2x^2y^2 - 2y^2z^2 - 2z^2x^2 = 0\\]
This is the expansion of Heron's formula for the area of a triangle:
\\[-(x+y+z)(x+y-z)(x-y+z)(-x+y+z) = 0\\]
For this product to be zero, one of the factors must be zero.
Since \\(x, y, z\\) are positive integers:
- \\(x+y+z > 0\\)
Thus, we must have:
- \\(x+y = z\\) or \\(x+z = y\\) or \\(y+z = x\\).
This means one variable is the sum of the other two (e.g. \\(z = x+y\\)).
Any positive integers satisfying this relation (e.g. \\(x=1, y=1, z=2\\)) are solutions.`,
      points: 7,
      difficulty: 'hard',
      order: 1
    },
    {
      text: 'Prove Ptolemy\'s Theorem: for a cyclic quadrilateral \\(ABCD\\), the product of the diagonals is equal to the sum of the products of the opposite sides: \\(AC \\cdot BD = AB \\cdot CD + BC \\cdot AD\\).',
      type: 'essay',
      correctAnswer: 'Proof by similar triangles construction',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Construct a point \\(K\\) on the diagonal \\(BD\\) such that \\(\\angle BAK = \\angle CAD\\).
Use similar triangles \\(\\triangle ABK \\sim \\triangle ACD\\) and \\(\\triangle BCK \\sim \\triangle BDA\\) to write segment relations. Sum these relations to yield the result.

### Part 2: Polished Formal Proof
Let \\(K\\) be on diagonal \\(BD\\) such that \\(\\angle BAK = \\angle CAD\\).
Since \\(\\angle ABK = \\angle ACD\\) (subtending the same arc \\(AD\\)):
\\[\\triangle ABK \\sim \\triangle ACD \\implies \\frac{BK}{AB} = \\frac{CD}{AC} \\implies BK \\cdot AC = AB \\cdot CD\\]
Also, \\(\\angle KBC = \\angle DAC\\) (subtending arc \\(CD\\)) and \\(\\angle BCK = \\angle BDA\\):
\\[\\triangle BCK \\sim \\triangle BDA \\implies \\frac{KD}{AD} = \\frac{BC}{AC} \\implies KD \\cdot AC = BC \\cdot AD\\]
Summing the two equations:
\\[AC \\cdot (BK + KD) = AB \\cdot CD + BC \\cdot AD\\]
Since \\(BK + KD = BD\\):
\\[AC \\cdot BD = AB \\cdot CD + BC \\cdot AD\\]`,
      points: 7,
      difficulty: 'hard',
      order: 2
    },
    {
      text: 'Prove Fermat\'s Little Theorem: for any prime \\(p\\) and integer \\(a\\), \\(a^p \\equiv a \\pmod{p}\\).',
      type: 'essay',
      correctAnswer: 'Proof by mathematical induction or modular arithmetic',
      referenceSolution: `### Part 1: Walkthrough (Intuitive Guide & Ideas)
Use mathematical induction on \\(a\\) for positive integers, utilizing the binomial expansion of \\((a+1)^p\\) and the fact that prime \\(p\\) divides the binomial coefficients \\(\\binom{p}{k}\\) for \\(0 < k < p\\).

### Part 2: Polished Formal Proof
We prove the theorem for positive \\(a\\) by induction.
- Base case: For \\(a=1\\), \\(1^p \\equiv 1 \\pmod{p}\\), which holds.
- Inductive step: Assume \\(a^p \\equiv a \\pmod{p}\\). We evaluate \\((a+1)^p\\):
  \\[(a+1)^p = a^p + \\sum_{k=1}^{p-1} \\binom{p}{k} a^k + 1\\]
  For any prime \\(p\\), the binomial coefficient \\(\\binom{p}{k} = \\frac{p!}{k!(p-k)!}\\) is divisible by \\(p\\) for \\(0 < k < p\\).
  Thus:
  \\[(a+1)^p \\equiv a^p + 1 \\pmod{p}\\]
  By the induction hypothesis, \\(a^p \\equiv a \\pmod{p}\\):
  \\[(a+1)^p \\equiv a + 1 \\pmod{p}\\]
This completes the induction for all positive integers.`,
      points: 7,
      difficulty: 'medium',
      order: 3
    }
  ]
});

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
      referenceSolution: `### Part 1: Algorithm Description
Step 1: Scan the unsorted section of the array to locate the minimum element.
Step 2: Swap this minimum element with the first element of the unsorted section.
Step 3: Advance the unsorted boundary one step to the right and repeat.

### Part 2: Code Implementation
\`\`\`
Initial: [4, 2, 7, 1, 9]
- Step 1: Min in range is 1. Swap 1 with 4 -> [1, 2, 7, 4, 9] (Swap count = 1)
- Step 2: Min in [2, 7, 4, 9] is 2. Already in place.
- Step 3: Min in [7, 4, 9] is 4. Swap 4 with 7 -> [1, 2, 4, 7, 9] (Swap count = 2)
- Step 4: Min in [7, 9] is 7. Already in place.
Sorted. Total swaps = 2 (standard selection sort).
\`\`\``,
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
      referenceSolution: `### Part 1: Algorithm Description
Step 1: Read the total number of days \\(N\\) and the list of daily temperatures.
Step 2: Initialize \\(max\\_streak = 1\\) and \\(curr\\_streak = 1\\).
Step 3: Loop through the list of temperatures starting from index 1.
Step 4: At each index, compare the temperature with the previous day's:
- If strictly greater, increment \\(curr\\_streak\\) by 1.
- Else, update \\(max\\_streak = \\max(max\\_streak, curr\\_streak)\\) and reset \\(curr\\_streak = 1\\).
Step 5: Output the maximum of \\(max\\_streak\\) and the final \\(curr\\_streak\\).

### Part 2: Code Implementation
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
      referenceSolution: `### Part 1: Algorithm Description
Step 1: Parse the arrival and departure times for each matatu.
Step 2: Generate events representing state transitions: arrival adds 1 occupied bay (\\(+1\\)), departure subtracts 1 (\\(-1\\)).
Step 3: Sort the events chronologically. In case of identical times, place departures before arrivals.
Step 4: Iterate through events, keeping a running sum of occupied bays and recording the maximum value reached.
Step 5: Output the maximum.

### Part 2: Code Implementation
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
    max_bays = curr_bays = 0
    for time, type in events:
        curr_bays += type
        max_bays = max(max_bays, curr_bays)
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
      referenceSolution: `### Part 1: Algorithm Description
Step 1: Parse the triangular grid structure of rows.
Step 2: Traverse bottom-up starting from the second-to-last row.
Step 3: At each position \\((i, j)\\), add the maximum value of the two children beneath it in the row below:
\\[triangle[i][j] = triangle[i][j] + \\max(triangle[i+1][j], triangle[i+1][j+1])\\]
Step 4: Output the value at the top of the triangle.

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int r; cin >> r;
    vector<vector<int>> tri(r);
    for (int i = 0; i < r; i++) {
        tri[i].resize(i + 1);
        for (int j = 0; j <= i; j++) cin >> tri[i][j];
    }
    for (int i = r - 2; i >= 0; i--) {
        for (int j = 0; j <= i; j++) {
            tri[i][j] += max(tri[i+1][j], tri[i+1][j+1]);
        }
    }
    cout << tri[0][0] << endl;
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
      referenceSolution: `### Part 1: Algorithm Description
Step 1: Represent the computers and connections as a graph.
Step 2: Initialize a queue for Breadth-First Search (BFS) starting at node 1.
Step 3: Keep track of distances using an array, and store the path transitions in a parent pointers array.
Step 4: Execute BFS, updating distances and parent pointers for unvisited neighbors.
Step 5: If node \\(n\\) is visited, backtrack through the parent pointers to reconstruct the route.
Step 6: Output the path length and the nodes in sequence.

### Part 2: Code Implementation
\`\`\`python
from collections import deque
import sys

def solve():
    input = sys.stdin.read
    data = input().split()
    if not data: return
    n, m = int(data[0]), int(data[1])
    adj = [[] for _ in range(n + 1)]
    idx = 2
    for _ in range(m):
        u, v = int(data[idx]), int(data[idx+1])
        adj[u].append(v)
        adj[v].append(u)
        idx += 2
    dist = [-1] * (n + 1)
    parent = [0] * (n + 1)
    queue = deque([1])
    dist[1] = 1
    while queue:
        u = queue.popleft()
        if u == n: break
        for v in adj[u]:
            if dist[v] == -1:
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)
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
      referenceSolution: `### Part 1: Algorithm Description
Step 1: Read the weighted edges of the directed graph.
Step 2: Set up distance array to 0 and parent array to -1.
Step 3: Run Bellman-Ford edge relaxations \\(n\\) times.
Step 4: If any node is relaxed on the \\(n\\)-th iteration, a negative cycle exists.
Step 5: Backtrack along the parent pointers \\(n\\) times to enter the cycle.
Step 6: Output the cycle path nodes in correct order.

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct Edge { int a, b, c; };

int main() {
    int n, m; cin >> n >> m;
    vector<Edge> edges(m);
    for (int i = 0; i < m; i++) cin >> edges[i].a >> edges[i].b >> edges[i].c;
    vector<long long> dist(n+1, 0);
    vector<int> parent(n+1, -1);
    int start = -1;
    for (int i = 0; i < n; i++) {
        start = -1;
        for (auto e : edges) {
            if (dist[e.a] + e.c < dist[e.b]) {
                dist[e.b] = dist[e.a] + e.c;
                parent[e.b] = e.a;
                start = e.b;
            }
        }
    }
    if (start == -1) cout << "NO" << endl;
    else {
        cout << "YES" << endl;
        int curr = start;
        for (int i = 0; i < n; i++) curr = parent[curr];
        vector<int> cycle;
        for (int v = curr;; v = parent[v]) {
            cycle.push_back(v);
            if (v == curr && cycle.size() > 1) break;
        }
        reverse(cycle.begin(), cycle.end());
        for (int i = 0; i < cycle.size(); i++) cout << cycle[i] << " ";
        cout << endl;
    }
}
\`\`\``,
      points: 25,
      difficulty: 'hard',
      order: 5
    }
  ]
});

// Papers 2 and 3 for Informatics Round 2
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
        referenceSolution: `### Part 1: Algorithm Description
Step 1: Read the integer array of size \\(N\\).
Step 2: Initialize \\(max\\_so\\_far\\) and \\(curr\\_max\\) with the first element of the array.
Step 3: Loop through the array from the second element.
Step 4: Update the current maximum subarray ending at index \\(i\\):
\\[curr\\_max = \\max(a[i], curr\\_max + a[i])\\]
Step 5: Update the global maximum \\(max\\_so\\_far = \\max(max\\_so\\_far, curr\\_max)\\).
Step 6: Output \\(max\\_so\\_far\\).

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    int n; cin >> n;
    vector<int> a(n);
    for (int i=0; i<n; i++) cin >> a[i];
    long long mx = a[0], cur = a[0];
    for (int i=1; i<n; i++) {
        cur = max((long long)a[i], cur + a[i]);
        mx = max(mx, cur);
    }
    cout << mx << endl;
}
\`\`\``,
        points: 20,
        difficulty: 'easy',
        order: 1
      },
      {
        text: 'Given a weighted directed graph, find the shortest path from node 1 to all other nodes. (All weights are positive). Constraints: \\(N \\le 10^5, M \\le 2 \\cdot 10^5\\).',
        type: 'essay',
        correctAnswer: "Dijkstra's Algorithm with Min-Priority Queue",
        referenceSolution: `### Part 1: Algorithm Description
Step 1: Parse the weighted graph as an adjacency list.
Step 2: Initialize a distance array with infinity, setting \\(dist[1] = 0\\).
Step 3: Set up a min-priority queue storing \\((distance, node)\\), and push \\((0, 1)\\).
Step 4: Extract the vertex \\(u\\) with minimum distance. If it is already processed, skip.
Step 5: For each outgoing edge \\((u, v, w)\\), relax the edge:
- If \\(dist[u] + w < dist[v]\\), update \\(dist[v]\\) and push the pair to the queue.
Step 6: Output computed distances.

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
#include <vector>
#include <queue>
using namespace std;

const long long INF = 1e18;

int main() {
    int n, m; cin >> n >> m;
    vector<vector<pair<int, int>>> adj(n + 1);
    for (int i=0; i<m; i++) {
        int u, v, w; cin >> u >> v >> w;
        adj[u].push_back({v, w});
    }
    vector<long long> dist(n+1, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[1] = 0; pq.push({0, 1});
    while(!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    for (int i=1; i<=n; i++) cout << (dist[i] == INF ? -1 : dist[i]) << " ";
    cout << endl;
}
\`\`\``,
        points: 20,
        difficulty: 'medium',
        order: 2
      },
      {
        text: 'Find the number of ways to tile a \\(2 \\times N\\) grid using \\(2 \\times 1\\) dominoes. Output answer modulo \\(10^9+7\\).',
        type: 'essay',
        correctAnswer: 'Dynamic Programming / Fibonacci',
        referenceSolution: `### Part 1: Algorithm Description
Step 1: Define \\(dp[i]\\) as the number of configurations of tiling a \\(2 \\times i\\) grid.
Step 2: Base cases are \\(dp[1] = 1\\) and \\(dp[2] = 2\\).
Step 3: Recurrence relation is \\(dp[i] = (dp[i-1] + dp[i-2]) \\pmod{10^9+7}\\).
Step 4: Compute iteratively using variables.
Step 5: Output \\(dp[N]\\).

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
using namespace std;

int main() {
    int n; cin >> n;
    if (n == 1) { cout << 1 << endl; return 0; }
    long long p2 = 1, p1 = 2, MOD = 1e9+7;
    for (int i = 3; i <= n; i++) {
        long long cur = (p1 + p2) % MOD;
        p2 = p1; p1 = cur;
    }
    cout << p1 << endl;
}
\`\`\``,
        points: 20,
        difficulty: 'easy',
        order: 3
      },
      {
        text: 'Implement a Segment Tree to support range sum queries and point updates. Array size \\(N \\le 10^5\\), queries \\(Q \\le 10^5\\).',
        type: 'essay',
        correctAnswer: 'Segment Tree',
        referenceSolution: `### Part 1: Algorithm Description
Step 1: Allocate a segment tree representation of size \\(4N\\).
Step 2: Implement query and update functions with \\(O(\\log N)\\) execution.
Step 3: Point updates modify a leaf value and bubble up changes to the root.
Step 4: Range queries sum up interval splits.
Step 5: Execute operations and print query results.

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
#include <vector>
using namespace std;

vector<long long> tree;
int n;

void update(int node, int start, int end, int idx, int val) {
    if (start == end) { tree[node] = val; return; }
    int mid = (start + end) / 2;
    if (idx <= mid) update(2*node, start, mid, idx, val);
    else update(2*node+1, mid+1, end, idx, val);
    tree[node] = tree[2*node] + tree[2*node+1];
}

long long query(int node, int start, int end, int l, int r) {
    if (r < start || end < l) return 0;
    if (l <= start && end <= r) return tree[node];
    int mid = (start + end) / 2;
    return query(2*node, start, mid, l, r) + query(2*node+1, mid+1, end, l, r);
}

int main() {
    int q; cin >> n >> q;
    tree.resize(4*n, 0);
    for (int i=0; i<n; i++) {
        int x; cin >> x; update(1, 0, n-1, i, x);
    }
    while(q--) {
        int type, a, b; cin >> type >> a >> b;
        if (type == 1) update(1, 0, n-1, a, b);
        else cout << query(1, 0, n-1, a, b) << endl;
    }
}
\`\`\``,
        points: 20,
        difficulty: 'hard',
        order: 4
      },
      {
        text: 'Given a string \\(S\\), find the length of the longest palindromic substring. Constraints: \\(|S| \\le 1000\\).',
        type: 'essay',
        correctAnswer: 'DP or Expand Around Center',
        referenceSolution: `### Part 1: Algorithm Description
Step 1: Scan all centers (characters and character gaps).
Step 2: Expand left and right, ensuring matching characters.
Step 3: Track the longest palindrome length.
Step 4: Print the maximum length.

### Part 2: Code Implementation
\`\`\`cpp
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string s; cin >> s;
    int n = s.length(), ans = 0;
    for (int i=0; i<n; i++) {
        int l = i, r = i;
        while(l>=0 && r<n && s[l] == s[r]) { ans = max(ans, r-l+1); l--; r++; }
        l = i; r = i+1;
        while(l>=0 && r<n && s[l] == s[r]) { ans = max(ans, r-l+1); l--; r++; }
    }
    cout << ans << endl;
}
\`\`\``,
        points: 20,
        difficulty: 'medium',
        order: 5
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

    console.log('\n🎉 Successfully seeded all 20 practice papers with structured solutions!');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
