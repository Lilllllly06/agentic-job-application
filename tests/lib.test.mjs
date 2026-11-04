import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const load = async (path) => {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  });
  return import(
    `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
  );
};
const {
  analyzeApplication,
  includesTerm,
  evidenceSentences,
  resumeText,
  letterText,
} = await load("../src/lib/analyzer.ts");
const {
  createWorkspace,
  newOpportunityDraft,
  validateWorkspace,
  sourceFingerprint,
  packageFingerprint,
  isApproved,
  safeUrl,
  exportCsv,
  daysUntil,
  localDate,
  loadWorkspace,
  STORAGE_KEY,
} = await load("../src/lib/workspace.ts");
const { parseLatexResume } = await load("../src/lib/latex.ts");

test("no fit score without both a profile and a job description", () => {
  for (const [profile, job] of [
    ["", ""],
    ["React experience", ""],
    ["", "React engineer"],
  ])
    assert.equal(analyzeApplication(profile, job, "").score, 0);
});
test("skill matching respects technical token boundaries", () => {
  assert.equal(includesTerm("JavaScript", "Java"), false);
  assert.equal(includesTerm("C++ C#", "C++"), true);
  assert.equal(includesTerm("reactive", "React"), false);
  const result = analyzeApplication(
    "Built accessible React tools and REST APIs for a student project.",
    "React, C++, SQL, and REST APIs required.",
    "Engineer",
  );
  assert.deepEqual(
    result.matchedSkills.map((s) => s.label),
    ["React", "REST APIs"],
  );
  assert.deepEqual(
    result.missingSkills.map((s) => s.label),
    ["C++", "SQL"],
  );
  assert.ok(result.score > 0 && result.score < 100);
});
test("drafts preserve real source evidence and do not invent credentials", () => {
  const profile =
    "Built a React dashboard for my student club. Documented the project for five teammates.";
  const result = analyzeApplication(
    profile,
    "React intern graduating in 2029 at Waterloo",
    "Engineer",
    { company: "Example" },
  );
  assert.equal(result.educationLine, "");
  for (const bullet of result.tailoredResumeDraft.bullets)
    assert.ok(profile.includes(bullet));
  const text = `${resumeText(result)} ${letterText(result)}`;
  assert.ok(!text.includes("University of Waterloo"));
  assert.ok(!text.includes("2029"));
  assert.ok(!text.includes("Yuezhen"));
  assert.ok(!text.includes("Across internships"));
  assert.ok(text.includes("[Your name]"));
});
test("candidate education and identity only come from explicit input", () => {
  const result = analyzeApplication(
    "Built a React dashboard for my team.",
    "React",
    "Engineer",
    {
      applicantName: "Test Candidate",
      education: "BSc, Example University, 2030",
    },
  );
  assert.equal(result.educationLine, "BSc, Example University, 2030");
  assert.ok(letterText(result).includes("Test Candidate"));
});
test("source evidence is ranked without adding achievements", () => {
  const profile =
    "Built a Python pipeline for a research project. Created a React dashboard for a student club.";
  assert.equal(
    evidenceSentences(profile, "React frontend")[0],
    "Created a React dashboard for a student club.",
  );
});
test("approval is scoped to the exact inputs, posting, and edited materials", () => {
  const d = createWorkspace().draft;
  Object.assign(d, {
    company: "Example",
    role: "Engineer",
    profile: "React",
    jobDescription: "React role",
    url: "https://example.com",
  });
  d.materials = {
    resume: "Resume text",
    letter: "Letter text",
    source: sourceFingerprint(d),
  };
  d.approvedPackage = packageFingerprint(d);
  assert.equal(isApproved(d), true);
  for (const patch of [
    { company: "Other" },
    { role: "Other" },
    { profile: "Changed" },
    { jobDescription: "Changed" },
    { education: "Different" },
    { applicantName: "Different" },
    { url: "https://other.com" },
    { materials: { ...d.materials, resume: "Edited" } },
    { materials: { ...d.materials, letter: "Edited" } },
  ])
    assert.equal(isApproved({ ...d, ...patch }), false);
});
test("unsafe links are rejected", () => {
  for (const value of [
    "javascript:alert(1)",
    "data:text/html,x",
    "//example.com",
    "not a url",
    "",
  ])
    assert.equal(safeUrl(value), undefined);
  assert.equal(safeUrl("https://example.com/jobs"), "https://example.com/jobs");
});
test("workspace backup round-trip and validation protect current data", () => {
  const w = createWorkspace();
  assert.deepEqual(validateWorkspace(JSON.parse(JSON.stringify(w))), w);
  assert.throws(() => validateWorkspace({ version: 2 }));
  assert.throws(() =>
    validateWorkspace({ ...w, applications: [{ id: "bad" }] }),
  );
  assert.throws(() =>
    validateWorkspace({
      ...w,
      preferences: { ...w.preferences, minimumScore: 101 },
    }),
  );
  assert.throws(() =>
    validateWorkspace({ ...w, draft: { ...w.draft, profile: 1 } }),
  );
});
test("corrupt storage is preserved rather than overwritten during loading", () => {
  const values = new Map([[STORAGE_KEY, "{bad json"]]);
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null };
  const result = loadWorkspace();
  assert.ok(result.warning);
  assert.equal(values.get(STORAGE_KEY), "{bad json");
});
test("legacy resume and application data migrate without trusting global approval", () => {
  const values = new Map([
    [
      "career-agent-private-resumes",
      JSON.stringify([
        {
          id: "r",
          name: "Resume",
          sourceType: "plain-text",
          rawContent: "React",
          parsedText: "React",
          parsedAt: "2026-01-01",
        },
      ]),
    ],
    ["career-agent-package-approval", JSON.stringify("Ready to submit")],
  ]);
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null };
  const result = loadWorkspace();
  assert.equal(result.workspace.resumes.length, 1);
  assert.equal(isApproved(result.workspace.draft), false);
  assert.equal(result.warning, undefined);
});
test("CSV escapes quotes, multiline notes, and spreadsheet formulas", () => {
  const csv = exportCsv([
    {
      company: "=FORMULA()",
      role: 'An "engineer"',
      notes: "line one\nline two",
    },
  ]);
  assert.ok(csv.includes('"\'=FORMULA()"'));
  assert.ok(csv.includes('"An ""engineer"""'));
  assert.ok(csv.includes('"line one\nline two"'));
});
test("LaTeX import preserves custom resume macros and escaped percent signs", () => {
  const source = String.raw`\documentclass{article}
\begin{document}
\section{Experience}
\resumeSubheading{Engineer}{2025}{Example Company}{Toronto}
\resumeItem{Built a React tool with \textbf{TypeScript}, improving completion by 20\%.}
\resumeItem{Wrote tests for a REST API.}
\end{document}`;
  const parsed = parseLatexResume(source);
  assert.ok(parsed.plainText.includes("Engineer"));
  assert.ok(parsed.plainText.includes("Example Company"));
  assert.ok(parsed.plainText.includes("20%"));
  assert.equal(parsed.bullets.length, 2);
  assert.deepEqual(parsed.sectionTitles, ["Experience"]);
  assert.ok(!parsed.plainText.includes("documentclass"));
});
test("local date helpers handle today and missing deadlines", () => {
  assert.equal(daysUntil(localDate()), 0);
  assert.equal(daysUntil(""), null);
  assert.equal(daysUntil("invalid"), null);
});

test("starting a new opportunity keeps the profile and clears record identity and approvals", () => {
  const previous = {
    ...createWorkspace().draft,
    profile: "Original experience",
    company: "Old company",
    role: "Old role",
    applicationId: "old-id",
    approvedPackage: "approved",
    materials: {
      resume: "Old resume",
      letter: "Old letter",
      source: "Old source",
    },
  };
  const draft = newOpportunityDraft(previous);
  assert.equal(draft.profile, previous.profile);
  assert.equal(draft.company, "");
  assert.equal(draft.applicationId, undefined);
  assert.equal(draft.materials, undefined);
  assert.equal(draft.approvedPackage, undefined);
});
test("keywords prioritize required technical terms over generic job wording", () => {
  const result = analyzeApplication(
    "Built React dashboards with TypeScript and Python for a student team.",
    "Frontend intern: React TypeScript Python. We value attention, features, platform, career, collaboration, interfaces, nice benefits, culture and people.",
    "Engineer",
  );
  assert.ok(result.keywords.some((k) => k.term === "react"));
  assert.ok(result.keywords.some((k) => k.term === "typescript"));
  assert.ok(!result.keywords.some((k) => k.term === "nice"));
});
