export type SkillDomain =
  "Frontend" | "Backend" | "Data" | "AI" | "Cloud" | "Product" | "Quality";
export interface SkillMatch {
  label: string;
  domain: SkillDomain;
  inProfile: boolean;
  inJob: boolean;
}
export interface KeywordMatch {
  term: string;
  inProfile: boolean;
  count: number;
}
export interface TailoredResumeDraft {
  title: string;
  summary: string;
  educationLine: string;
  bullets: string[];
  keywordLine: string;
  onePageChecklist: string[];
  proofWarnings: string[];
}
export interface CoverLetterDraft {
  salutation: string;
  paragraphs: string[];
  closing: string;
  formatNote: string;
}
export interface CareerAnalysis {
  score: number;
  seniority: string;
  educationLine: string;
  requiredSkills: SkillMatch[];
  matchedSkills: SkillMatch[];
  missingSkills: SkillMatch[];
  keywords: KeywordMatch[];
  suggestedResumeBullets: string[];
  tailoredResumeDraft: TailoredResumeDraft;
  coverLetterDraft: CoverLetterDraft;
  focusAreas: string[];
  coverLetterOpener: string;
  outreachNote: string;
  interviewPrompts: string[];
}
export interface CandidateOptions {
  program?: string;
  graduationYear?: string;
  applicantName?: string;
  company?: string;
  education?: string;
}
const patterns: [string, SkillDomain, string[]][] = [
  ["React", "Frontend", ["react", "jsx", "tsx"]],
  ["TypeScript", "Frontend", ["typescript"]],
  ["JavaScript", "Frontend", ["javascript"]],
  [
    "CSS & accessibility",
    "Frontend",
    ["css", "responsive", "accessibility", "accessible"],
  ],
  [
    "Design systems",
    "Frontend",
    ["design systems", "design system", "component library"],
  ],
  ["Node.js", "Backend", ["node.js", "nodejs", "express"]],
  ["REST APIs", "Backend", ["rest", "api", "apis", "endpoint", "endpoints"]],
  ["Python", "Backend", ["python"]],
  ["Java", "Backend", ["java"]],
  ["C++", "Backend", ["c++"]],
  ["C#", "Backend", ["c#"]],
  ["SQL", "Data", ["sql", "postgres", "postgresql", "mysql"]],
  [
    "Data visualization",
    "Data",
    ["data visualization", "dashboard", "dashboards", "charts"],
  ],
  ["Machine learning", "AI", ["machine learning", "ml", "classification"]],
  ["PyTorch", "AI", ["pytorch"]],
  ["TensorFlow", "AI", ["tensorflow"]],
  [
    "LLM workflows",
    "AI",
    ["llm", "llms", "large language models", "agents", "prompt engineering"],
  ],
  ["AWS", "Cloud", ["aws", "lambda", "s3"]],
  ["Docker", "Cloud", ["docker", "containerization"]],
  ["Kubernetes", "Cloud", ["kubernetes", "k8s"]],
  ["Linux", "Cloud", ["linux", "unix"]],
  ["Product thinking", "Product", ["product", "requirements", "user-facing"]],
  [
    "Communication",
    "Product",
    ["communication", "stakeholder", "documentation", "documented"],
  ],
  ["Testing", "Quality", ["testing", "tests", "test", "qa"]],
  [
    "Git collaboration",
    "Quality",
    ["git", "github", "pull request", "code review"],
  ],
];
const escape = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const includesTerm = (text: string, term: string) =>
  new RegExp(`(?<![a-z0-9+#])${escape(term)}(?![a-z0-9+#])`, "i").test(text);
