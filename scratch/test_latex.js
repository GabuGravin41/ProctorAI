const testCases = [
  "After summoning the next boss, \\textbf{The Brain of Cthulhu}, you discover that it is surrounded by \\(n\\) eyes, numbered \\(1,2,\\ldots,n\\).",
  "A triple is called \\emph{crimson} if and only if\n\\[\n\\gcd\\!\\left(\\operatorname{lcm}(a,b),\\,\\operatorname{lcm}(b,c)\\right)\n=\n\\gcd(a,c).\n\\]",
  "Two triples \\((a_1,b_1,c_1)\\) and \\((a_2,b_2,c_2)\\) are considered distinct whenever\n\\[\na_1\\neq a_2,\\qquad\nb_1\\neq b_2,\\qquad\n\\text{or}\\qquad\nc_1\\neq c_2.\n\\]",
  "Determine, as a function of \\(n\\), the number of crimson triples satisfying\n\\[\n1\\le a,b,c\\le n.\n\\]",
  "Let n \\ge 4 be an integer. Find all positive real solutions to the following system of 2n equations:\n\n\\begin{align*} a_{1} &=\\frac{1}{a_{2 n}}+\\frac{1}{a_{2}}, & a_{2}&=a_{1}+a_{3}, \\\\ a_{3}&=\\frac{1}{a_{2}}+\\frac{1}{a_{4}}, & a_{4}&=a_{3}+a_{5}, \\\\ a_{5}&=\\frac{1}{a_{4}}+\\frac{1}{a_{6}}, & a_{6}&=a_{5}+a_{7} \\\\ &\\vdots & &\\vdots \\\\ a_{2 n-1}&=\\frac{1}{a_{2 n-2}}+\\frac{1}{a_{2 n}}, & a_{2 n}&=a_{2 n-1}+a_{1} \\end{align*}"
];

function tokenize(text) {
  // Order of matching is important:
  // 1. Math environments: \begin{align*} ... \end{align*}, gather*, equation*, matrix, array, etc.
  // 2. Delimiters: $$, \[, \\[, \(, \\(, $
  const regex = /(\\begin\{(align\*?|equation\*?|gather\*?|matrix\*?|array)\}[\s\S]+?\\end\{\2\}|\$\$[\s\S]+?\$\$|\\\\\[[\s\S]+?\\\\\]|\\\[[\s\S]+?\\\]|\\\\\([\s\S]+?\\\\\)|\\\([\s\S]+?\\\)|\$(?!\s)[^\$\n]+?(?<!\s)\$)/g;
  const tokens = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];

    // Add preceding text
    if (matchStart > lastIndex) {
      tokens.push({
        type: "text",
        content: text.substring(lastIndex, matchStart),
      });
    }

    // Determine type and clean the content
    let content = matchText;
    let type = "inline-math";

    if (matchText.startsWith("\\begin")) {
      type = "block-math";
      content = matchText; // Keep environment wrappers for KaTeX
    } else if (matchText.startsWith("$$")) {
      type = "block-math";
      content = matchText.slice(2, -2);
    } else if (matchText.startsWith("\\\\[")) {
      type = "block-math";
      content = matchText.slice(3, -3);
    } else if (matchText.startsWith("\\[")) {
      type = "block-math";
      content = matchText.slice(2, -2);
    } else if (matchText.startsWith("\\\\(")) {
      type = "inline-math";
      content = matchText.slice(3, -3);
    } else if (matchText.startsWith("\\(")) {
      type = "inline-math";
      content = matchText.slice(2, -2);
    } else if (matchText.startsWith("$")) {
      type = "inline-math";
      content = matchText.slice(1, -1);
      
      // If it looks like currency, treat it as text instead of math
      const looksLikeCurrency = /^\s*[0-9]+([.,][0-9]+)?\s*[a-zA-Z]*\s*$/.test(content);
      if (looksLikeCurrency) {
        tokens.push({
          type: "text",
          content: matchText,
        });
        lastIndex = regex.lastIndex;
        continue;
      }
    }

    tokens.push({
      type,
      content: content.trim(),
    });

    lastIndex = regex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    tokens.push({
      type: "text",
      content: text.substring(lastIndex),
    });
  }

  return tokens;
}

testCases.forEach((tc, idx) => {
  console.log("-----------------------------------------");
  console.log(`TEST CASE ${idx + 1}:`);
  console.log("TOKENS:", JSON.stringify(tokenize(tc), null, 2));
});
