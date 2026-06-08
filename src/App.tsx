import {
  AlertTriangle,
  BarChart3,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  Link as LinkIcon,
  MessageSquareText,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import { sampleJobDescription, sampleProfile } from "./data/sample";
import { analyzeApplication, type CareerAnalysis } from "./lib/analyzer";
import { parseLatexResume, type LatexResumeParse } from "./lib/latex";

type ApplicationStatus = "Researching" | "Drafting" | "Applied" | "Interviewing" | "Offer" | "Closed";
type GraduationYear = "auto" | "2027" | "2028" | "2029";
type AutopilotPreferenceKey = keyof AutopilotPreferences;
type EvidenceStatus = "Confirmed" | "Needs proof" | "Rejected";
type ApprovalState = "Not reviewed" | "Shortlist approved" | "Materials approved" | "Ready to submit";

interface ApplicationRecord {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  nextAction: string;
  score: number;
  url: string;
  contact: string;
  deadline: string;
  notes: string;
  resumeVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

interface ResumeVersion {
  id: string;
  name: string;
  sourceType: "latex" | "plain-text";
  rawContent: string;
  parsedText: string;
  parsedAt: string;
  parse: LatexResumeParse;
}

interface AutopilotPreferences {
  targetRoles: string;
  locations: string;
  companyPriority: string;
  jobTypes: string;
  minimumScore: number;
  approvalMode: string;
}

interface EvidenceItem {
  id: string;
  claim: string;
  source: string;
  status: EvidenceStatus;
  createdAt: string;
}

const storage = {
  applications: "career-agent-applications",
  resumes: "career-agent-private-resumes",
  autopilot: "career-agent-autopilot-preferences",
  evidence: "career-agent-evidence-bank",
  approval: "career-agent-package-approval",
};

const defaultAutopilotPreferences: AutopilotPreferences = {
  targetRoles: "Software Engineer Intern, Machine Learning Engineer Intern, AI Engineer Intern, Backend Engineer Intern",
  locations: "Canada, United States, remote-friendly, Waterloo/Toronto/SF/NYC/Seattle",
  companyPriority: "Top tech and elite trading/AI labs first; then strong late-stage companies; then high-signal startups.",
  jobTypes: "Internship, co-op, new grad, early-career SWE/MLE roles",
  minimumScore: 72,
  approvalMode: "Ask before tailoring, ask before submitting, never auto-submit without explicit approval.",
};

const approvalSteps = [
  "Search every morning for SWE/MLE roles across large tech, elite engineering firms, startups, and remote-friendly postings.",
  "Rank opportunities by company tier, technical fit, sponsorship/location practicality, deadline urgency, and resume match score.",
  "Ask for approval on the shortlist before spending time tailoring materials.",
  "Generate a one-page resume draft and one-page cover letter for approved roles.",
  "Show preview artifacts before any form is filled or application is submitted.",
  "Apply only after explicit approval for that exact company, role, resume, and cover letter.",
];

const approvalSequence: ApprovalState[] = [
  "Not reviewed",
  "Shortlist approved",
  "Materials approved",
  "Ready to submit",
];

const readStorage = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
};

const writeStorage = <T,>(key: string, value: T) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const emptyAnalysis = (analysis: CareerAnalysis) =>
  analysis.requiredSkills.length === 0 && analysis.keywords.length === 0;

const todayIso = () => new Date().toISOString().slice(0, 10);

function App() {
  const [profile, setProfile] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("Software Engineer Intern");
  const [company, setCompany] = useState("");
  const [program, setProgram] = useState("Computer Engineering");
  const [graduationYear, setGraduationYear] = useState<GraduationYear>("auto");
  const [jobUrl, setJobUrl] = useState("");
  const [contact, setContact] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [newEvidenceClaim, setNewEvidenceClaim] = useState("");
  const [newEvidenceSource, setNewEvidenceSource] = useState("");
  const [resumeName, setResumeName] = useState("default-resume.tex");
  const [rawResume, setRawResume] = useState("");
  const [activeResumeId, setActiveResumeId] = useState("");
  const [applications, setApplications] = useState<ApplicationRecord[]>(
    () => readStorage<ApplicationRecord[]>(storage.applications, []),
  );
  const [resumeVersions, setResumeVersions] = useState<ResumeVersion[]>(
    () => readStorage<ResumeVersion[]>(storage.resumes, []),
  );
  const [autopilotPreferences, setAutopilotPreferences] = useState<AutopilotPreferences>(
    () => readStorage<AutopilotPreferences>(storage.autopilot, defaultAutopilotPreferences),
  );
  const [evidenceItems, setEvidenceItems] = useState<EvidenceItem[]>(
    () => readStorage<EvidenceItem[]>(storage.evidence, []),
  );
  const [approvalState, setApprovalState] = useState<ApprovalState>(
    () => readStorage<ApprovalState>(storage.approval, "Not reviewed"),
  );

  const parsedResume = useMemo(() => parseLatexResume(rawResume), [rawResume]);
  const analysis = useMemo(
    () => analyzeApplication(profile, jobDescription, targetRole, { program, graduationYear, company }),
    [profile, jobDescription, targetRole, program, graduationYear, company],
  );

  const selectedResume = resumeVersions.find((resume) => resume.id === activeResumeId);
  const hasContent = profile.trim().length > 0 || jobDescription.trim().length > 0;
  const confirmationPrompts = analysis.missingSkills.slice(0, 4).map((skill) => {
    return `Do you have real project, internship, coursework, or competition evidence for ${skill.label}? If yes, add the source and result here before claiming it.`;
  });

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const content = await file.text();
    const parsed = parseLatexResume(content);
    setResumeName(file.name);
    setRawResume(content);
    setProfile(parsed.plainText);
  };

  const saveResumeVersion = () => {
    const content = rawResume.trim() || profile.trim();
    if (!content) return;

    const parse = rawResume.trim() ? parsedResume : parseLatexResume(profile);
    const nextVersion: ResumeVersion = {
      id: crypto.randomUUID(),
      name: resumeName.trim() || `resume-${todayIso()}`,
      sourceType: rawResume.trim() ? "latex" : "plain-text",
      rawContent: content,
      parsedText: rawResume.trim() ? parse.plainText : profile,
      parsedAt: new Date().toISOString(),
      parse,
    };

    const nextVersions = [nextVersion, ...resumeVersions];
    setResumeVersions(nextVersions);
    setActiveResumeId(nextVersion.id);
    writeStorage(storage.resumes, nextVersions);
  };

  const loadResumeVersion = (resumeId: string) => {
    const version = resumeVersions.find((resume) => resume.id === resumeId);
    if (!version) return;

    setActiveResumeId(version.id);
    setResumeName(version.name);
    setRawResume(version.sourceType === "latex" ? version.rawContent : "");
    setProfile(version.parsedText);
  };

  const saveApplication = () => {
    const now = new Date().toISOString();
    const nextRecord: ApplicationRecord = {
      id: crypto.randomUUID(),
      company: company.trim() || "Target company",
      role: targetRole.trim() || "Open role",
      status: "Drafting",
      nextAction: analysis.focusAreas[0] ?? "Tailor resume bullets",
      score: analysis.score,
      url: jobUrl.trim(),
      contact: contact.trim(),
      deadline,
      notes: notes.trim(),
      resumeVersionId: activeResumeId || selectedResume?.id,
      createdAt: now,
      updatedAt: now,
    };

    const nextApplications = [nextRecord, ...applications];
    setApplications(nextApplications);
    writeStorage(storage.applications, nextApplications);
  };

  const updateApplication = (id: string, patch: Partial<ApplicationRecord>) => {
    const nextApplications = applications.map((application) =>
      application.id === id ? { ...application, ...patch, updatedAt: new Date().toISOString() } : application,
    );
    setApplications(nextApplications);
    writeStorage(storage.applications, nextApplications);
  };

  const addEvidence = () => {
    if (!newEvidenceClaim.trim()) return;
    const nextItem: EvidenceItem = {
      id: crypto.randomUUID(),
      claim: newEvidenceClaim.trim(),
      source: newEvidenceSource.trim(),
      status: "Needs proof",
      createdAt: new Date().toISOString(),
    };
    const nextItems = [nextItem, ...evidenceItems];
    setEvidenceItems(nextItems);
    writeStorage(storage.evidence, nextItems);
    setNewEvidenceClaim("");
    setNewEvidenceSource("");
  };

  const updateEvidence = (id: string, status: EvidenceStatus) => {
    const nextItems = evidenceItems.map((item) => (item.id === id ? { ...item, status } : item));
    setEvidenceItems(nextItems);
    writeStorage(storage.evidence, nextItems);
  };

  const updateApprovalState = (nextState: ApprovalState) => {
    setApprovalState(nextState);
    writeStorage(storage.approval, nextState);
  };

  const printApplicationPackage = () => {
    window.print();
  };

  const exportTailoredDraft = () => {
    const draft = analysis.tailoredResumeDraft;
    const content = [
      draft.title,
      "",
      draft.summary,
      "",
      "Selected bullets",
      ...draft.bullets.map((bullet) => `- ${bullet}`),
      "",
      "Verified keywords",
      draft.keywordLine,
      "",
      "One-page checklist",
      ...draft.onePageChecklist.map((item) => `- ${item}`),
      "",
      "Truth checks",
      ...draft.proofWarnings.map((item) => `- ${item}`),
    ].join("\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${targetRole || "tailored-resume"}-draft.txt`.replace(/\s+/g, "-").toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCoverLetter = () => {
    const draft = analysis.coverLetterDraft;
    const content = [draft.salutation, "", ...draft.paragraphs, "", draft.closing, "", draft.formatNote].join("\n\n");
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${company || targetRole || "cover-letter"}-cover-letter.txt`
      .replace(/\s+/g, "-")
      .toLowerCase();
    link.click();
    URL.revokeObjectURL(url);
  };

  const useSample = () => {
    setProfile(sampleProfile);
    setRawResume("");
    setResumeName("sample-profile");
    setJobDescription(sampleJobDescription);
    setTargetRole("Frontend Software Engineer Intern");
    setCompany("Career technology platform");
    setProgram("Computer Engineering");
    setGraduationYear("auto");
    setJobUrl("https://example.com/frontend-intern");
    setContact("Recruiting team");
    setDeadline(todayIso());
    setNotes("Use this sample to test fit scoring, bullets, and tracking.");
    setApprovalState("Not reviewed");
  };

  const updateAutopilotPreference = <Key extends AutopilotPreferenceKey>(
    key: Key,
    value: AutopilotPreferences[Key],
  ) => {
    const nextPreferences = { ...autopilotPreferences, [key]: value };
    setAutopilotPreferences(nextPreferences);
    writeStorage(storage.autopilot, nextPreferences);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Briefcase size={20} />
          </div>
          <div>
            <p className="eyebrow">Career Agent</p>
            <h1>Application cockpit</h1>
          </div>
        </div>

        <div className="side-stack">
          <Metric icon={<Gauge size={18} />} label="Fit score" value={`${analysis.score}%`} />
          <Metric icon={<Target size={18} />} label="Matched skills" value={String(analysis.matchedSkills.length)} />
          <Metric icon={<UserRound size={18} />} label="Resume versions" value={String(resumeVersions.length)} />
          <Metric icon={<ClipboardList size={18} />} label="Tracked roles" value={String(applications.length)} />
        </div>

        <div className="truth-lock">
          <ShieldCheck size={18} />
          <span>Truth lock on: tailor hard, verify every claim.</span>
        </div>

        <button className="secondary-action" type="button" onClick={useSample}>
          <Sparkles size={16} />
          Load sample
        </button>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Daily workspace</p>
            <h2>Search, tailor, track, review</h2>
          </div>
          <button className="primary-action" type="button" onClick={saveApplication} disabled={!hasContent}>
            <Plus size={16} />
            Track role
          </button>
        </header>

        <section className="input-grid" aria-label="Application inputs">
          <Panel title="Autopilot control center" icon={<CalendarDays size={18} />}>
            <div className="autopilot-grid">
              <label className="field">
                <span>Target roles</span>
                <textarea
                  value={autopilotPreferences.targetRoles}
                  onChange={(event) => updateAutopilotPreference("targetRoles", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Locations</span>
                <textarea
                  value={autopilotPreferences.locations}
                  onChange={(event) => updateAutopilotPreference("locations", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Company ranking</span>
                <textarea
                  value={autopilotPreferences.companyPriority}
                  onChange={(event) => updateAutopilotPreference("companyPriority", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Job types</span>
                <textarea
                  value={autopilotPreferences.jobTypes}
                  onChange={(event) => updateAutopilotPreference("jobTypes", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Minimum shortlist score</span>
                <input
                  max="100"
                  min="0"
                  type="number"
                  value={autopilotPreferences.minimumScore}
                  onChange={(event) => updateAutopilotPreference("minimumScore", Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>Approval mode</span>
                <textarea
                  value={autopilotPreferences.approvalMode}
                  onChange={(event) => updateAutopilotPreference("approvalMode", event.target.value)}
                />
              </label>
            </div>
            <div className="approval-flow">
              {approvalSteps.map((step, index) => (
                <div className="approval-step" key={step}>
                  <strong>{index + 1}</strong>
                  <span>{step}</span>
                </div>
              ))}
            </div>
            <div className="privacy-note">
              <ShieldCheck size={16} />
              <p>Preferences save locally. The daily Codex automation uses these rules as the operating plan.</p>
            </div>
          </Panel>

          <Panel title="Private resume" icon={<Upload size={18} />}>
            <div className="resume-controls">
              <label className="file-picker">
                <Upload size={16} />
                <span>Import .tex</span>
                <input accept=".tex,.txt" type="file" onChange={handleResumeUpload} />
              </label>
              <button className="icon-action" type="button" onClick={saveResumeVersion} disabled={!profile.trim()}>
                <Save size={16} />
                Save private version
              </button>
            </div>
            <label className="field">
              <span>Resume version name</span>
              <input value={resumeName} onChange={(event) => setResumeName(event.target.value)} />
            </label>
            {resumeVersions.length > 0 && (
              <label className="field">
                <span>Saved versions</span>
                <select value={activeResumeId} onChange={(event) => loadResumeVersion(event.target.value)}>
                  <option value="">Select saved resume</option>
                  {resumeVersions.map((resume) => (
                    <option key={resume.id} value={resume.id}>
                      {resume.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="privacy-note">
              <ShieldCheck size={16} />
              <p>Resume uploads stay in this browser. The repo ignores private resume files and local secrets.</p>
            </div>
            {rawResume.trim() && (
              <div className="parse-summary">
                <span>{parsedResume.bullets.length} bullets detected</span>
                <span>{parsedResume.estimatedLines} estimated lines</span>
                <span>{parsedResume.sectionTitles.length} sections</span>
              </div>
            )}
            {parsedResume.warnings.length > 0 && rawResume.trim() && (
              <div className="warning-list">
                {parsedResume.warnings.map((warning) => (
                  <p key={warning}>
                    <AlertTriangle size={14} />
                    {warning}
                  </p>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Opportunity" icon={<Briefcase size={18} />}>
            <div className="opportunity-grid">
              <label className="field">
                <span>Target role</span>
                <input value={targetRole} onChange={(event) => setTargetRole(event.target.value)} />
              </label>
              <label className="field">
                <span>Company</span>
                <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Optional" />
              </label>
              <label className="field">
                <span>Program</span>
                <input value={program} onChange={(event) => setProgram(event.target.value)} />
              </label>
              <label className="field">
                <span>Graduation date</span>
                <select value={graduationYear} onChange={(event) => setGraduationYear(event.target.value as GraduationYear)}>
                  <option value="auto">Auto: match job description</option>
                  <option value="2027">May 2027</option>
                  <option value="2028">May 2028</option>
                  <option value="2029">May 2029</option>
                </select>
              </label>
              <label className="field">
                <span>Job URL</span>
                <input value={jobUrl} onChange={(event) => setJobUrl(event.target.value)} placeholder="Optional" />
              </label>
              <label className="field">
                <span>Contact</span>
                <input value={contact} onChange={(event) => setContact(event.target.value)} placeholder="Optional" />
              </label>
              <label className="field">
                <span>Deadline</span>
                <input value={deadline} type="date" onChange={(event) => setDeadline(event.target.value)} />
              </label>
              <label className="field">
                <span>Notes</span>
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional" />
              </label>
            </div>
          </Panel>

          <label className="field large-field">
            <span>Candidate profile or parsed resume</span>
            <textarea
              value={profile}
              onChange={(event) => setProfile(event.target.value)}
              placeholder="Paste resume bullets, project notes, skills, and experience."
            />
          </label>
          <label className="field large-field">
            <span>Job description</span>
            <textarea
              value={jobDescription}
              onChange={(event) => setJobDescription(event.target.value)}
              placeholder="Paste the role description, responsibilities, and requirements."
            />
          </label>
        </section>

        <section className="dashboard-grid" aria-label="Application analysis">
          <Panel title="Application package" icon={<Send size={18} />}>
            <div className="approval-status">
              {approvalSequence.map((state) => (
                <button
                  className={approvalState === state ? "approval-button active" : "approval-button"}
                  key={state}
                  type="button"
                  onClick={() => updateApprovalState(state)}
                >
                  {state}
                </button>
              ))}
            </div>
            <div className="package-actions">
              <button className="icon-action" type="button" onClick={printApplicationPackage} disabled={!hasContent}>
                <Printer size={16} />
                Preview / print PDF
              </button>
              <button
                className="icon-action"
                type="button"
                disabled={approvalState !== "Ready to submit"}
                onClick={saveApplication}
              >
                <Send size={16} />
                Queue approved package
              </button>
            </div>
            <p className="summary-line">
              The agent should only fill forms or submit after this exact package is marked ready.
            </p>
          </Panel>

          <Panel title="Fit summary" icon={<BarChart3 size={18} />}>
            {emptyAnalysis(analysis) ? (
              <EmptyState />
            ) : (
              <div className="score-layout">
                <div className="score-ring" aria-label={`Fit score ${analysis.score} percent`}>
                  <span>{analysis.score}</span>
                  <small>score</small>
                </div>
                <div>
                  <p className="summary-line">Seniority signal: {analysis.seniority}</p>
                  <p className="summary-line">{analysis.educationLine}</p>
                  <p className="summary-line">
                    {analysis.matchedSkills.length} of {analysis.requiredSkills.length || 1} detected role skills match
                    the resume.
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel title="Skill coverage" icon={<CheckCircle2 size={18} />}>
            <TagList
              emptyLabel="No role skills detected yet"
              items={analysis.requiredSkills.map((skill) => ({
                label: skill.label,
                tone: skill.inProfile ? "good" : "warn",
              }))}
            />
          </Panel>

          <Panel title="Keyword gaps" icon={<Target size={18} />}>
            <TagList
              emptyLabel="Paste a job description to extract keywords"
              items={analysis.keywords.map((keyword) => ({
                label: `${keyword.term} (${keyword.count})`,
                tone: keyword.inProfile ? "good" : "neutral",
              }))}
            />
          </Panel>

          <Panel title="One-page resume draft" icon={<FileText size={18} />}>
            <div className="draft-header">
              <strong>{analysis.tailoredResumeDraft.title}</strong>
              <button className="icon-action" type="button" onClick={exportTailoredDraft} disabled={!hasContent}>
                <Download size={16} />
                Export
              </button>
            </div>
            <p className="summary-line">{analysis.tailoredResumeDraft.summary}</p>
            <p className="summary-line">{analysis.tailoredResumeDraft.educationLine}</p>
            <OrderedItems items={analysis.tailoredResumeDraft.bullets} />
          </Panel>

          <Panel title="Cover letter" icon={<MessageSquareText size={18} />}>
            <div className="draft-header">
              <strong>One-page draft</strong>
              <button className="icon-action" type="button" onClick={exportCoverLetter} disabled={!hasContent}>
                <Download size={16} />
                Export
              </button>
            </div>
            <div className="cover-letter">
              <p>{analysis.coverLetterDraft.salutation}</p>
              {analysis.coverLetterDraft.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              <p>{analysis.coverLetterDraft.closing}</p>
            </div>
            <p className="format-note">{analysis.coverLetterDraft.formatNote}</p>
          </Panel>

          <Panel title="One-page checks" icon={<ShieldCheck size={18} />}>
            <OrderedItems items={analysis.tailoredResumeDraft.onePageChecklist} />
          </Panel>

          <Panel title="Proof checks" icon={<AlertTriangle size={18} />}>
            <OrderedItems items={analysis.tailoredResumeDraft.proofWarnings} />
          </Panel>

          <Panel title="Evidence bank" icon={<Search size={18} />}>
            <div className="evidence-form">
              <label className="field">
                <span>Possible claim to verify</span>
                <input
                  value={newEvidenceClaim}
                  onChange={(event) => setNewEvidenceClaim(event.target.value)}
                  placeholder="Example: used Kubernetes in a class project"
                />
              </label>
              <label className="field">
                <span>Where proof lives</span>
                <input
                  value={newEvidenceSource}
                  onChange={(event) => setNewEvidenceSource(event.target.value)}
                  placeholder="Resume, GitHub repo, transcript, notes"
                />
              </label>
              <button className="icon-action" type="button" onClick={addEvidence}>
                <Plus size={16} />
                Add to verify
              </button>
            </div>
            {confirmationPrompts.length > 0 && (
              <div className="prompt-list">
                {confirmationPrompts.map((prompt) => (
                  <p key={prompt}>{prompt}</p>
                ))}
              </div>
            )}
            <div className="evidence-list">
              {evidenceItems.length === 0 ? (
                <p className="empty-copy">Add plausible experience here before using it in a resume or cover letter.</p>
              ) : (
                evidenceItems.map((item) => (
                  <article className="evidence-row" key={item.id}>
                    <div>
                      <strong>{item.claim}</strong>
                      <span>{item.source || "No proof source yet"}</span>
                    </div>
                    <select value={item.status} onChange={(event) => updateEvidence(item.id, event.target.value as EvidenceStatus)}>
                      <option>Needs proof</option>
                      <option>Confirmed</option>
                      <option>Rejected</option>
                    </select>
                  </article>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Focus plan" icon={<ClipboardList size={18} />}>
            <OrderedItems
              items={
                analysis.focusAreas.length > 0
                  ? analysis.focusAreas
                  : ["Add a job description and resume to create a plan."]
              }
            />
          </Panel>

          <Panel title="Messaging" icon={<MessageSquareText size={18} />}>
            <div className="copy-block">
              <span>Cover letter opener</span>
              <p>{analysis.coverLetterOpener}</p>
            </div>
            <div className="copy-block">
              <span>Networking note</span>
              <p>{analysis.outreachNote}</p>
            </div>
          </Panel>

          <Panel title="Daily runbook" icon={<CalendarDays size={18} />}>
            <OrderedItems
              items={[
                "Search SWE/MLE roles every morning and rank top tech before smaller companies.",
                `Shortlist roles scoring at least ${autopilotPreferences.minimumScore}% unless a rare opportunity deserves review.`,
                "Draft one-page resume bullets using Action + Task + Result.",
                "Draft a one-page cover letter whenever the option exists.",
                "Preview resume and cover letter PDFs before form filling.",
                "Submit only after explicit approval for the exact application package.",
              ]}
            />
          </Panel>
        </section>

        <section className="print-package" aria-label="Printable application package">
          <div className="print-page">
            <h2>{analysis.tailoredResumeDraft.title}</h2>
            <p>{analysis.tailoredResumeDraft.educationLine}</p>
            <p>{analysis.tailoredResumeDraft.summary}</p>
            <ul>
              {analysis.tailoredResumeDraft.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
          <div className="print-page">
            <p>{analysis.coverLetterDraft.salutation}</p>
            {analysis.coverLetterDraft.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>{analysis.coverLetterDraft.closing}</p>
          </div>
        </section>

        <section className="tracker" aria-label="Application tracker">
          <div className="section-heading">
            <h2>Application tracker</h2>
            <p>{applications.length} saved opportunities</p>
          </div>
          <div className="tracker-table">
            {applications.length === 0 ? (
              <p className="empty-copy">Tracked roles will appear here after you save an analysis.</p>
            ) : (
              applications.map((application) => (
                <article className="tracker-row" key={application.id}>
                  <div>
                    <strong>{application.role}</strong>
                    <span>{application.company}</span>
                    {application.url && (
                      <a href={application.url} rel="noreferrer" target="_blank">
                        <LinkIcon size={13} />
                        Job link
                      </a>
                    )}
                  </div>
                  <span className="score-pill">{application.score}%</span>
                  <select
                    value={application.status}
                    onChange={(event) =>
                      updateApplication(application.id, { status: event.target.value as ApplicationStatus })
                    }
                  >
                    <option>Researching</option>
                    <option>Drafting</option>
                    <option>Applied</option>
                    <option>Interviewing</option>
                    <option>Offer</option>
                    <option>Closed</option>
                  </select>
                  <div className="tracker-meta">
                    <span>{application.deadline || "No deadline"}</span>
                    <span>{application.contact || "No contact"}</span>
                    <p>{application.nextAction}</p>
                    {application.notes && <p>{application.notes}</p>}
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-title">
        {icon}
        <h3>{title}</h3>
      </div>
      {children}
    </article>
  );
}

function EmptyState() {
  return <p className="empty-copy">Paste a profile and job description, or load the sample to start.</p>;
}

function TagList({ items, emptyLabel }: { items: { label: string; tone: string }[]; emptyLabel: string }) {
  if (items.length === 0) return <p className="empty-copy">{emptyLabel}</p>;

  return (
    <div className="tag-list">
      {items.map((item) => (
        <span className={`tag ${item.tone}`} key={item.label}>
          {item.label}
        </span>
      ))}
    </div>
  );
}

function OrderedItems({ items }: { items: string[] }) {
  return (
    <ol className="ordered-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ol>
  );
}

export default App;
