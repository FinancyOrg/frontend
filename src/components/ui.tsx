import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import { AlertCircle, ArrowUpRight, Droplets, RefreshCw } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  meta,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {meta}
        {description && <p className="page-description">{description}</p>}
      </div>
      {action && <div className="page-header-action">{action}</div>}
    </header>
  );
}

export function Card({
  children,
  className = "",
  as: Element = "section",
  ...rest
}: PropsWithChildren<
  {
    className?: string;
    as?: "section" | "div" | "article";
  } & HTMLAttributes<HTMLElement>
>) {
  return (
    <Element className={`card ${className}`} {...rest}>
      {children}
    </Element>
  );
}

export function SectionHeading({
  title,
  detail,
}: {
  title: string;
  detail?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {detail && <span>{detail}</span>}
    </div>
  );
}

export function Stat({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "positive" | "negative" | "accent";
}) {
  return (
    <div className={`stat stat-${tone}`}>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
      {detail && <span className="stat-detail">{detail}</span>}
    </div>
  );
}

export function Tag({
  children,
  tone = "neutral",
}: PropsWithChildren<{ tone?: "neutral" | "positive" | "negative" | "accent" }>) {
  return <span className={`tag tag-${tone}`}>{children}</span>;
}

export function LiquidMark({ size = 15 }: { size?: number }) {
  return (
    <span className="liquid-mark" title="Liquid" aria-label="Liquid">
      <Droplets size={size} />
    </span>
  );
}

export function LoadingState({ label = "Loading your ledger…" }: { label?: string }) {
  return (
    <div className="state-card">
      <div className="loading-orb small" />
      <p>{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "This view could not load.",
  error,
  onRetry,
}: {
  title?: string;
  error: unknown;
  onRetry?: () => void;
}) {
  const message = error instanceof Error ? error.message : "Unexpected API error.";
  return (
    <div className="state-card state-error">
      <AlertCircle size={22} />
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
      {onRetry && (
        <button className="button button-secondary" onClick={onRetry}>
          <RefreshCw size={16} /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <ArrowUpRight size={22} />
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function ProgressBar({ value, good }: { value: number; good: boolean }) {
  return (
    <div className="progress-track" aria-label={`${Math.round(value * 100)}% income balance`}>
      <span
        className={`progress-value ${good ? "progress-good" : "progress-low"}`}
        style={{ width: `${Math.max(3, Math.min(100, value * 100))}%` }}
      />
    </div>
  );
}