const stop = new Set(
  "about across after also and are ability background based because both build building but can candidate candidates company could degree each engineering engineer engineers experience for from good have help high intern internship into its job looking more must new not our preferred qualifications related required requirements responsibilities role should skills some strong team teams technical technology than that the their these this through time tools using use user users well were what when where which who will with work working would you your years nice attention frontend platform career software".split(
    " ",
  ),
);
function keywords(job: string, profile: string): KeywordMatch[] {
  const counts = new Map<string, number>();
  for (const word of job
    .toLowerCase()
    .match(/[a-z][a-z0-9+#]*(?:[.-][a-z0-9]+)*/g) || []) {
    if (word.length > 2 && !stop.has(word))
      counts.set(word, (counts.get(word) || 0) + 1);
  }
  const skillTerms = new Set(patterns.flatMap(([, , terms]) => terms));
  for (const term of skillTerms) {
    if (term.includes(" ") && includesTerm(job, term))
      counts.set(
        term,
        (job.toLowerCase().match(new RegExp(escape(term), "g")) || []).length,
      );
  }
  return [...counts]
    .sort(
      (a, b) =>
        Number(skillTerms.has(b[0])) - Number(skillTerms.has(a[0])) ||
        b[1] - a[1] ||
        a[0].localeCompare(b[0]),
    )
    .slice(0, 16)
    .map(([term, count]) => ({
      term,
      count,
      inProfile: includesTerm(profile, term),
    }));
}
export function evidenceSentences(profile: string, job: string): string[] {
  return profile
    .split(/\n+|(?<=[.!?])\s+(?=[A-Z])/)
    .map((s) => s.replace(/^\s*[-•*]\s*/, "").trim())
    .filter((s) => s.split(/\s+/).length >= 5)
    .map((text, order) => ({
      text,
      order,
      relevance: patterns.filter(([, , terms]) =>
        terms.some((t) => includesTerm(text, t) && includesTerm(job, t)),
      ).length,
    }))
    .sort((a, b) => b.relevance - a.relevance || a.order - b.order)
    .slice(0, 6)
    .map((s) => s.text);
}
export function analyzeApplication(
  profile: string,
  jobDescription: string,
  targetRole: string,
  options: CandidateOptions = {},
): CareerAnalysis {
  const ready = !!profile.trim() && !!jobDescription.trim();
  const requiredSkills = patterns
    .map(([label, domain, terms]) => ({
      label,
      domain,
      inProfile: terms.some((t) => includesTerm(profile, t)),
      inJob: terms.some((t) => includesTerm(jobDescription, t)),
    }))
    .filter((s) => s.inJob);
  const matchedSkills = requiredSkills.filter((s) => s.inProfile),
    missingSkills = requiredSkills.filter((s) => !s.inProfile);
  const terms = keywords(jobDescription, profile);
  const keywordCoverage = terms.length
    ? terms.filter((t) => t.inProfile).length / terms.length
    : 0;
  const score = ready
    ? Math.round(
        (requiredSkills.length
          ? (matchedSkills.length / requiredSkills.length) * 0.75 +
            keywordCoverage * 0.25
          : keywordCoverage) * 100,
      )
    : 0;
  const bullets = evidenceSentences(profile, jobDescription);
  const strengths = matchedSkills
    .slice(0, 5)
    .map((s) => s.label)
    .join(", ");
  const role = targetRole.trim() || "the open position",
    company = options.company?.trim() || "your team";
  const educationLine = options.education?.trim() || "";
  const opening = `I would like to apply for ${role} at ${company}.${educationLine ? ` My education: ${educationLine}.` : ""}`;
  const letter: CoverLetterDraft = {
    salutation: "Dear Hiring Team,",
    paragraphs: [
      opening,
      bullets.length
        ? `My relevant experience includes the following: ${bullets.slice(0, 2).join(" ")}`
        : "[Add a specific accomplishment from your experience.]",
      `I would welcome the opportunity to discuss how ${strengths ? `my experience with ${strengths}` : "my background"} connects to the work at ${company}. Thank you for considering my application.`,
    ],
    closing: `Sincerely,\n${options.applicantName?.trim() || "[Your name]"}`,
    formatNote:
      "Review the wording and add your motivation for this company before sending.",
  };
  const proofWarnings = missingSkills.length
    ? missingSkills.map(
        (s) =>
          `${s.label} is in the job description but has no matching evidence in your profile.`,
      )
    : [
        ready
          ? "Detected skills are covered. Verify every claim against your original experience."
          : "Add your profile and a job description to check for gaps.",
      ];
  return {
    score,
    seniority: /intern|co-op|coop/i.test(jobDescription)
      ? "Internship"
      : /senior|staff|principal/i.test(jobDescription)
        ? "Senior"
        : /entry|new grad/i.test(jobDescription)
          ? "Entry level"
          : "Not specified",
    educationLine,
    requiredSkills,
    matchedSkills,
    missingSkills,
    keywords: terms,
    suggestedResumeBullets: bullets,
    tailoredResumeDraft: {
      title: role,
      summary: strengths
        ? `Experience with ${strengths}.`
        : "Selected experience for this opportunity.",
      educationLine,
      bullets,
      keywordLine: terms
        .filter((t) => t.inProfile)
        .map((t) => t.term)
        .join(" · "),
      onePageChecklist: [
        "Keep only experience you can explain and support.",
        "Add specific outcomes only when you have the original evidence.",
        "Review layout in the print preview before exporting.",
      ],
      proofWarnings,
    },
    coverLetterDraft: letter,
    coverLetterOpener: opening,
    outreachNote: `Hi, I’m interested in the ${role} opportunity at ${company}.${strengths ? ` My background includes ${strengths}.` : ""} I’d appreciate learning more about the team and what you’re looking for in this role.`,
    focusAreas: missingSkills
      .slice(0, 4)
      .map(
        (s) =>
          `Find existing evidence for ${s.label}, or treat it as a learning opportunity.`,
      ),
    interviewPrompts: [
      `Walk through an example of your work with ${matchedSkills[0]?.label || "a relevant skill"}.`,
      `How would you approach learning ${missingSkills[0]?.label || "a new tool for this team"}?`,
      "What tradeoffs did you make in a recent project?",
      "Which outcome from your experience can you explain in detail?",
    ],
  };
}
export function resumeText(analysis: CareerAnalysis, name = ""): string {
  const d = analysis.tailoredResumeDraft;
  return [
    name || "[Your name]",
    d.title,
    "",
    d.summary,
    ...(d.educationLine ? ["", "EDUCATION", d.educationLine] : []),
    "",
    "SELECTED EXPERIENCE",
    ...d.bullets.map((b) => `• ${b}`),
    "",
    "RELEVANT KEYWORDS",
    d.keywordLine || "Review your experience for relevant keywords.",
  ].join("\n");
}
export function letterText(analysis: CareerAnalysis): string {
  const l = analysis.coverLetterDraft;
  return [l.salutation, ...l.paragraphs, l.closing].join("\n\n");
}
