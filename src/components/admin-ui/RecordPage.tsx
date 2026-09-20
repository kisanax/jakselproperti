import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function RecordPage({ children }: { children: ReactNode }) {
  return <div className="ui-record-page">{children}</div>;
}

export function RecordHeader({
  eyebrow,
  title,
  subtitle,
  backHref,
  status,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backHref?: string;
  status?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="ui-record-header">
      <div className="ui-record-header__main">
        {backHref && (
          <Link className="ui-record-header__back" href={backHref} aria-label="Kembali">
            <ArrowLeft size={20} />
          </Link>
        )}
        <div className="ui-record-header__identity">
          {eyebrow && <span className="ui-record-header__eyebrow">{eyebrow}</span>}
          <div className="ui-record-header__title-row">
            <h1>{title}</h1>
            {status}
          </div>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="ui-record-header__actions">{actions}</div>}
    </header>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="ui-form-section">
      <div className="ui-form-section__heading">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      <div className="ui-form-section__body">{children}</div>
    </section>
  );
}
