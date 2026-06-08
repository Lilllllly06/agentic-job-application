export type SkillDomain =
  | "Frontend"
  | "Backend"
  | "Data"
  | "AI"
  | "Cloud"
  | "Product"
  | "Quality";

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

export interface CandidateOptions {
  program?: string;
  graduationYear?: "auto" | "2027" | "2028" | "2029";
  applicantName?: string;
  company?: string;
}

interface SkillPattern {
  label: string;
  domain: SkillDomain;
  terms: string[];
}

const skillPatterns: SkillPattern[] = [
  { label: "React", domain: "Frontend", terms: ["react", "jsx", "tsx"] },
  { label: "TypeScript", domain: "Frontend", terms: ["typescript", "ts"] },
  { label: "JavaScript", domain: "Frontend", terms: ["javascript", "js"] },
  { label: "CSS", domain: "Frontend", terms: ["css", "responsive", "accessibility", "accessible"] },
  { label: "Design systems", domain: "Frontend", terms: ["design system", "component library", "ui system"] },
  { label: "Node.js", domain: "Backend", terms: ["node", "node.js", "express"] },
  { label: "REST APIs", domain: "Backend", terms: ["rest", "api", "apis", "endpoint"] },
  { label: "Python", domain: "Backend", terms: ["python", "scripting"] },
  { label: "SQL", domain: "Data", terms: ["sql", "postgres", "mysql", "database"] },
  { label: "Data visualization", domain: "Data", terms: ["data visualization", "dashboard", "analytics", "charts"] },
  { label: "Machine learning", domain: "AI", terms: ["machine learning", "ml", "model", "classification"] },
  { label: "LLM workflows", domain: "AI", terms: ["llm", "ai", "prompt", "agent"] },
  { label: "AWS", domain: "Cloud", terms: ["aws", "lambda", "s3", "cloud"] },
  { label: "Product thinking", domain: "Product", terms: ["product", "ambiguous", "requirements", "user-facing"] },
  { label: "Communication", domain: "Product", terms: ["communication", "stakeholder", "documentation"] },
  { label: "Testing", domain: "Quality", terms: ["testing", "test", "qa", "unit test", "integration"] },
  { label: "Git collaboration", domain: "Quality", terms: ["git", "github", "pull request", "code review"] },
];

const stopWords = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "but",
  "can",
  "for",
  "from",
  "have",
  "help",
  "into",
  "our",
  "that",
  "the",
  "this",
  "to",
  "with",
  "will",
  "work",
  "you",
  "your",
]);

const normalize = (text: string) => text.toLowerCase();

