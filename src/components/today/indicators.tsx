import type { ReactNode } from "react";

type PillTone = "neutral" | "done" | "warning";

const pillTones: Record<PillTone, string> = {
  neutral: "bg-chip text-foreground",
  done: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
};

/** Value badge on the left of a task row, e.g. "3/5". */
export function ValuePill({
  tone = "neutral",
  children,
}: {
  tone?: PillTone;
  children: ReactNode;
}) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[13px] font-bold whitespace-nowrap tabular-nums ${pillTones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Tick box on the left of a task row. */
export function CheckMark({ done }: { done: boolean }) {
  return (
    <span
      className={`flex h-6.5 w-6.5 items-center justify-center rounded-[9px] border-2 transition-colors ${
        done
          ? "border-success bg-success text-on-accent"
          : "border-[#6a6290] bg-transparent"
      }`}
    >
      {done && <i className="pi pi-check text-xs font-bold" aria-hidden />}
    </span>
  );
}
