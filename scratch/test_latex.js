const testCases = [
  "Let $x$ be a real number.",
  "What is $5$ plus $10$?",
  "The items cost $5 and $10 each.",
  "Consider the equation $$e^{i\\pi} + 1 = 0$$.",
  "We have \\[ x^2 + y^2 = z^2 \\] in 2D.",
  "Double escaped: \\\\[ \\alpha + \\beta \\\\] is fine.",
  "Inline parenthesis \\( a^2 + b^2 = c^2 \\) is also fine.",
  "Double escaped inline: \\\\( x \\\\) works.",
  "Is $x = 5$ and $y = 10$ true?",
  "Standard text with $500 USD and $1,000 CAD."
];

function tokenize(text) {
  const regex = /(\$\$[\s\S]+?\$\$|\\{1,2\}\[[\s\S]+?\\{1,2\}\]|\\{1,2\}\([\s\S]+?\\{1,2\}\)|\$(?!\s)[^\$\n]+?(?<!\s)\$)/g;
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

    if (matchText.startsWith("$$")) {
      type = "block-math";
      content = matchText.slice(2, -2);
    } else if (matchText.startsWith("\\[") || matchText.startsWith("\\\\[")) {
      type = "block-math";
      const startLen = matchText.startsWith("\\\\[") ? 3 : 2;
      const endLen = matchText.endsWith("\\\\]") ? 3 : 2;
      content = matchText.slice(startLen, -endLen);
    } else if (matchText.startsWith("\\(") || matchText.startsWith("\\\\(")) {
      type = "inline-math";
      const startLen = matchText.startsWith("\\\\(") ? 3 : 2;
      const endLen = matchText.endsWith("\\\\)") ? 3 : 2;
      content = matchText.slice(startLen, -endLen);
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

testCases.forEach((tc) => {
  console.log("-----------------------------------------");
  console.log("INPUT:", tc);
  console.log("TOKENS:", JSON.stringify(tokenize(tc), null, 2));
});
