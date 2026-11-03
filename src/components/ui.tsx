import {
  ArrowRight,
  ArrowUpRight,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  X,
} from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { ApplicationRecord, ApplicationStatus } from "../lib/workspace";
import { daysUntil } from "../lib/workspace";
export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  return (
    <button
      className={`button ${variant} ${className}`}
      type="button"
      {...props}
    >
      {children}
    </button>
  );
}
export function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className="icon-button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export function Panel({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="panel-heading">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Empty({
  icon = <BriefcaseBusiness size={26} strokeWidth={1.4} />,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <span className={`status-badge status-${status.toLowerCase()}`}>
      <i />
      {status}
    </span>
  );
}
export function CompanyMark({
  company,
  size = "",
}: {
  company: string;
  size?: string;
}) {
  return (
    <span
      className={`company-mark color-${[...company].reduce((n, c) => n + c.charCodeAt(0), 0) % 5} ${size}`}
    >
      {company.trim().slice(0, 1).toUpperCase() || "?"}
    </span>
  );
}
export function Deadline({ date }: { date: string }) {
  const days = daysUntil(date);
  return (
    <span
      className={days !== null && days <= 3 ? "deadline urgent" : "deadline"}
    >
      {days === null
        ? "No deadline"
        : days < 0
          ? `${Math.abs(days)}d overdue`
          : days === 0
            ? "Today"
            : days === 1
              ? "Tomorrow"
              : new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
    </span>
  );
}
export function RoleTable({
  applications,
  onSelect,
  compact = false,
}: {
  applications: ApplicationRecord[];
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`role-table ${compact ? "compact" : ""}`}>
      <div className="role-table-head">
        <span>Opportunity</span>
        <span>Match</span>
        <span>Status</span>
        <span>Deadline</span>
        <span />
      </div>
      {applications.map((a) => (
        <button className="role-row" key={a.id} onClick={() => onSelect(a.id)}>
          <span className="role-identity">
            <CompanyMark company={a.company} />
            <span>
              <strong>{a.role}</strong>
              <small>{a.company}</small>
            </span>
          </span>
          <span className="match-value">
            {a.score}
            <small>%</small>
          </span>
          <StatusBadge status={a.status} />
          <Deadline date={a.deadline} />
          <ChevronRight size={16} className="row-chevron" />
        </button>
      ))}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function StepLink({
  number,
  title,
  text,
  onClick,
  done,
}: {
  number: string;
  title: string;
  text: string;
  onClick: () => void;
  done?: boolean;
}) {
  return (
    <button className="step-link" onClick={onClick}>
      <span className={`step-number ${done ? "done" : ""}`}>
        {done ? <Check size={16} /> : number}
      </span>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
      <ArrowUpRight size={17} />
    </button>
  );
}
export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button className="text-link" onClick={onClick}>
      {children}
      <ArrowRight size={14} />
    </button>
  );
}
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const items = () =>
      Array.from(
        dialog.current?.querySelectorAll<HTMLElement>(
          'button, a[href], input, select, textarea, [tabindex="0"]',
        ) || [],
      ).filter((element) => !element.hasAttribute("disabled"));
    items()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = items();
      const first = focusable[0],
        last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, []);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`modal ${wide ? "wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <IconButton label="Close dialog" onClick={onClose}>
            <X size={19} />
          </IconButton>
        </div>
        {children}
      </section>
    </div>
  );
}
