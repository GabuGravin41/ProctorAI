const s1 = "We have \\[ x^2 + y^2 = z^2 \\] in 2D.";
const s2 = "Double escaped: \\\\[ \\alpha + \\beta \\\\] is fine.";
const s3 = "Inline parenthesis \\( a^2 + b^2 = c^2 \\) is also fine.";
const s4 = "Double escaped inline: \\\\( x \\\\) works.";
const s5 = "Let $x$ be a real number.";

const combined = /(\$\$[\s\S]+?\$\$|\\\\\[[\s\S]+?\\\\\]|\\\[[\s\S]+?\\\]|\\\\\([\s\S]+?\\\\\)|\\\([\s\S]+?\\\)|\$(?!\s)[^\$\n]+?(?<!\s)\$)/g;

console.log("s1 match:", s1.match(combined));
console.log("s2 match:", s2.match(combined));
console.log("s3 match:", s3.match(combined));
console.log("s4 match:", s4.match(combined));
console.log("s5 match:", s5.match(combined));
