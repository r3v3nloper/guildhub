import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

// Small shared building blocks, so pages stay readable and look alike.

const fieldClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900";

export function PageHeader({
  title,
  actions,
}: {
  title: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
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
    <section
      className={`rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 ${className}`}
    >
      {title && <h2 className="mb-3 font-semibold">{title}</h2>}
      {children}
    </section>
  );
}

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
  // Screen readers announce hint and error with the control; IDs derive from its name.
  const name =
    isValidElement<{ name?: string }>(children) && children.props.name;
  const hintId = name && hint ? `${name}-hint` : undefined;
  const errorId = name && error ? `${name}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = name
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {control}
      {hint && (
        <span
          id={hintId}
          className="text-xs text-amber-600 dark:text-amber-400"
        >
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} className={`${fieldClass} ${props.className ?? ""}`} />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      rows={3}
      {...props}
      className={`${fieldClass} ${props.className ?? ""}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={`${fieldClass} ${props.className ?? ""}`} />
  );
}

type ButtonVariant = "primary" | "secondary" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white",
  secondary: "border border-zinc-300 bg-transparent dark:border-zinc-700",
  danger: "bg-red-600 text-white",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="submit"
      {...props}
      className={`rounded-md px-3 py-1.5 text-sm font-medium active:opacity-80 disabled:opacity-50 ${buttonVariants[variant]} ${className}`}
    />
  );
}

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
      className={`inline-block rounded-md px-3 py-1.5 text-sm font-medium active:opacity-80 ${buttonVariants[variant]}`}
    >
      {children}
    </a>
  );
}

type BadgeTone = "neutral" | "warning" | "danger" | "accent";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-zinc-200 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  accent:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-200",
};

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs font-medium ${badgeTones[tone]}`}
    >
      {children}
    </span>
  );
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
    <p
      role="status"
      className={`text-sm ${state.ok ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
    >
      {state.message}
    </p>
  );
}
