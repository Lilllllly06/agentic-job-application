export interface LatexResumeParse {
  plainText: string;
  bullets: string[];
  sectionTitles: string[];
  estimatedLines: number;
  warnings: string[];
}

const cleanupLatexText = (value: string) =>
  value
    .replace(/%.*$/gm, "")
    .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, "$2 $1")
    .replace(/\\url\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:textbf|textit|emph|underline|small|large|Large)\{([^{}]*)\}/g, "$1")
    .replace(/\\(?:section|subsection|subsubsection)\*?\{([^{}]*)\}/g, "\n$1\n")
    .replace(/\\item(?:\[[^\]]*\])?/g, "\n- ")
    .replace(/\\begin\{[^{}]*\}|\\end\{[^{}]*\}/g, "\n")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?(?:\{[^{}]*\})?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/~|\\,/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\s-\s/g, "\n- ")
    .trim();

const extractBullets = (source: string) => {
  const matches = [...source.matchAll(/\\item(?:\[[^\]]*\])?\s*([\s\S]*?)(?=\n\s*\\item|\n\s*\\end\{[^{}]*\}|$)/g)];
  return matches
    .map((match) => cleanupLatexText(match[1]))
    .map((bullet) => bullet.replace(/^-\s*/, "").trim())
    .filter(Boolean);
};

const extractSections = (source: string) =>
  [...source.matchAll(/\\(?:section|subsection|subsubsection)\*?\{([^{}]+)\}/g)]
    .map((match) => cleanupLatexText(match[1]))
    .filter(Boolean);

export const parseLatexResume = (source: string): LatexResumeParse => {
  const plainText = cleanupLatexText(source);
  const bullets = extractBullets(source);
  const sectionTitles = extractSections(source);
  const estimatedLines = plainText.length === 0 ? 0 : Math.ceil(plainText.length / 92);
  const warnings = [
    ...(source.includes("\\begin{document}") ? [] : ["This does not look like a complete LaTeX resume file."]),
    ...(estimatedLines > 54 ? ["Parsed content may be too long for a one-page resume."] : []),
    ...(bullets.length === 0 ? ["No LaTeX bullet items were detected."] : []),
  ];

  return {
    plainText,
    bullets,
    sectionTitles,
    estimatedLines,
    warnings,
  };
};

