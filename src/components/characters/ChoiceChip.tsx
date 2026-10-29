import type { ReactNode } from "react";

/**
 * A toggle chip or tile for one choice (race, class, spec, profession). A real button
 * with aria-pressed, so keyboard and screen readers treat it as a choice.
 */
export function ChoiceChip({
  active,
  disabled = false,
  onClick,
  title,
  shape = "chip",
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  title?: string;
  /** "chip": round, inline; "tile": larger block for grids. */
  shape?: "chip" | "tile";
  children: ReactNode;
}) {
  const base =
    shape === "chip"
      ? "min-h-10 rounded-full px-3.5 text-[13.5px]"
      : "flex min-h-12 items-center gap-2.5 rounded-2xl px-3 text-left text-sm";
  const tone = disabled
    ? "cursor-not-allowed border-dashed border-[#2c2645] bg-transparent text-[#8f88aa]"
    : active
      ? "border-[#6e58c8] bg-accent-soft font-bold text-white"
      : "border-[#2c2645] bg-raised font-semibold text-foreground hover:border-[#3a3358]";
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={`border ${base} ${tone}`}
    >
      {children}
    </button>
  );
}
