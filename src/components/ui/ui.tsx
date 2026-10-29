import { Button as PrimeButton, type ButtonProps } from "primereact/button";
import { Card as PrimeCard } from "primereact/card";
import { InputText, type InputTextProps } from "primereact/inputtext";
import {
  InputTextarea,
  type InputTextareaProps,
} from "primereact/inputtextarea";
import { Message } from "primereact/message";
import { Tag } from "primereact/tag";
import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react";

// Shared building blocks on top of PrimeReact, so pages stay readable and look alike.
// The PrimeReact modules are client components; these wrappers pass only serialisable
// props, so server pages can use them directly.

export function PageHeader({
  title,
  eyebrow,
  meta,
  actions,
}: {
  title: string;
  /** Small line above the title, e.g. the date or the selected game. */
  eyebrow?: ReactNode;
  /** Below the title, e.g. chips with key facts. */
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1">
        {eyebrow && (
          <span className="text-sm font-semibold text-muted">{eyebrow}</span>
        )}
        <h1 className="font-display text-4xl leading-tight font-semibold text-white md:text-5xl">
          {title}
        </h1>
        {meta && <div className="mt-2 flex flex-wrap gap-2">{meta}</div>}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <PrimeCard title={title} className={className}>
      {children}
    </PrimeCard>
  );
}

/**
 * Label, hint and error around one control. IDs derive from the control's `name`, so
 * screen readers announce hint and error together with the field.
 */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  const name =
    isValidElement<{ name?: string; id?: string }>(children) &&
    children.props.name;
  const controlId = name ? `field-${name}` : undefined;
  const hintId = name && hint ? `${name}-hint` : undefined;
  const errorId = name && error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = name
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        invalid: Boolean(error),
      })
    : children;

  return (
    <div className="flex flex-col gap-1 text-sm">
      <label htmlFor={controlId} className="font-medium">
        {label}
      </label>
      {control}
      {hint && (
        <small id={hintId} className="text-muted">
          {hint}
        </small>
      )}
      {error && (
        <small id={errorId} className="text-danger">
          {error}
        </small>
      )}
    </div>
  );
}

export function TextInput({ className = "", ...props }: InputTextProps) {
  return <InputText {...props} className={`w-full ${className}`} />;
}

export function TextArea({ className = "", ...props }: InputTextareaProps) {
  return (
    <InputTextarea
      rows={3}
      autoResize
      {...props}
      className={`w-full ${className}`}
    />
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

const buttonVariants: Record<ButtonVariant, Partial<ButtonProps>> = {
  primary: {},
  secondary: { severity: "secondary", outlined: true },
  danger: { severity: "danger" },
};

export function Button({
  variant = "primary",
  children,
  type = "submit",
  ...props
}: Omit<ButtonProps, "severity" | "outlined"> & { variant?: ButtonVariant }) {
  return (
    <PrimeButton
      type={type}
      size="small"
      {...buttonVariants[variant]}
      {...props}
    >
      {children}
    </PrimeButton>
  );
}

const buttonLinkVariants: Record<ButtonVariant, string> = {
  primary: "",
  secondary: "p-button-secondary p-button-outlined",
  danger: "p-button-danger",
};

/** A link that looks like a button; a plain anchor, so it also works for downloads. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
}) {
  return (
    <a
      href={href}
      className={`p-button p-component p-button-sm no-underline ${buttonLinkVariants[variant]}`}
    >
      {children}
    </a>
  );
}

type BadgeTone = "neutral" | "warning" | "danger" | "accent";

const badgeSeverities = {
  neutral: "secondary",
  warning: "warning",
  danger: "danger",
  accent: undefined,
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return <Tag severity={badgeSeverities[tone]} value={children} />;
}

export function FormMessage({
  state,
}: {
  state: { message?: string; ok?: boolean } | undefined;
}) {
  if (!state?.message) {
    return null;
  }
  return (
    <Message
      role="status"
      severity={state.ok ? "success" : "error"}
      text={state.message}
    />
  );
}