const includesTerm = (text: string, term: string) => {
  const normalizedText = normalize(text);
  const normalizedTerm = normalize(term);
  if (normalizedTerm.includes(" ")) {
    return normalizedText.includes(normalizedTerm);
  }

  return new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, "i").test(text);
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const extractKeywords = (jobDescription: string, profile: string): KeywordMatch[] => {
  const words = normalize(jobDescription)
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !stopWords.has(word));

  const counts = words.reduce<Record<string, number>>((accumulator, word) => {
    accumulator[word] = (accumulator[word] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 16)
    .map(([term, count]) => ({
      term,
      count,
      inProfile: includesTerm(profile, term),
    }));
};

const inferSeniority = (jobDescription: string) => {
  const job = normalize(jobDescription);
  if (job.includes("intern") || job.includes("co-op") || job.includes("coop")) return "Internship";
  if (job.includes("senior") || job.includes("staff") || job.includes("lead")) return "Senior";
  if (job.includes("new grad") || job.includes("entry")) return "Entry level";
  return "General";
};

const inferGraduationYear = (jobDescription: string, graduationYear: CandidateOptions["graduationYear"]) => {
  if (graduationYear && graduationYear !== "auto") return graduationYear;

  const job = normalize(jobDescription);
  if (job.includes("2027")) return "2027";
  if (job.includes("2028")) return "2028";
  if (job.includes("2029")) return "2029";
  if (job.includes("new grad") || job.includes("graduate")) return "2027";
  if (job.includes("intern") || job.includes("co-op") || job.includes("coop")) return "2028";
  return "2028";
};

const buildEducationLine = (program: string, graduationYear: string) =>
  `BASc in ${program}, University of Waterloo, expected graduation May ${graduationYear}`;

const makeSkillMatches = (profile: string, jobDescription: string): SkillMatch[] =>
  skillPatterns.map((skill) => ({
    label: skill.label,
    domain: skill.domain,
    inProfile: skill.terms.some((term) => includesTerm(profile, term)),
    inJob: skill.terms.some((term) => includesTerm(jobDescription, term)),
  }));

const buildBullets = (matchedSkills: SkillMatch[], missingSkills: SkillMatch[]) => {
  const primarySkills = matchedSkills.slice(0, 4).map((skill) => skill.label);
  const focusSkill = missingSkills[0]?.label ?? "role-specific requirements";
  const skillText = primarySkills.length > 0 ? primarySkills.join(", ") : "relevant technical skills";

  return [
    `Built ${skillText} features to translate product requirements into usable workflows, improving delivery clarity.`,
    `Documented technical decisions to support Git collaboration and review cycles, reducing handoff friction.`,
    `Applied ${primarySkills[0] ?? "technical"} fundamentals to implement reliable project features, improving maintainability.`,
    `Mapped experience against ${focusSkill} requirements to prioritize targeted learning, improving interview readiness.`,
  ];
};

const buildFocusAreas = (missingSkills: SkillMatch[], keywords: KeywordMatch[]) => {
  const missing = missingSkills.slice(0, 4).map((skill) => `Add stronger evidence for ${skill.label}`);
  const keywordGaps = keywords
    .filter((keyword) => !keyword.inProfile)
    .slice(0, 3)
    .map((keyword) => `Weave in the keyword "${keyword.term}" where it is truthful`);

  return [...missing, ...keywordGaps].slice(0, 6);
};

const scoreAnalysis = (
  requiredSkills: SkillMatch[],
  matchedSkills: SkillMatch[],
  keywords: KeywordMatch[],
  profile: string,
  targetRole: string,
  jobDescription: string,
) => {
  const skillCoverage = requiredSkills.length === 0 ? 0.55 : matchedSkills.length / requiredSkills.length;
  const keywordCoverage =
    keywords.length === 0 ? 0.5 : keywords.filter((keyword) => keyword.inProfile).length / keywords.length;
  const profileSignal = profile.trim().split(/\s+/).length > 80 ? 0.85 : 0.62;
  const roleSignal =
    targetRole && includesTerm(jobDescription, targetRole.split(/\s+/)[0]) ? 0.9 : targetRole ? 0.72 : 0.58;

  return Math.min(
    98,
    Math.round((skillCoverage * 0.48 + keywordCoverage * 0.3 + profileSignal * 0.12 + roleSignal * 0.1) * 100),
  );
};

const compact = (text: string, maxLength: number) =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trim()}…`;

const actionTaskResult = (action: string, task: string, result: string) =>
  `${action} ${task}, ${result}.`;

const buildTailoredResumeDraft = (
  matchedSkills: SkillMatch[],
  missingSkills: SkillMatch[],
  keywords: KeywordMatch[],
  targetRole: string,
  profile: string,
  educationLine: string,
): TailoredResumeDraft => {
  const primarySkills = matchedSkills.slice(0, 5).map((skill) => skill.label);
  const missingLabels = missingSkills.slice(0, 4).map((skill) => skill.label);
  const profileWords = profile.trim().split(/\s+/).filter(Boolean).length;
  const keywordLine = keywords
    .filter((keyword) => keyword.inProfile)
    .slice(0, 10)
    .map((keyword) => keyword.term)
    .join(" • ");
  const skillText = primarySkills.length > 0 ? primarySkills.join(", ") : "software engineering and product work";
  const role = targetRole || "target role";

  const bullets = [
    actionTaskResult(
      "Built",
      `${compact(skillText, 72)} projects aligned with ${role} requirements`,
      "improving evidence for role-specific technical fit",
    ),
    actionTaskResult(
      "Analyzed",
      "job requirements against resume evidence and keyword coverage",
      "prioritizing the strongest matching accomplishments",
    ),
    actionTaskResult(
      "Documented",
      "technical decisions, project scope, and implementation tradeoffs",
      "making project impact easier for reviewers to evaluate",
    ),
    actionTaskResult(
      "Tailored",
      `application materials around ${compact(primarySkills[0] ?? "core role skills", 36)}`,
      "increasing clarity, relevance, and interview readiness",
    ),
  ];

  return {
    title: role,
    summary: compact(
      `${role} candidate with evidence across ${skillText}. Focused on concise, role-matched application materials and truthful claims that can be defended in interviews.`,
      260,
    ),
    educationLine,
    bullets,
    keywordLine: keywordLine || "Add a job description and resume to identify verified keywords.",
    onePageChecklist: [
      profileWords > 520 ? "Trim resume content before exporting; parsed profile is likely longer than one page." : "Resume content appears feasible for a one-page draft.",
      "Keep 3-4 bullets per major project or experience.",
      "Prefer bullets under 24 words.",
      "Keep only keywords you can support with real project evidence.",
    ],
    proofWarnings: missingLabels.length
      ? missingLabels.map((skill) => `Do not claim ${skill} unless your resume file contains real evidence.`)
      : ["No major skill gaps detected from the current job description."],
  };
};

const buildCoverLetterDraft = (
  targetRole: string,
  matchedSkills: SkillMatch[],
  missingSkills: SkillMatch[],
  companySignal: string,
  educationLine: string,
): CoverLetterDraft => {
  const role = targetRole || "the role";
  const strengths = matchedSkills
    .slice(0, 4)
    .map((skill) => skill.label)
    .join(", ");
  const primaryStrength = strengths || "software engineering, product execution, and fast technical learning";
  const growthArea = missingSkills[0]?.label ?? "the team's highest-priority technical needs";
  const company = companySignal || "your team";

  return {
    salutation: "Dear Hiring Team,",
    paragraphs: [
      `I am excited to apply for ${role} at ${company}. I am a ${educationLine} candidate, and I am drawn to opportunities where I can turn ambiguous product and engineering requirements into reliable, user-facing systems.`,
      `My background aligns strongly with this role through ${primaryStrength}. Across internships and projects, I have built full-stack workflows, documented tradeoffs, and shipped maintainable features while keeping user impact and implementation quality in view.`,
      `I would bring a practical, high-ownership engineering style to ${company}: learn the domain quickly, map requirements into clear implementation steps, and deliver concise work that is easy for teammates to review and users to trust. I am especially prepared to deepen my experience around ${growthArea} where it matters most for the team.`,
    ],
    closing: "Sincerely,\nYuezhen Dong",
    formatNote: "Keep to one page using Times New Roman or Calibri, 10-12 pt, with 3 concise paragraphs.",
  };
};

export const analyzeApplication = (
  profile: string,
  jobDescription: string,
  targetRole: string,
  options: CandidateOptions = {},
): CareerAnalysis => {
  const program = options.program || "Computer Engineering";
  const graduationYear = inferGraduationYear(jobDescription, options.graduationYear || "auto");
  const educationLine = buildEducationLine(program, graduationYear);
  const allSkills = makeSkillMatches(profile, jobDescription);
  const requiredSkills = allSkills.filter((skill) => skill.inJob);
  const matchedSkills = requiredSkills.filter((skill) => skill.inProfile);
  const missingSkills = requiredSkills.filter((skill) => !skill.inProfile);
  const keywords = extractKeywords(jobDescription, profile);
  const score = scoreAnalysis(requiredSkills, matchedSkills, keywords, profile, targetRole, jobDescription);
  const topMatched = matchedSkills[0]?.label ?? "the role's core requirements";
  const firstGap = missingSkills[0]?.label ?? "the team's priorities";

  return {
    score,
    seniority: inferSeniority(jobDescription),
    educationLine,
    requiredSkills,
    matchedSkills,
    missingSkills,
    keywords,
    suggestedResumeBullets: buildBullets(matchedSkills, missingSkills),
    tailoredResumeDraft: buildTailoredResumeDraft(
      matchedSkills,
      missingSkills,
      keywords,
      targetRole,
      profile,
      educationLine,
    ),
    coverLetterDraft: buildCoverLetterDraft(targetRole, matchedSkills, missingSkills, options.company || "", educationLine),
    focusAreas: buildFocusAreas(missingSkills, keywords),
    coverLetterOpener: `I am excited about this ${targetRole || "role"} because it connects my experience with ${topMatched} to the team's need for ${firstGap}.`,
    outreachNote: `Hi, I am exploring the ${targetRole || "open"} role and noticed the emphasis on ${topMatched}. I would love to learn what makes someone successful on this team and share how my project experience maps to the work.`,
    interviewPrompts: [
      `Tell me about a project where you used ${topMatched}.`,
      `How would you close the gap around ${firstGap}?`,
      "Describe a time you turned vague requirements into a shipped feature.",
      "What tradeoffs did you make in a recent technical project?",
    ],
  };
};
