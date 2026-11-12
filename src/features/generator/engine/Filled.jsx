import { Fragment } from 'react';
import { fillParts } from './values.js';

/**
 * Text of a document with its {tokens} filled in. **Bold** pieces are drawn bold. A token
 * without a value stays visible and highlighted in yellow, on screen and in the PDF, so a
 * half-filled document never goes out unnoticed.
 * @param {{ text: string, vars: Record<string, string> }} props
 */
export default function Filled({ text, vars }) {
  const pieces = String(text ?? '').split(/(\*\*[^*]+\*\*)/g);
  return pieces.map((piece, index) => {
    const bold = /^\*\*[^*]+\*\*$/.test(piece);
    const parts = fillParts(bold ? piece.slice(2, -2) : piece, vars).map((part, partIndex) =>
      part.missing ? (
        <mark key={partIndex} className="rounded-sm bg-doc-placeholder px-0.5 text-doc-ink">
          {part.text}
        </mark>
      ) : (
        <Fragment key={partIndex}>{part.text}</Fragment>
      ),
    );
    return bold ? (
      <strong key={index} className="font-semibold text-doc-ink">
        {parts}
      </strong>
    ) : (
      <Fragment key={index}>{parts}</Fragment>
    );
  });
}
