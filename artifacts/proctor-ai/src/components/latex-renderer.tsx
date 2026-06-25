import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface LatexRendererProps {
  text: string;
  className?: string;
}

export default function LatexRenderer({ text, className = "" }: LatexRendererProps) {
  if (!text) return null;

  // Split by block math first ($$)
  const blockParts = text.split("$$");

  return (
    <div className={`latex-render-container whitespace-pre-wrap leading-relaxed ${className}`}>
      {blockParts.map((blockPart, blockIdx) => {
        const isBlock = blockIdx % 2 === 1;

        if (isBlock) {
          return (
            <div key={`block-${blockIdx}`} className="my-3 overflow-x-auto">
              <BlockMath math={blockPart.trim()} />
            </div>
          );
        }

        // For inline text, split by inline math ($)
        const inlineParts = blockPart.split("$");

        return (
          <span key={`inline-container-${blockIdx}`}>
            {inlineParts.map((inlinePart, inlineIdx) => {
              const isInline = inlineIdx % 2 === 1;

              if (isInline) {
                return (
                  <span key={`inline-${blockIdx}-${inlineIdx}`} className="mx-0.5 inline-block">
                    <InlineMath math={inlinePart} />
                  </span>
                );
              }

              return <span key={`text-${blockIdx}-${inlineIdx}`}>{inlinePart}</span>;
            })}
          </span>
        );
      })}
    </div>
  );
}
