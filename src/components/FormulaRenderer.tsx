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
        className={`flex justify-center items-center my-4 p-4 rounded-2xl bg-white border-2 border-[#282825] shadow-[3px_3px_0_#282825] overflow-x-auto text-[#282825] dir-ltr ${className}`}
        dir="ltr"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  }

  return (
    <span
      className={`inline-flex items-center mx-1 font-bold text-[#282825] dir-ltr ${className}`}
      dir="ltr"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

/**
 * MathText Component: Safely renders text with embedded LaTeX formulas ($...$, $$...$$, \(...\), \[...\], or raw \command).
 */
export function MathText({ text, className = '' }: { text: string; className?: string }) {
  const parts = useMemo(() => {
    if (!text) return [];

    // Match $...$, $$...$$, \(...\), \[...\], or raw \command sequences
    const regex = /(\$\$[\s\S]+?\$\$|\$[^\$]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\\(?:dfrac|frac|sqrt|vec|int|sum|lim|alpha|beta|theta|pi|Delta|Omega|cdot|times|le|ge|neq|approx|infty|cos|sin|tan|log|ln)(?:\{[^}]*\}|\[[^\]]*\])*)/g;

    const result: Array<{ type: 'text' | 'formula'; value: string; displayMode?: boolean }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ type: 'text', value: text.substring(lastIndex, match.index) });
      }
      let rawVal = match[0];
      let displayMode = false;

      if (rawVal.startsWith('$$') && rawVal.endsWith('$$')) {
        rawVal = rawVal.slice(2, -2);
        displayMode = true;
      } else if (rawVal.startsWith('$') && rawVal.endsWith('$')) {
        rawVal = rawVal.slice(1, -1);
      } else if (rawVal.startsWith('\\[') && rawVal.endsWith('\\]')) {
        rawVal = rawVal.slice(2, -2);
        displayMode = true;
      } else if (rawVal.startsWith('\\(') && rawVal.endsWith('\\)')) {
        rawVal = rawVal.slice(2, -2);
      }

      result.push({ type: 'formula', value: rawVal, displayMode });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      result.push({ type: 'text', value: text.substring(lastIndex) });
    }

    // Fallback: If no delimiter match was found but text starts with a backslash command
    if (result.length === 1 && result[0].type === 'text' && /^\s*\\[a-zA-Z]+/.test(text)) {
      return [{ type: 'formula', value: text, displayMode: false }];
    }

    return result;
  }, [text]);

  if (parts.length === 0) return null;

  return (
    <span className={className}>
      {parts.map((part, idx) =>
        part.type === 'formula' ? (
          <FormulaRenderer key={idx} formula={part.value} displayMode={part.displayMode} />
        ) : (
          <span key={idx}>{part.value}</span>
        )
      )}
    </span>
  );
}
