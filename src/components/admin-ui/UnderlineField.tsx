import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type SharedProps = {
  label: string;
  hint?: string;
  error?: string;
};

export function UnderlineField({
  label,
  hint,
  error,
  className,
  ...props
}: SharedProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  const helpId = id ? `${id}-help` : undefined;

  return (
    <label className={["ui-field", error && "ui-field--error", className].filter(Boolean).join(" ")}>
      <span className="ui-field__label">{label}</span>
      <input
        {...props}
        id={id}
        className="ui-field__control"
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? helpId : undefined}
      />
      {(error || hint) && (
        <span className="ui-field__help" id={helpId}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

export function UnderlineTextarea({
  label,
  hint,
  error,
  className,
  ...props
}: SharedProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = props.id ?? props.name;
  const helpId = id ? `${id}-help` : undefined;

  return (
    <label className={["ui-field", error && "ui-field--error", className].filter(Boolean).join(" ")}>
      <span className="ui-field__label">{label}</span>
      <textarea
        {...props}
        id={id}
        className="ui-field__control ui-field__control--textarea"
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? helpId : undefined}
      />
      {(error || hint) && (
        <span className="ui-field__help" id={helpId}>
          {error ?? hint}
        </span>
      )}
    </label>
  );
}
