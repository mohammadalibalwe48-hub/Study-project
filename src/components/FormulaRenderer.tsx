'use client';

import React, { useMemo } from 'react';
import katex from 'katex';

interface FormulaRendererProps {
  formula: string;
  displayMode?: boolean;
  className?: string;
}

/**
 * Pre-processes LaTeX string to ensure full-size vertical display fractions (\dfrac)
 */
function normalizeFormula(raw: string): string {
  if (!raw) return '';
  let processed = raw;
  // Replace standard \frac with \dfrac for large textbook-style vertical fraction bars
  processed = processed.replace(/\\frac(?=\{)/g, '\\dfrac');
  return processed;
}

export default function FormulaRenderer({ formula, displayMode = false, className = '' }: FormulaRendererProps) {
  const htmlContent = useMemo(() => {
    if (!formula) return '';
    try {
      const latex = normalizeFormula(formula);
      return katex.renderToString(latex, {
        displayMode: displayMode,
        throwOnError: false,
        output: 'html',
      });
    } catch (err) {
      console.warn('KaTeX rendering error:', err);
      return formula;
    }
  }, [formula, displayMode]);

  if (displayMode) {
    return (
      <div
        className={`flex justify-center items-center my-4 p-4 rounded-2xl bg-surface border-2 border-border-color shadow-xs overflow-x-auto text-foreground dir-ltr ${className}`}
        dir="ltr"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center mx-1 font-bold text-foreground dir-ltr ${className}`}
      dir="ltr"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

/**
 * MathText Component: Safely renders text with embedded LaTeX formulas (e.g. `\sqrt{l}` or `\dfrac{a}{b}`).
 * Splits LaTeX parts from plain text so Arabic text and numbers render perfectly.
 */
export function MathText({ text, className = '' }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    if (!text) return [];

    // If text starts with LaTeX command like \dfrac, \vec, \int, \sqrt, render as single formula
    if (/^\s*\\[a-zA-Z]+/.test(text)) {
      return [{ type: 'formula', value: text }];
    }

    // Split text by LaTeX patterns: \command{...} or \command
    const regex = /(\\[a-zA-Z]+(?:\{[^}]*\}|\[[^\]]*\])*)/g;
    const result: Array<{ type: 'text' | 'formula'; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }
      result.push({ type: 'formula', value: match[0] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.substring(lastIndex) });
    }

    return result;
  }, [text]);

  if (parts.length === 0) return null;

  return (
    <span className={className}>
      {parts.map((part, idx) =>
        part.type === 'formula' ? (
          <FormulaRenderer key={idx} formula={part.value} displayMode={false} />
        ) : (
          <span key={idx}>{part.value}</span>
        )
      )}
    </span>
  );
}
