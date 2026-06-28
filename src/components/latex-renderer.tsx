import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  text: string;
  className?: string;
}

interface Token {
  type: "text" | "inline-math" | "block-math";
  content: string;
}

function tokenize(text: string): Token[] {
  // Order of matching is important:
  // 1. Math environments: \begin{align*} ... \end{align*}, gather*, equation*, matrix, array, etc.
  // 2. Delimiters: $$, \[, \\[, \(, \\(, $
  const regex = /(\\begin\{(align\*?|equation\*?|gather\*?|matrix\*?|array)\}[\s\S]+?\\end\{\2\}|\$\$[\s\S]+?\$\$|\\\\\[[\s\S]+?\\\\\]|\\\[[\s\S]+?\\\]|\\\\\([\s\S]+?\\\\\)|\\\([\s\S]+?\\\)|\$(?!\s)[^\$\n]+?(?<!\s)\$)/g;
  const tokens: Token[] = [];
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
    let type: "block-math" | "inline-math" = "inline-math";

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

export default function LatexRenderer({ text, className = "" }: LatexRendererProps) {
  if (!text) return null;

  const tokens = tokenize(text);

  return (
    <div className={`latex-render-container whitespace-pre-wrap leading-relaxed ${className}`}>
      {tokens.map((token, idx) => {
        if (token.type === "block-math") {
          return (
            <div key={`block-${idx}`} className="my-3 overflow-x-auto">
              <BlockMath math={token.content} />
            </div>
          );
        }

        if (token.type === "inline-math") {
          return (
            <span key={`inline-${idx}`} className="mx-0.5 inline-block">
              <InlineMath math={token.content} />
            </span>
          );
        }

        return <span key={`text-${idx}`}>{token.content}</span>;
      })}
    </div>
  );
}

