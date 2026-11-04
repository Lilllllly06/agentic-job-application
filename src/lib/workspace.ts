export const statuses = [
  "Researching",
  "Drafting",
  "Applied",
  "Interviewing",
  "Offer",
  "Closed",
] as const;
export type ApplicationStatus = (typeof statuses)[number];
export type View =
  "overview" | "tailor" | "applications" | "resumes" | "preferences";
export interface Materials {
  resume: string;
  letter: string;
  source: string;
}
export interface Draft {
  company: string;
  role: string;
  profile: string;
  jobDescription: string;
  url: string;
  contact: string;
  deadline: string;
  notes: string;
  applicantName: string;
  education: string;
  resumeVersionId: string;
  materials?: Materials;
  approvedPackage?: string;
  applicationId?: string;
}
export interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  score: number;
  nextAction: string;
  url: string;
  contact: string;
  deadline: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  draft?: Draft;
}
export interface ResumeVersion {
  id: string;
  name: string;
  sourceType: "latex" | "plain-text";
  rawContent: string;
  parsedText: string;
  parsedAt: string;
}
export interface EvidenceItem {
  id: string;
  claim: string;
  source: string;
  status: "Confirmed" | "Needs proof" | "Rejected";
}
export interface Preferences {
  targetRoles: string;
  locations: string;
  companyPriority: string;
  jobTypes: string;
  minimumScore: number;
  approvalMode: string;
}
export interface Workspace {
  version: 2;
  draft: Draft;
  applications: ApplicationRecord[];
  resumes: ResumeVersion[];
  evidence: EvidenceItem[];
  preferences: Preferences;
}
export const STORAGE_KEY = "career-agent-workspace-v2";
export const emptyDraft = (): Draft => ({
  company: "",
  role: "",
  profile: "",
  jobDescription: "",
  url: "",
  contact: "",
  deadline: "",
  notes: "",
  applicantName: "",
  education: "",
  resumeVersionId: "",
});
export const newOpportunityDraft = (previous: Draft): Draft => ({
  ...emptyDraft(),
  profile: previous.profile,
  applicantName: previous.applicantName,
  education: previous.education,
  resumeVersionId: previous.resumeVersionId,
});
export const createWorkspace = (): Workspace => ({
  version: 2,
  draft: emptyDraft(),
  applications: [],
  resumes: [],
  evidence: [],
  preferences: {
    targetRoles: "Software Engineer, Machine Learning Engineer",
    locations: "Toronto, Waterloo, Remote",
    companyPriority:
      "Teams with thoughtful engineering, meaningful work, and room to grow.",
    jobTypes: "Internship, co-op, new graduate",
    minimumScore: 70,
    approvalMode: "Review every package before applying",
  },
});
export const sourceFingerprint = (draft: Draft) =>
  JSON.stringify([
    draft.profile,
    draft.jobDescription,
    draft.company,
    draft.role,
    draft.applicantName,
    draft.education,
  ]);
export const packageFingerprint = (draft: Draft) =>
  JSON.stringify([
    sourceFingerprint(draft),
    draft.url,
    draft.materials?.resume,
    draft.materials?.letter,
  ]);
export const isApproved = (draft: Draft) =>
  !!draft.materials &&
  draft.materials.source === sourceFingerprint(draft) &&
  draft.approvedPackage === packageFingerprint(draft);
export function safeUrl(value: string): string | undefined {
  if (!value.trim()) return undefined;
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
const isString = (value: unknown): value is string => typeof value === "string";
export function validateWorkspace(value: unknown): Workspace {
  if (!value || typeof value !== "object")
    throw new Error("Choose a Career Agent workspace backup.");
  const w = value as Workspace;
  if (
    w.version !== 2 ||
    !w.draft ||
    !w.preferences ||
    !Array.isArray(w.applications) ||
    !Array.isArray(w.resumes) ||
    !Array.isArray(w.evidence)
  )
    throw new Error("This is not a supported Career Agent backup.");
  const validDraft = (d: Draft) =>
    d &&
    Object.keys(emptyDraft()).every((key) => isString(d[key as keyof Draft])) &&
    (!d.materials ||
      [d.materials.resume, d.materials.letter, d.materials.source].every(
        isString,
      ));
  if (
    !validDraft(w.draft) ||
    !w.applications.every(
      (a) =>
        a &&
        [
          a.id,
          a.company,
          a.role,
          a.nextAction,
          a.url,
          a.contact,
          a.deadline,
          a.notes,
          a.createdAt,
          a.updatedAt,
        ].every(isString) &&
        statuses.includes(a.status) &&
        Number.isFinite(a.score) &&
        a.score >= 0 &&
        a.score <= 100 &&
        (!a.draft || validDraft(a.draft)),
    ) ||
    !w.resumes.every(
      (r) =>
        r &&
        [r.id, r.name, r.rawContent, r.parsedText, r.parsedAt].every(
          isString,
        ) &&
        ["latex", "plain-text"].includes(r.sourceType),
    ) ||
    !w.evidence.every(
      (e) =>
        e &&
        [e.id, e.claim, e.source].every(isString) &&
        ["Confirmed", "Needs proof", "Rejected"].includes(e.status),
    ) ||
    ![
      w.preferences.targetRoles,
      w.preferences.locations,
      w.preferences.companyPriority,
      w.preferences.jobTypes,
      w.preferences.approvalMode,
    ].every(isString) ||
    !Number.isFinite(w.preferences.minimumScore) ||
    w.preferences.minimumScore < 0 ||
    w.preferences.minimumScore > 100
  )
    throw new Error(
      "The backup has missing or invalid fields. Your workspace has not changed.",
    );
  return w;
}
export function loadWorkspace(): { workspace: Workspace; warning?: string } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { workspace: validateWorkspace(JSON.parse(saved)) };
    const w = createWorkspace();
    const legacy = (key: string, fallback: unknown) =>
      JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    w.applications = legacy("career-agent-applications", []);
    w.resumes = legacy("career-agent-private-resumes", []);
    w.evidence = legacy("career-agent-evidence-bank", []);
    w.preferences = {
      ...w.preferences,
      ...legacy("career-agent-autopilot-preferences", {}),
    };
    return { workspace: validateWorkspace(w) };
  } catch {
    return {
      workspace: createWorkspace(),
      warning:
        "Saved data could not be read. Existing browser data has been preserved. Export a backup before making changes.",
    };
  }
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function daysUntil(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const result = Math.round(
    (new Date(`${value}T12:00:00`).getTime() -
      new Date(`${localDate()}T12:00:00`).getTime()) /
      86400000,
  );
  return Number.isFinite(result) ? result : null;
}
export function downloadFile(
  content: string,
  filename: string,
  type = "text/plain",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const exportCsv = (applications: ApplicationRecord[]) => {
  const cell = (value: unknown) =>
    `"${String(value ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replace(/"/g, '""')}"`;
  return [
    [
      "Company",
      "Role",
      "Status",
      "Fit score",
      "Deadline",
      "Contact",
      "URL",
      "Next action",
      "Notes",
    ],
    ...applications.map((a) => [
      a.company,
      a.role,
      a.status,
      a.score,
      a.deadline,
      a.contact,
      a.url,
      a.nextAction,
      a.notes,
    ]),
  ]
    .map((row) => row.map(cell).join(","))
    .join("\r\n");
};
