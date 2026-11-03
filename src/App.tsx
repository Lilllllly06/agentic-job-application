import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Copy,
  Download,
  ExternalLink,
  FileCheck2,
  FilePlus2,
  FileText,
  FolderOpen,
  LayoutDashboard,
  Leaf,
  ListFilter,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  Printer,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { createDemoWorkspace } from "./data/sample";
import { analyzeApplication, letterText, resumeText } from "./lib/analyzer";
import { parseLatexResume } from "./lib/latex";
import {
  daysUntil,
  downloadFile,
  emptyDraft,
  exportCsv,
  isApproved,
  loadWorkspace,
  newOpportunityDraft,
  packageFingerprint,
  safeUrl,
  sourceFingerprint,
  statuses,
  STORAGE_KEY,
  validateWorkspace,
  type ApplicationRecord,
  type ApplicationStatus,
  type Draft,
  type View,
  type Workspace,
} from "./lib/workspace";
import {
  Button,
  CompanyMark,
  Deadline,
  Empty,
  Field,
  IconButton,
  Modal,
  PageHeading,
  Panel,
  RoleTable,
  StatusBadge,
  StepLink,
  TextLink,
} from "./components/ui";
const navItems: { id: View; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "tailor", label: "Tailor application", icon: Sparkles },
  { id: "applications", label: "Applications", icon: BriefcaseBusiness },
  { id: "resumes", label: "Resume library", icon: FolderOpen },
  { id: "preferences", label: "Preferences", icon: Settings2 },
];
type Toast = { message: string; undo?: () => void };
function App() {
  const [initial] = useState(loadWorkspace);
  const [privateWorkspace, setPrivateWorkspace] = useState(initial.workspace);
  const [demoWorkspace, setDemoWorkspace] = useState(createDemoWorkspace);
  const [demo, setDemo] = useState(false);
  const [view, setView] = useState<View>("overview");
  const [step, setStep] = useState(0);
  const [toast, setToast] = useState<Toast | null>(null);
  const [storageWarning, setStorageWarning] = useState(initial.warning || "");
  const [saveState, setSaveState] = useState("Saved on this device");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const [restore, setRestore] = useState<Workspace | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [sort, setSort] = useState("recent");
  const [resumeName, setResumeName] = useState("");
  const [evidenceClaim, setEvidenceClaim] = useState("");
  const [evidenceSource, setEvidenceSource] = useState("");
  const importRef = useRef<HTMLInputElement>(null),
    backupRef = useRef<HTMLInputElement>(null);
  const saveRequested = useRef(false);
  const w = demo ? demoWorkspace : privateWorkspace;
  const d = w.draft;
  const analysis = useMemo(
    () =>
      analyzeApplication(d.profile, d.jobDescription, d.role, {
        company: d.company,
        applicantName: d.applicantName,
        education: d.education,
      }),
    [
      d.profile,
      d.jobDescription,
      d.role,
      d.company,
      d.applicantName,
      d.education,
    ],
  );
  const ready = !!d.profile.trim() && !!d.jobDescription.trim();
  const generated =
    !!d.materials && d.materials.source === sourceFingerprint(d);
  const approved = isApproved(d);
  const selected = w.applications.find((a) => a.id === selectedId);
  const notice = (message: string, undo?: () => void) =>
    setToast({ message, undo });
  const update = (fn: (value: Workspace) => Workspace) => {
    if (demo) setDemoWorkspace(fn);
    else {
      saveRequested.current = true;
      setPrivateWorkspace(fn);
    }
  };
  useEffect(() => {
    if (!saveRequested.current) return;
    saveRequested.current = false;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(privateWorkspace));
      setSaveState("Saved on this device");
    } catch {
      setSaveState("Changes are not saved");
      setStorageWarning(
        "Browser storage is unavailable or full. Export a backup to keep your changes.",
      );
    }
  }, [privateWorkspace]);
  const patchDraft = (patch: Partial<Draft>) =>
    update((old) => ({ ...old, draft: { ...old.draft, ...patch } }));
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.undo ? 12000 : 4500);
    return () => clearTimeout(id);
  }, [toast]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
        setHelp(false);
        setRestore(null);
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const listener = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        try {
          setPrivateWorkspace(validateWorkspace(JSON.parse(event.newValue)));
        } catch {
          setStorageWarning(
            "Another tab saved unreadable data. Your current workspace is still available.",
          );
        }
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);
  const goStep = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const navigate = (next: View) => {
    setView(next);
    setSelectedId(null);
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const startNew = () => {
    if (d.applicationId) {
      clearDraft();
      navigate("tailor");
    } else if (d.company || d.jobDescription || d.materials) {
      navigate("tailor");
      notice(
        "Your current draft is open. Save it to the tracker before starting another.",
      );
    } else {
      goStep(0);
      navigate("tailor");
    }
  };
  const clearDraft = () => {
    const previous = d;
    update((old) => ({ ...old, draft: newOpportunityDraft(old.draft) }));
    goStep(0);
    notice("Started a fresh opportunity. Your profile is kept.", () =>
      update((old) => ({ ...old, draft: previous })),
    );
  };
  const enterDemo = () => {
    setDemoWorkspace(createDemoWorkspace());
    setDemo(true);
    setSelectedId(null);
    setView("overview");
    goStep(0);
    notice("Demo workspace loaded. Your saved workspace is kept separately.");
  };
  const saveApplication = () => {
    if (!d.company.trim() || !d.role.trim()) {
      notice("Add a company and role before saving.");
      goStep(0);
      return;
    }
    if (d.url.trim() && !safeUrl(d.url)) {
      notice("Use a full job URL beginning with https:// or http://.");
      goStep(0);
      return;
    }
    const existing =
      w.applications.find((a) => a.id === d.applicationId) ||
      w.applications.find(
        (a) =>
          a.company.trim().toLowerCase() === d.company.trim().toLowerCase() &&
          a.role.trim().toLowerCase() === d.role.trim().toLowerCase(),
      );
    const now = new Date().toISOString(),
      id = existing?.id || crypto.randomUUID();
    const snapshot = { ...d, applicationId: id };
    const record: ApplicationRecord = {
      id,
      company: d.company.trim(),
      role: d.role.trim(),
      status: existing?.status || "Drafting",
      score: ready ? analysis.score : 0,
      nextAction: approved
        ? "Package approved. Open the posting and apply when ready."
        : analysis.focusAreas[0] ||
          "Review and personalize application materials.",
      url: d.url.trim(),
      contact: d.contact.trim(),
      deadline: d.deadline,
      notes: d.notes,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      draft: snapshot,
    };
    update((old) => ({
      ...old,
      draft: snapshot,
      applications: existing
        ? old.applications.map((a) => (a.id === id ? record : a))
        : [record, ...old.applications],
    }));
    notice(
      existing
        ? "Application updated in your tracker."
        : "Application added to your tracker.",
    );
  };
  const updateApplication = (id: string, patch: Partial<ApplicationRecord>) =>
    update((old) => ({
      ...old,
      applications: old.applications.map((a) =>
        a.id === id
          ? { ...a, ...patch, updatedAt: new Date().toISOString() }
          : a,
      ),
    }));
  const removeApplication = (record: ApplicationRecord) => {
    update((old) => ({
      ...old,
      applications: old.applications.filter((a) => a.id !== record.id),
      draft:
        old.draft.applicationId === record.id
          ? { ...old.draft, applicationId: undefined }
          : old.draft,
    }));
    setSelectedId(null);
    notice("Application removed.", () =>
      update((old) => ({
        ...old,
        applications: [record, ...old.applications],
      })),
    );
  };
  const openApplication = (record: ApplicationRecord) => {
    const current = d;
    update((old) => ({
      ...old,
      draft: record.draft
        ? {
            ...record.draft,
            company: record.company,
            role: record.role,
            url: record.url,
            contact: record.contact,
            deadline: record.deadline,
            notes: record.notes,
            applicationId: record.id,
          }
        : {
            ...emptyDraft(),
            profile: old.draft.profile,
            company: record.company,
            role: record.role,
            url: record.url,
            contact: record.contact,
            deadline: record.deadline,
            notes: record.notes,
            applicationId: record.id,
          },
    }));
    navigate("tailor");
    goStep(record.draft?.materials ? 2 : 0);
    notice(`Opened ${record.company}.`, () =>
      update((old) => ({ ...old, draft: current })),
    );
  };
  const generate = () => {
    if (!ready) {
      goStep(0);
      notice("Add your profile and the job description first.");
      return;
    }
    const previous = d;
    patchDraft({
      materials: {
        resume: resumeText(analysis, d.applicantName),
        letter: letterText(analysis),
        source: sourceFingerprint(d),
      },
      approvedPackage: undefined,
    });
    goStep(2);
    notice(
      "Drafts created from your profile. Review and personalize them.",
      previous.materials
        ? () => update((old) => ({ ...old, draft: previous }))
        : undefined,
    );
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notice("Copied to clipboard.");
    } catch {
      notice("Clipboard unavailable. Select the text and copy it manually.");
    }
  };
  const importResume = async (file?: File) => {
    if (!file) return;
    if (!/\.(tex|txt)$/i.test(file.name)) {
      notice("Choose a .tex or .txt resume. PDF import is not available yet.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      notice("Choose a resume smaller than 2 MB.");
      return;
    }
    try {
      const content = await file.text(),
        latex = /\.tex$/i.test(file.name),
        parsed = latex ? parseLatexResume(content).plainText : content.trim();
      if (!parsed) {
        notice("This file has no readable resume text.");
        return;
      }
      const resume = {
        id: crypto.randomUUID(),
        name: file.name.replace(/\.(tex|txt)$/i, ""),
        sourceType: latex ? ("latex" as const) : ("plain-text" as const),
        rawContent: content,
        parsedText: parsed,
        parsedAt: new Date().toISOString(),
      };
      update((old) => ({
        ...old,
        resumes: [resume, ...old.resumes],
        draft: { ...old.draft, profile: parsed, resumeVersionId: resume.id },
      }));
      notice(
        `Imported ${file.name}. Review the extracted text in your profile.`,
      );
    } catch {
      notice("The file could not be read. Try importing it again.");
    }
  };
  const saveResume = () => {
    if (!d.profile.trim()) return;
    if (!resumeName.trim()) {
      notice("Give this resume version a name.");
      return;
    }
    const r = {
      id: crypto.randomUUID(),
      name: resumeName.trim(),
      sourceType: "plain-text" as const,
      rawContent: d.profile,
      parsedText: d.profile,
      parsedAt: new Date().toISOString(),
    };
    update((old) => ({
      ...old,
      resumes: [r, ...old.resumes],
      draft: { ...old.draft, resumeVersionId: r.id },
    }));
    setResumeName("");
    notice("Resume version saved.");
  };
  const visibleApplications = useMemo(
    () =>
      w.applications
        .filter(
          (a) =>
            (filter === "All statuses" || a.status === filter) &&
            `${a.company} ${a.role} ${a.notes} ${a.contact}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .sort((a, b) =>
          sort === "score"
            ? b.score - a.score
            : sort === "deadline"
              ? (a.deadline || "9999").localeCompare(b.deadline || "9999")
              : b.updatedAt.localeCompare(a.updatedAt),
        ),
    [w.applications, filter, search, sort],
  );
  const active = w.applications.filter(
    (a) => !["Closed", "Offer"].includes(a.status),
  );
  const upcoming = active
    .filter((a) => {
      const days = daysUntil(a.deadline);
      return days !== null && days >= 0 && days <= 7;
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline));
  const stats = [
    {
      label: "Active applications",
      value: active.length,
      note: "Good things in motion",
      icon: BriefcaseBusiness,
    },
    {
      label: "In conversation",
      value: w.applications.filter((a) => a.status === "Interviewing").length,
      note: "A chance to tell your story",
      icon: CalendarDays,
    },
    {
      label: "Materials to review",
      value: w.applications.filter((a) => a.status === "Drafting").length,
      note: "Make every detail count",
      icon: FileCheck2,
    },
    {
      label: "Offers received",
      value: w.applications.filter((a) => a.status === "Offer").length,
      note: "Your next chapter awaits",
      icon: Target,
    },
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Career Agent home"
        >
          <span className="brand-mark">
            <Leaf size={22} strokeWidth={1.6} />
          </span>
          <span>
            career<span className="brand-light">agent</span>
            <small>A little direction. A next step.</small>
          </span>
        </button>
        <p className="nav-caption">YOUR WORKSPACE</p>
        <nav aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} strokeWidth={1.7} />
              <span>{label}</span>
              {id === "applications" && w.applications.length > 0 && (
                <small>{w.applications.length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-card">
            <span className="mini-orbit">
              <Sparkles size={18} />
            </span>
            <strong>Meet your next chapter.</strong>
            <p>Take a look around with a ready-to-explore workspace.</p>
            <button onClick={enterDemo}>
              Explore the demo <ArrowUpRight size={15} />
            </button>
          </div>
          <button className="help-link" onClick={() => setHelp(true)}>
            <CircleHelp size={17} />A little help
          </button>
          <div className="local-label">
            <span className="online-dot" />
            <span>
              Private by default<small>Stored in your browser</small>
            </span>
            <LockKeyhole size={14} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>{navItems.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="saved-label">
              <span className="online-dot" />
              {demo ? "Demo workspace" : saveState}
            </span>
            <span className="avatar">
              {d.applicantName
                ? d.applicantName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                : "Y"}
            </span>
          </div>
        </header>
        {demo && (
          <div className="demo-banner">
            <span>
              <Sparkles size={15} /> You’re exploring the demo. Changes here
              won’t affect your saved workspace.
            </span>
            <button
              onClick={() => {
                setDemo(false);
                setSelectedId(null);
                notice("Back in your private workspace.");
              }}
            >
              Back to my workspace <X size={14} />
            </button>
          </div>
        )}
        {storageWarning && !demo && (
          <div className="storage-warning" role="alert">
            {storageWarning}
            <Button
              variant="ghost"
              onClick={() =>
                downloadFile(
                  JSON.stringify(w, null, 2),
                  "career-agent-backup.json",
                  "application/json",
                )
              }
            >
              Export backup
            </Button>
          </div>
        )}
        <main id="main-content" className="workspace">
          {view === "overview" && (
            <>
              <PageHeading
                eyebrow="MAKE ROOM FOR WHAT’S NEXT"
                title={
                  d.applicantName
                    ? `Your next chapter, ${d.applicantName.split(" ")[0]}.`
                    : "Your next chapter starts here."
                }
                description="A thoughtful space for the work of finding your work."
                action={
                  <Button onClick={startNew}>
                    <Plus size={16} />
                    New application
                  </Button>
                }
              />
              <section className="welcome-panel">
                <div className="welcome-copy">
                  <span className="pill">
                    <span />A little intention goes a long way
                  </span>
                  <h2>
                    Less busywork.
                    <br />
                    More possibility.
                  </h2>
                  <p>
                    Bring your experience. Find your fit. Put your best
                    <br className="desktop-break" /> self forward, one
                    application at a time.
                  </p>
                  <Button
                    onClick={() => {
                      navigate("tailor");
                      goStep(0);
                    }}
                  >
                    {d.jobDescription
                      ? "Continue your application"
                      : "Tailor your first application"}
                    <ArrowRight size={16} />
                  </Button>
                  <small>
                    <ShieldCheck size={14} />
                    Your experience. Your words. Always reviewed by you.
                  </small>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <span className="art-star star-one">✧</span>
                  <span className="art-star star-two">✦</span>
                  <div className="floating-check">
                    <Check size={19} />
                  </div>
                  <div className="paper-card">
                    <span className="paper-top">
                      <span className="paper-logo">
                        <Leaf size={18} />
                      </span>
                      <span>YOUR NEXT OPPORTUNITY</span>
                      <MoreHorizontal size={17} />
                    </span>
                    <span className="paper-title">
                      A role that feels
                      <br />
                      like a step forward.
                    </span>
                    <span className="paper-line long" />
                    <span className="paper-line" />
                    <span className="paper-line short" />
                    <span className="paper-match">
                      <span>
                        <CheckCheck size={16} />
                        Made for your experience
                      </span>
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                  <div className="art-caption">
                    <span className="online-dot" />A little closer to what’s
                    next.
                  </div>
                </div>
              </section>
              <div className="stat-grid">
                {stats.map(({ label, value, note, icon: Icon }) => (
                  <div className="stat-card" key={label}>
                    <div>
                      <span>{label}</span>
                      <Icon size={17} strokeWidth={1.6} />
                    </div>
                    <strong>{String(value).padStart(2, "0")}</strong>
                    <small>{note}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <Panel
                  title="Your opportunities"
                  subtitle="Small steps. Real momentum."
                  action={
                    <TextLink onClick={() => navigate("applications")}>
                      View all
                    </TextLink>
                  }
                >
                  {w.applications.length ? (
                    <RoleTable
                      applications={w.applications.slice(0, 4)}
                      onSelect={setSelectedId}
                      compact
                    />
                  ) : (
                    <Empty
                      title="Your next opportunity belongs here."
                      description="Add a role you’re excited about, or explore the demo to see the workspace in action."
                      action={
                        <Button variant="secondary" onClick={enterDemo}>
                          Explore demo <ArrowRight size={15} />
                        </Button>
                      }
                    />
                  )}
                </Panel>
                <Panel
                  title="A little direction"
                  subtitle="Your application, one step at a time."
                  className="direction-panel"
                >
                  <StepLink
                    number="01"
                    title="Start with your story"
                    text="Add a resume or experience notes"
                    done={!!d.profile.trim()}
                    onClick={() => navigate("resumes")}
                  />
                  <StepLink
                    number="02"
                    title="Find the connection"
                    text="See how your skills fit the role"
                    done={ready}
                    onClick={() => {
                      navigate("tailor");
                      goStep(ready ? 1 : 0);
                    }}
                  />
                  <StepLink
                    number="03"
                    title="Make it yours"
                    text="Tailor, review, and take your next step"
                    done={approved}
                    onClick={() => {
                      navigate("tailor");
                      goStep(generated ? 2 : 0);
                    }}
                  />
                  <div className="direction-footer">
                    <Leaf size={16} />
                    <p>
                      Progress is a practice.
                      <br />
                      You’re in the right place.
                    </p>
                  </div>
                </Panel>
              </div>
              <div className="overview-bottom">
                <div className="up-next-label">
                  <CalendarDays size={18} />
                  <div>
                    <strong>On the horizon</strong>
                    <span>
                      {upcoming.length
                        ? `${upcoming.length} deadline${upcoming.length === 1 ? "" : "s"} in the next 7 days`
                        : "No upcoming deadlines. A little breathing room."}
                    </span>
                  </div>
                </div>
                {upcoming.slice(0, 2).map((a) => (
                  <button
                    className="upcoming-item"
                    key={a.id}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <span>
                      {a.company}
                      <small>{a.role}</small>
                    </span>
                    <Deadline date={a.deadline} />
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>
            </>
          )}
          {view === "tailor" && (
            <>
              <PageHeading
                eyebrow="PUT YOUR EXPERIENCE INTO WORDS"
                title="A more thoughtful application."
                description="Connect what you’ve done with what comes next."
                action={
                  <div className="action-row">
                    <Button variant="secondary" onClick={clearDraft}>
                      <FilePlus2 size={16} />
                      Start fresh
                    </Button>
                    <Button onClick={saveApplication}>
                      <Plus size={16} />
                      {d.applicationId
                        ? "Update application"
                        : "Save to tracker"}
                    </Button>
                  </div>
                }
              />
              <div
                className="workflow-tabs"
                role="tablist"
                aria-label="Application workflow"
              >
                {[
                  "The opportunity",
                  "Your fit & gaps",
                  "Materials & review",
                ].map((label, i) => (
                  <button
                    key={label}
                    role="tab"
                    aria-selected={step === i}
                    tabIndex={step === i ? 0 : -1}
                    id={`step-${i}`}
                    aria-controls="workflow-panel"
                    onClick={() => goStep(i)}
                    onKeyDown={(event) => {
                      const next =
                        event.key === "ArrowRight"
                          ? (i + 1) % 3
                          : event.key === "ArrowLeft"
                            ? (i + 2) % 3
                            : event.key === "Home"
                              ? 0
                              : event.key === "End"
                                ? 2
                                : null;
                      if (next !== null) {
                        event.preventDefault();
                        goStep(next);
                        document.getElementById(`step-${next}`)?.focus();
                      }
                    }}
                  >
                    <span>{i + 1}</span>
                    {label}
                    {i < 2 && <ArrowRight size={14} />}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id="workflow-panel"
                aria-labelledby={`step-${step}`}
              >
                {step === 0 && (
                  <div className="tailor-grid">
                    <Panel
                      title="The opportunity"
                      subtitle="A role that’s worth a closer look."
                    >
                      <div className="form-grid">
                        <Field label="Company">
                          <input
                            value={d.company}
                            onChange={(e) =>
                              patchDraft({ company: e.target.value })
                            }
                            placeholder="e.g. Linear"
                            maxLength={160}
                          />
                        </Field>
                        <Field label="Role title">
                          <input
                            value={d.role}
                            onChange={(e) =>
                              patchDraft({ role: e.target.value })
                            }
                            placeholder="e.g. Software Engineer Intern"
                            maxLength={200}
                          />
                        </Field>
                      </div>
                      <Field
                        label="Job description"
                        hint={`${d.jobDescription.trim().split(/\s+/).filter(Boolean).length} words · Requirements, responsibilities, and anything that matters.`}
                      >
                        <textarea
                          className="job-textarea"
                          value={d.jobDescription}
                          onChange={(e) =>
                            patchDraft({ jobDescription: e.target.value })
                          }
                          placeholder="Paste the job description here. We’ll look for the connections to your experience."
                        />
                      </Field>
                      <details className="details-block">
                        <summary>
                          Links, contacts & other details{" "}
                          <ChevronDown size={15} />
                        </summary>
                        <div className="form-grid">
                          <Field label="Job posting URL">
                            <input
                              type="url"
                              value={d.url}
                              placeholder="https://company.com/careers/role"
                              onChange={(e) =>
                                patchDraft({ url: e.target.value })
                              }
                              aria-invalid={!!d.url && !safeUrl(d.url)}
                            />
                          </Field>
                          <Field label="Application deadline">
                            <input
                              type="date"
                              value={d.deadline}
                              onChange={(e) =>
                                patchDraft({ deadline: e.target.value })
                              }
                            />
                          </Field>
                          <Field label="Recruiter or contact">
                            <input
                              value={d.contact}
                              onChange={(e) =>
                                patchDraft({ contact: e.target.value })
                              }
                              placeholder="Name or email"
                            />
                          </Field>
                          <Field label="A note to yourself">
                            <input
                              value={d.notes}
                              onChange={(e) =>
                                patchDraft({ notes: e.target.value })
                              }
                              placeholder="What caught your attention?"
                            />
                          </Field>
                        </div>
                      </details>
                    </Panel>
                    <Panel
                      title="Your experience"
                      subtitle="The best place to start is with what’s true."
                      action={
                        <button
                          className="text-link"
                          onClick={() => importRef.current?.click()}
                        >
                          <Upload size={14} />
                          Import resume
                        </button>
                      }
                    >
                      {w.resumes.length > 0 && (
                        <Field label="Use a saved resume">
                          <select
                            value={d.resumeVersionId}
                            onChange={(e) => {
                              const r = w.resumes.find(
                                (r) => r.id === e.target.value,
                              );
                              if (r)
                                patchDraft({
                                  profile: r.parsedText,
                                  resumeVersionId: r.id,
                                });
                              else patchDraft({ resumeVersionId: "" });
                            }}
                          >
                            <option value="">Current profile</option>
                            {w.resumes.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}
                      <Field
                        label="Resume or profile"
                        hint="Paste your original experience. Drafts use only the text you provide."
                      >
                        <textarea
                          className="profile-textarea"
                          value={d.profile}
                          onChange={(e) =>
                            patchDraft({
                              profile: e.target.value,
                              resumeVersionId: "",
                            })
                          }
                          placeholder="Your projects, experience, skills, and accomplishments. Specific examples make stronger applications."
                        />
                      </Field>
                      <div className="form-grid">
                        <Field label="Your name (optional)">
                          <input
                            value={d.applicantName}
                            onChange={(e) =>
                              patchDraft({ applicantName: e.target.value })
                            }
                            placeholder="For your application materials"
                          />
                        </Field>
                        <Field label="Education (optional)">
                          <input
                            value={d.education}
                            onChange={(e) =>
                              patchDraft({ education: e.target.value })
                            }
                            placeholder="Your actual degree, school, and date"
                          />
                        </Field>
                      </div>
                      <div className="privacy-note">
                        <LockKeyhole size={14} />
                        <span>
                          Stays in your browser. No uploads to a server.
                        </span>
                      </div>
                    </Panel>
                    <div className="workflow-footer">
                      <span>
                        <Check size={15} />
                        {demo ? "Demo changes stay in this session" : saveState}
                      </span>
                      <Button disabled={!ready} onClick={() => goStep(1)}>
                        See how you fit
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </div>
                )}
                {step === 1 &&
                  (ready ? (
                    <>
                      <div className="analysis-grid">
                        <Panel className="fit-panel">
                          <div className="fit-heading">
                            <span className="eyebrow">THE CONNECTION</span>
                            <span className="pill muted">
                              {analysis.seniority}
                            </span>
                          </div>
                          <div className="fit-body">
                            <div
                              className="score-ring"
                              style={
                                {
                                  "--score": `${analysis.score}%`,
                                } as React.CSSProperties
                              }
                            >
                              <strong>
                                {analysis.score}
                                <span>%</span>
                              </strong>
                            </div>
                            <div>
                              <h2>
                                {analysis.score >= w.preferences.minimumScore
                                  ? "There’s a connection here."
                                  : "A few connections to build."}
                              </h2>
                              <p>
                                {analysis.matchedSkills.length} of{" "}
                                {analysis.requiredSkills.length} detected skills
                                appear in your experience.
                              </p>
                              <small>
                                Text overlap, not a prediction of hiring
                                success.
                              </small>
                            </div>
                          </div>
                          <div className="score-explanation">
                            {analysis.requiredSkills.length
                              ? "75% skill coverage + 25% keyword coverage"
                              : "Keyword coverage · no recognized skills detected"}
                            <span>Local analysis</span>
                          </div>
                        </Panel>
                        <Panel
                          title="Where to focus"
                          subtitle="A stronger application starts with specific evidence."
                        >
                          {analysis.focusAreas.length ? (
                            <ul className="focus-list">
                              {analysis.focusAreas.map((f, i) => (
                                <li key={f}>
                                  <span>{String(i + 1).padStart(2, "0")}</span>
                                  {f}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <div className="positive-note">
                              <CheckCheck size={24} />
                              <p>
                                Your profile covers the detected skills. Choose
                                your clearest examples and explain your
                                contribution.
                              </p>
                            </div>
                          )}
                        </Panel>
                      </div>
                      <div className="two-column">
                        <Panel
                          title="Skill coverage"
                          subtitle="What’s supported, and what needs a closer look."
                        >
                          <div className="skill-list">
                            {analysis.requiredSkills.length ? (
                              analysis.requiredSkills.map((s) => (
                                <div key={s.label}>
                                  <span>
                                    {s.inProfile ? (
                                      <Check size={15} />
                                    ) : (
                                      <Plus size={15} />
                                    )}
                                    {s.label}
                                  </span>
                                  <small
                                    className={
                                      s.inProfile ? "supported" : "gap"
                                    }
                                  >
                                    {s.inProfile
                                      ? "In your profile"
                                      : "Find evidence"}
                                  </small>
                                </div>
                              ))
                            ) : (
                              <p className="muted-copy">
                                No recognized skills found. Compare this job’s
                                requirements manually.
                              </p>
                            )}
                          </div>
                        </Panel>
                        <Panel
                          title="Language worth noticing"
                          subtitle="Use these words only where they fit your actual work."
                        >
                          <div className="tag-list">
                            {analysis.keywords.map((k) => (
                              <span
                                className={`tag ${k.inProfile ? "matched" : ""}`}
                                key={k.term}
                              >
                                {k.inProfile && <Check size={12} />}
                                {k.term}
                              </span>
                            ))}
                          </div>
                          <div className="legend">
                            <span>
                              <i className="legend-dot matched" />
                              Already in your profile
                            </span>
                            <span>
                              <i className="legend-dot" />
                              Worth reviewing
                            </span>
                          </div>
                        </Panel>
                      </div>
                      <div className="workflow-footer">
                        <Button variant="secondary" onClick={() => goStep(0)}>
                          Back to your inputs
                        </Button>
                        <Button
                          onClick={generated ? () => goStep(2) : generate}
                        >
                          {generated
                            ? "Review your materials"
                            : "Create application drafts"}
                          <ArrowRight size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Panel>
                      <Empty
                        icon={<Target size={27} />}
                        title="Let’s find the connection."
                        description="Add your experience and a job description to see how they fit together."
                        action={
                          <Button onClick={() => goStep(0)}>
                            Add your details <ArrowRight size={15} />
                          </Button>
                        }
                      />
                    </Panel>
                  ))}
                {step === 2 &&
                  (generated && d.materials ? (
                    <>
                      <div
                        className={`review-banner ${approved ? "approved" : ""}`}
                      >
                        <span className="review-icon">
                          {approved ? (
                            <CheckCheck size={22} />
                          ) : (
                            <ClipboardCheck size={22} />
                          )}
                        </span>
                        <div>
                          <strong>
                            {approved
                              ? "Reviewed, approved, and ready for your next step."
                              : "A starting point. Make it sound like you."}
                          </strong>
                          <p>
                            {approved
                              ? "Approval applies to these exact materials. Editing them will require a new review."
                              : "These drafts select original experience from your profile. Edit the wording, check every claim, and add your own motivation."}
                          </p>
                        </div>
                        <Button
                          variant={approved ? "secondary" : "primary"}
                          onClick={() => {
                            patchDraft({
                              approvedPackage: approved
                                ? undefined
                                : packageFingerprint(d),
                            });
                            notice(
                              approved
                                ? "Package marked for another review."
                                : "This exact package is approved. Save it to your tracker.",
                            );
                          }}
                        >
                          {approved ? "Review again" : "Approve this package"}
                          {approved ? (
                            <Check size={15} />
                          ) : (
                            <CheckCheck size={16} />
                          )}
                        </Button>
                      </div>
                      <div className="materials-grid">
                        <Panel
                          title="Your resume draft"
                          subtitle="Selected experience, in your original words."
                          action={
                            <div className="action-row">
                              <IconButton
                                label="Copy resume"
                                onClick={() => copy(d.materials!.resume)}
                              >
                                <Copy size={16} />
                              </IconButton>
                              <IconButton
                                label="Download resume"
                                onClick={() =>
                                  downloadFile(
                                    d.materials!.resume,
                                    "tailored-resume.txt",
                                  )
                                }
                              >
                                <Download size={16} />
                              </IconButton>
                            </div>
                          }
                        >
                          <textarea
                            aria-label="Edit resume draft"
                            className="document-editor"
                            value={d.materials.resume}
                            onChange={(e) =>
                              patchDraft({
                                materials: {
                                  ...d.materials!,
                                  resume: e.target.value,
                                },
                              })
                            }
                          />
                        </Panel>
                        <Panel
                          title="Your cover letter"
                          subtitle="Add your own reason for wanting to join the team."
                          action={
                            <div className="action-row">
                              <IconButton
                                label="Copy cover letter"
                                onClick={() => copy(d.materials!.letter)}
                              >
                                <Copy size={16} />
                              </IconButton>
                              <IconButton
                                label="Download cover letter"
                                onClick={() =>
                                  downloadFile(
                                    d.materials!.letter,
                                    "cover-letter.txt",
                                  )
                                }
                              >
                                <Download size={16} />
                              </IconButton>
                            </div>
                          }
                        >
                          <textarea
                            aria-label="Edit cover letter draft"
                            className="document-editor"
                            value={d.materials.letter}
                            onChange={(e) =>
                              patchDraft({
                                materials: {
                                  ...d.materials!,
                                  letter: e.target.value,
                                },
                              })
                            }
                          />
                        </Panel>
                      </div>
                      <details className="prep-details">
                        <summary>
                          <BookOpen size={17} />A little preparation for what
                          comes next
                          <ChevronDown size={16} />
                        </summary>
                        <div className="two-column">
                          <div>
                            <h3>Start a conversation</h3>
                            <p>{analysis.outreachNote}</p>
                            <Button
                              variant="secondary"
                              onClick={() => copy(analysis.outreachNote)}
                            >
                              <Copy size={14} />
                              Copy outreach note
                            </Button>
                          </div>
                          <div>
                            <h3>Get ready to tell your story</h3>
                            <ul className="simple-list">
                              {analysis.interviewPrompts.map((p) => (
                                <li key={p}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </details>
                      <div className="workflow-footer">
                        <Button
                          variant="secondary"
                          onClick={() => window.print()}
                        >
                          <Printer size={16} />
                          Print / save PDF
                        </Button>
                        <div className="action-row">
                          <Button variant="ghost" onClick={generate}>
                            Reset drafts from profile
                          </Button>
                          <Button onClick={saveApplication}>
                            <FileCheck2 size={16} />
                            Save package to tracker
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <Panel>
                      <Empty
                        icon={<FileText size={27} />}
                        title={
                          d.materials
                            ? "Your inputs have changed."
                            : "Make a first draft, then make it yours."
                        }
                        description={
                          d.materials
                            ? "Generate fresh drafts so the materials match your latest opportunity and profile."
                            : "Add your experience and a job description. We’ll organize the relevant experience into editable drafts."
                        }
                        action={
                          <Button onClick={generate} disabled={!ready}>
                            Create application drafts <ArrowRight size={15} />
                          </Button>
                        }
                      />
                    </Panel>
                  ))}
              </div>
            </>
          )}
          {view === "applications" && (
            <>
              <PageHeading
                eyebrow="KEEP THE BIG PICTURE IN VIEW"
                title="Good things in motion."
                description="Every opportunity, follow-up, and next step. All in one place."
                action={
                  <div className="action-row">
                    <Button
                      variant="secondary"
                      disabled={!w.applications.length}
                      onClick={() =>
                        downloadFile(
                          exportCsv(w.applications),
                          "applications.csv",
                          "text/csv",
                        )
                      }
                    >
                      <ArrowDownToLine size={16} />
                      Export CSV
                    </Button>
                    <Button onClick={startNew}>
                      <Plus size={16} />
                      Add application
                    </Button>
                  </div>
                }
              />
              <div className="pipeline-summary">
                {statuses
                  .filter((s) => s !== "Closed")
                  .map((status) => (
                    <button
                      key={status}
                      className={filter === status ? "active" : ""}
                      onClick={() =>
                        setFilter(filter === status ? "All statuses" : status)
                      }
                    >
                      <span>{status}</span>
                      <strong>
                        {
                          w.applications.filter((a) => a.status === status)
                            .length
                        }
                      </strong>
                      <i
                        className={`pipeline-dot status-${status.toLowerCase()}`}
                      />
                    </button>
                  ))}
              </div>
              <Panel className="tracker-panel">
                <div className="tracker-toolbar">
                  <label className="search-field">
                    <Search size={17} />
                    <input
                      aria-label="Search applications"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search company, role, or notes…"
                    />
                    {search && (
                      <IconButton
                        label="Clear search"
                        onClick={() => setSearch("")}
                      >
                        <X size={14} />
                      </IconButton>
                    )}
                  </label>
                  <div className="action-row">
                    <label className="select-filter">
                      <ListFilter size={15} />
                      <select
                        aria-label="Filter application status"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                      >
                        <option>All statuses</option>
                        {statuses.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                    <select
                      aria-label="Sort applications"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Recently updated</option>
                      <option value="score">Highest match</option>
                      <option value="deadline">Upcoming deadline</option>
                    </select>
                  </div>
                </div>
                {visibleApplications.length ? (
                  <RoleTable
                    applications={visibleApplications}
                    onSelect={setSelectedId}
                  />
                ) : (
                  <Empty
                    title={
                      w.applications.length
                        ? "No opportunities match this view."
                        : "Your next opportunity belongs here."
                    }
                    description={
                      w.applications.length
                        ? "Try a different search or status filter."
                        : "Start with one role you’re excited about. You can keep its details, materials, and next steps together."
                    }
                    action={
                      <Button
                        variant="secondary"
                        onClick={() =>
                          w.applications.length
                            ? (setSearch(""), setFilter("All statuses"))
                            : startNew()
                        }
                      >
                        {w.applications.length
                          ? "Clear filters"
                          : "Add your first application"}
                        <ArrowRight size={15} />
                      </Button>
                    }
                  />
                )}
                <div className="table-footer">
                  <span>
                    {visibleApplications.length} of {w.applications.length}{" "}
                    opportunities
                  </span>
                  <span>
                    <LockKeyhole size={12} />
                    Private to this browser
                  </span>
                </div>
              </Panel>
            </>
          )}
          {view === "resumes" && (
            <>
              <PageHeading
                eyebrow="START WITH YOUR STORY"
                title="Experience worth keeping."
                description="Your resume versions, original experience, and the evidence behind it."
                action={
                  <Button onClick={() => importRef.current?.click()}>
                    <Upload size={16} />
                    Import resume
                  </Button>
                }
              />
              <div className="library-grid">
                <Panel
                  title="Your resume library"
                  subtitle={`${w.resumes.length} saved version${w.resumes.length === 1 ? "" : "s"} · .tex and .txt supported`}
                >
                  {w.resumes.length ? (
                    <div className="resume-list">
                      {w.resumes.map((r) => (
                        <div className="resume-card" key={r.id}>
                          <div className="resume-icon">
                            <FileText size={23} strokeWidth={1.4} />
                          </div>
                          <div>
                            <h3>{r.name}</h3>
                            <p>
                              {r.sourceType === "latex"
                                ? "LaTeX import"
                                : "Text profile"}{" "}
                              ·{" "}
                              {r.parsedText.split(/\s+/).filter(Boolean).length}{" "}
                              words
                            </p>
                            <small>
                              Saved{" "}
                              {new Date(r.parsedAt).toLocaleDateString(
                                undefined,
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </small>
                          </div>
                          <div className="resume-actions">
                            <Button
                              variant="secondary"
                              onClick={() => {
                                patchDraft({
                                  profile: r.parsedText,
                                  resumeVersionId: r.id,
                                });
                                notice(
                                  "Resume loaded into your application profile.",
                                );
                              }}
                            >
                              {d.resumeVersionId === r.id ? (
                                <>
                                  <Check size={14} />
                                  In use
                                </>
                              ) : (
                                "Use profile"
                              )}
                            </Button>
                            <IconButton
                              label={`Download ${r.name}`}
                              onClick={() =>
                                downloadFile(
                                  r.rawContent,
                                  `${r.name.replace(/[^a-z0-9_-]/gi, "-")}.${r.sourceType === "latex" ? "tex" : "txt"}`,
                                )
                              }
                            >
                              <Download size={16} />
                            </IconButton>
                            <IconButton
                              label={`Delete ${r.name}`}
                              onClick={() => {
                                update((old) => ({
                                  ...old,
                                  resumes: old.resumes.filter(
                                    (item) => item.id !== r.id,
                                  ),
                                  draft:
                                    old.draft.resumeVersionId === r.id
                                      ? { ...old.draft, resumeVersionId: "" }
                                      : old.draft,
                                }));
                                notice(
                                  "Resume version removed. Your current profile is kept.",
                                  () =>
                                    update((old) => ({
                                      ...old,
                                      resumes: [r, ...old.resumes],
                                    })),
                                );
                              }}
                            >
                              <Trash2 size={15} />
                            </IconButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <button
                      className="upload-zone"
                      onClick={() => importRef.current?.click()}
                    >
                      <span>
                        <Upload size={24} strokeWidth={1.4} />
                      </span>
                      <strong>A good place for your experience.</strong>
                      <p>Choose a .tex or .txt resume to get started.</p>
                      <small>
                        Up to 2 MB · Parsed right here in your browser
                      </small>
                    </button>
                  )}
                  <div className="privacy-note">
                    <ShieldCheck size={15} />
                    <span>
                      Files stay on this device. Export a backup to keep your
                      library safe.
                    </span>
                  </div>
                </Panel>
                <Panel
                  title="Your working profile"
                  subtitle="Edit the extracted text or write your experience here."
                >
                  <Field label="Original experience">
                    <textarea
                      className="library-profile"
                      value={d.profile}
                      onChange={(e) =>
                        patchDraft({
                          profile: e.target.value,
                          resumeVersionId: "",
                        })
                      }
                      placeholder="Paste your projects, work experience, and accomplishments…"
                    />
                  </Field>
                  <Field label="Version name">
                    <input
                      value={resumeName}
                      onChange={(e) => setResumeName(e.target.value)}
                      placeholder="e.g. Software engineering · November"
                      maxLength={160}
                    />
                  </Field>
                  <Button
                    disabled={!d.profile.trim() || !resumeName.trim()}
                    onClick={saveResume}
                  >
                    <Plus size={15} />
                    Save a new version
                  </Button>
                </Panel>
              </div>
              <Panel
                title="The evidence behind your experience"
                subtitle="Keep claims connected to something real: a project, a result, or a source."
              >
                <div className="evidence-form">
                  <Field label="Experience or claim">
                    <input
                      value={evidenceClaim}
                      onChange={(e) => setEvidenceClaim(e.target.value)}
                      placeholder="e.g. Built a Python data pipeline"
                    />
                  </Field>
                  <Field label="Where’s the evidence?">
                    <input
                      value={evidenceSource}
                      onChange={(e) => setEvidenceSource(e.target.value)}
                      placeholder="Project link, notes, or a reference"
                    />
                  </Field>
                  <Button
                    disabled={!evidenceClaim.trim() || !evidenceSource.trim()}
                    onClick={() => {
                      update((old) => ({
                        ...old,
                        evidence: [
                          {
                            id: crypto.randomUUID(),
                            claim: evidenceClaim.trim(),
                            source: evidenceSource.trim(),
                            status: "Needs proof",
                          },
                          ...old.evidence,
                        ],
                      }));
                      setEvidenceClaim("");
                      setEvidenceSource("");
                      notice("Evidence added for review.");
                    }}
                  >
                    <Plus size={15} />
                    Add evidence
                  </Button>
                </div>
                {w.evidence.length ? (
                  <div className="evidence-list">
                    {w.evidence.map((item) => (
                      <div className="evidence-row" key={item.id}>
                        <div>
                          <strong>{item.claim}</strong>
                          <small>
                            {item.source ||
                              "Add a proof source before confirming"}
                          </small>
                        </div>
                        <select
                          aria-label={`Evidence status for ${item.claim}`}
                          value={item.status}
                          onChange={(e) =>
                            update((old) => ({
                              ...old,
                              evidence: old.evidence.map((i) =>
                                i.id === item.id
                                  ? {
                                      ...i,
                                      status: e.target
                                        .value as typeof item.status,
                                    }
                                  : i,
                              ),
                            }))
                          }
                        >
                          <option>Needs proof</option>
                          <option disabled={!item.source.trim()}>
                            Confirmed
                          </option>
                          <option>Rejected</option>
                        </select>
                        <IconButton
                          label={`Delete evidence: ${item.claim}`}
                          onClick={() => {
                            update((old) => ({
                              ...old,
                              evidence: old.evidence.filter(
                                (i) => i.id !== item.id,
                              ),
                            }));
                            notice("Evidence removed.", () =>
                              update((old) => ({
                                ...old,
                                evidence: [item, ...old.evidence],
                              })),
                            );
                          }}
                        >
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="evidence-empty">
                    A little proof goes a long way. Add the work you want to
                    remember.
                  </p>
                )}
              </Panel>
            </>
          )}
          {view === "preferences" && (
            <>
              <PageHeading
                eyebrow="A SEARCH THAT FITS YOUR LIFE"
                title="A little more direction."
                description="Define what a good opportunity looks like for you."
              />
              <div className="two-column">
                <Panel
                  title="What you’re looking for"
                  subtitle="Saved automatically in this browser."
                >
                  <div className="preference-fields">
                    {(
                      [
                        {
                          key: "targetRoles",
                          label: "Target roles",
                          placeholder:
                            "Software Engineer, Machine Learning Engineer",
                        },
                        {
                          key: "locations",
                          label: "Locations",
                          placeholder: "Toronto, Waterloo, Remote",
                        },
                        {
                          key: "jobTypes",
                          label: "Opportunity types",
                          placeholder: "Internship, co-op, new graduate",
                        },
                        {
                          key: "companyPriority",
                          label: "What matters in a company",
                          placeholder:
                            "The teams, culture, and work you care about",
                        },
                      ] as const
                    ).map((f) => (
                      <Field label={f.label} key={f.key}>
                        <textarea
                          value={w.preferences[f.key]}
                          placeholder={f.placeholder}
                          rows={2}
                          onChange={(e) =>
                            update((old) => ({
                              ...old,
                              preferences: {
                                ...old.preferences,
                                [f.key]: e.target.value,
                              },
                            }))
                          }
                        />
                      </Field>
                    ))}
                    <Field
                      label={`Your shortlist threshold · ${w.preferences.minimumScore}%`}
                      hint="Used as a reference in your fit analysis. You can save any role."
                    >
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={w.preferences.minimumScore}
                        onChange={(e) =>
                          update((old) => ({
                            ...old,
                            preferences: {
                              ...old.preferences,
                              minimumScore: Number(e.target.value),
                            },
                          }))
                        }
                      />
                    </Field>
                  </div>
                </Panel>
                <div className="stack">
                  <Panel
                    title="You’re always in the loop"
                    subtitle="A deliberate process, from first look to final review."
                  >
                    <ol className="review-steps">
                      <li>
                        <Search size={17} />
                        <span>
                          <strong>Find opportunities</strong>
                          <p>
                            Search your preferred job boards and bring a posting
                            into the workspace.
                          </p>
                        </span>
                      </li>
                      <li>
                        <Sparkles size={17} />
                        <span>
                          <strong>Connect your experience</strong>
                          <p>
                            Compare the role, select relevant work, and
                            personalize your drafts.
                          </p>
                        </span>
                      </li>
                      <li>
                        <ShieldCheck size={17} />
                        <span>
                          <strong>Review before applying</strong>
                          <p>
                            Approve the exact materials, then apply on the
                            company’s website.
                          </p>
                        </span>
                      </li>
                    </ol>
                    <div className="honest-note">
                      This workspace works locally. It doesn’t search on a
                      schedule, use a language model, fill forms, or submit
                      applications.
                    </div>
                    <a
                      className="button secondary"
                      href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(w.preferences.targetRoles)}&location=${encodeURIComponent(w.preferences.locations)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Search roles on LinkedIn
                      <ExternalLink size={14} />
                    </a>
                  </Panel>
                  <Panel
                    title="Keep your work with you"
                    subtitle="Your data lives in this browser, not an account."
                  >
                    <p className="muted-copy">
                      Export a complete backup of your applications, resume
                      versions, profile, and preferences. Treat it as a private
                      file.
                    </p>
                    <div className="action-row backup-actions">
                      <Button
                        variant="secondary"
                        onClick={() =>
                          downloadFile(
                            JSON.stringify(w, null, 2),
                            "career-agent-backup.json",
                            "application/json",
                          )
                        }
                      >
                        <Download size={15} />
                        Export backup
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => backupRef.current?.click()}
                      >
                        <Upload size={15} />
                        Restore backup
                      </Button>
                    </div>
                  </Panel>
                </div>
              </div>
            </>
          )}
          <footer className="workspace-footer">
            <span>
              <Leaf size={13} />A little direction. A next step.
            </span>
            <span>Built around your experience.</span>
          </footer>
        </main>
      </div>
      <input
        ref={importRef}
        type="file"
        accept=".tex,.txt"
        className="sr-only"
        aria-label="Import resume file"
        onChange={(e) => {
          importResume(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={backupRef}
        type="file"
        accept=".json"
        className="sr-only"
        aria-label="Restore workspace backup file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            notice("Choose a backup smaller than 10 MB.");
            return;
          }
          try {
            setRestore(validateWorkspace(JSON.parse(await file.text())));
          } catch (error) {
            notice(
              error instanceof Error
                ? error.message
                : "This backup could not be read.",
            );
          }
        }}
      />
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
          <IconButton
            label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </IconButton>
        </div>
      )}
      {selected && (
        <Modal title="Opportunity details" onClose={() => setSelectedId(null)}>
          <div className="detail-company">
            <CompanyMark company={selected.company} size="large" />
            <div>
              <span>{selected.company}</span>
              <h3>{selected.role}</h3>
            </div>
          </div>
          <div className="detail-metrics">
            <StatusBadge status={selected.status} />
            <span>{selected.score}% match</span>
            <Deadline date={selected.deadline} />
          </div>
          <div className="form-grid">
            <Field label="Application status">
              <select
                value={selected.status}
                onChange={(e) =>
                  updateApplication(selected.id, {
                    status: e.target.value as ApplicationStatus,
                  })
                }
              >
                {statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Deadline">
              <input
                type="date"
                value={selected.deadline}
                onChange={(e) =>
                  updateApplication(selected.id, { deadline: e.target.value })
                }
              />
            </Field>
            <Field label="Contact">
              <input
                value={selected.contact}
                placeholder="Recruiter or contact"
                onChange={(e) =>
                  updateApplication(selected.id, { contact: e.target.value })
                }
              />
            </Field>
            <Field label="Next step">
              <input
                value={selected.nextAction}
                onChange={(e) =>
                  updateApplication(selected.id, { nextAction: e.target.value })
                }
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              rows={3}
              value={selected.notes}
              onChange={(e) =>
                updateApplication(selected.id, { notes: e.target.value })
              }
              placeholder="Keep the little details here."
            />
          </Field>
          {selected.draft?.materials && (
            <div className="detail-package">
              <FileCheck2 size={17} />
              {isApproved(selected.draft)
                ? "Package reviewed and approved"
                : "Draft materials saved"}
              <button
                className="text-link"
                onClick={() => {
                  downloadFile(
                    `RESUME\n\n${selected.draft!.materials!.resume}\n\nCOVER LETTER\n\n${selected.draft!.materials!.letter}`,
                    `${selected.company.replace(/[^a-z0-9]/gi, "-")}-application.txt`,
                  );
                }}
              >
                Download
                <Download size={14} />
              </button>
            </div>
          )}
          <div className="modal-actions">
            <IconButton
              label="Remove application"
              onClick={() => removeApplication(selected)}
            >
              <Trash2 size={17} />
            </IconButton>
            <div className="action-row">
              {safeUrl(selected.url) && (
                <a
                  className="button secondary"
                  href={safeUrl(selected.url)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Job posting
                  <ExternalLink size={14} />
                </a>
              )}
              <Button onClick={() => openApplication(selected)}>
                Open workspace
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {help && (
        <Modal
          title="A little help along the way"
          onClose={() => setHelp(false)}
        >
          <div className="help-content">
            <p>Career Agent keeps your job search in one calm workspace.</p>
            <StepLink
              number="01"
              title="Add your experience"
              text="Import a .tex or .txt resume, or paste a profile."
              onClick={() => {
                setHelp(false);
                navigate("resumes");
              }}
            />
            <StepLink
              number="02"
              title="Bring a job description"
              text="See the skill and keyword overlap with your experience."
              onClick={() => {
                setHelp(false);
                navigate("tailor");
                goStep(0);
              }}
            />
            <StepLink
              number="03"
              title="Make the drafts yours"
              text="Edit, review, and save your exact application package."
              onClick={() => {
                setHelp(false);
                navigate("tailor");
                goStep(2);
              }}
            />
            <div className="honest-note">
              Analysis uses local text matching. Drafts select your existing
              experience; they don’t invent achievements. No data is sent to an
              AI service, and nothing is submitted for you.
            </div>
            <p className="muted-copy">
              Browser data can be cleared by your browser. Export a backup in
              Preferences to keep a private copy.
            </p>
          </div>
        </Modal>
      )}
      {restore && (
        <Modal title="Restore this workspace?" onClose={() => setRestore(null)}>
          <p className="muted-copy">
            This backup contains {restore.applications.length} applications and{" "}
            {restore.resumes.length} resume versions. It will replace{" "}
            {demo ? "the demo workspace" : "your current workspace"}. Download a
            backup first if you want to keep both.
          </p>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() =>
                downloadFile(
                  JSON.stringify(w, null, 2),
                  "career-agent-before-restore.json",
                  "application/json",
                )
              }
            >
              <Download size={15} />
              Back up current
            </Button>
            <Button
              onClick={() => {
                const previous = w;
                update(() => restore);
                setRestore(null);
                notice("Workspace restored.", () => update(() => previous));
              }}
            >
              Restore workspace
            </Button>
          </div>
        </Modal>
      )}
      <section
        className="print-package"
        aria-label="Printable application materials"
      >
        <article className="print-page">
          <pre>{d.materials?.resume}</pre>
        </article>
        <article className="print-page">
          <pre>{d.materials?.letter}</pre>
        </article>
      </section>
    </div>
  );
}
export default App;
