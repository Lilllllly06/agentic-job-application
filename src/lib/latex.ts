export interface LatexResumeParse {
  plainText: string;
  bullets: string[];
  sectionTitles: string[];
  estimatedLines: number;
  warnings: string[];
}
function clean(value: string): string {
  return value
    .replace(/(?<!\\)%.*$/gm, "")
    .replace(/\\href\{([^{}]*)\}\{([^{}]*)\}/g, "$2 ($1)")
    .replace(
      /\\(?:documentclass|usepackage|geometry|vspace|hspace|setlength|addtolength|pagestyle|newcommand|renewcommand)(?:\[[^\]]*\])?(?:\{[^{}]*\}){1,3}/g,
      "",
    )
    .replace(/\\(?:begin|end)\{[^{}]*\}(?:\{[^{}]*\})?/g, "\n")
    .replace(/\\(?:section|subsection|subsubsection)\*?\{([^{}]*)\}/g, "\n$1\n")
    .replace(/\\(?:item|resumeItem)(?:\[[^\]]*\])?/g, "\n• ")
    .replace(
      /\\(?:resumeSubheading|resumeProjectHeading|resumeSubSubheading)/g,
      "\n",
    )
    .replace(
      /\\(?:textbf|textit|emph|underline|href|url|small|large|Large|textsc)\*?/g,
      "",
    )
    .replace(/\\[&%_$#]/g, (s) => s.slice(1))
    .replace(/\\\\/g, "\n")
    .replace(/\\[a-zA-Z]+\*?(?:\[[^\]]*\])?/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/~/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
export function parseLatexResume(source: string): LatexResumeParse {
  const body = source.includes("\\begin{document}")
    ? source.split("\\begin{document}")[1].split("\\end{document}")[0]
    : source;
  const plainText = clean(body);
  const bullets = plainText
    .split("\n")
    .filter((l) => l.startsWith("• "))
    .map((l) => l.slice(2).trim());
  const sectionTitles = [
    ...body.matchAll(/\\(?:section|subsection|subsubsection)\*?\{([^{}]+)\}/g),
  ].map((m) => clean(m[1]));
  const estimatedLines = plainText.length
    ? Math.ceil(plainText.length / 92)
    : 0;
  const warnings = [
    ...(!source.includes("\\begin{document}")
      ? ["Imported a LaTeX fragment. Check the extracted text below."]
      : []),
    ...(estimatedLines > 54
      ? ["This content may need trimming to fit one page."]
      : []),
    ...(!bullets.length
      ? ["No bullet items detected. Review the extracted text."]
      : []),
  ];
  return { plainText, bullets, sectionTitles, estimatedLines, warnings };
}
