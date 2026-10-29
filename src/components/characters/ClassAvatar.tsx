/** Some class colours are dark blues; lifting them keeps the text readable. */
export function classTextColor(color: string | undefined | null): string {
  return color
    ? `color-mix(in srgb, ${color} 78%, white)`
    : "var(--gh-accent-strong)";
}

/** The character's initial on a tile in the class colour. */
export function ClassAvatar({
  initial,
  color,
  size = "md",
}: {
  initial: string;
  color: string | undefined | null;
  size?: "md" | "lg";
}) {
  const tint = color ?? "var(--gh-accent)";
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center border font-display font-semibold ${
        size === "lg"
          ? "h-19 w-19 rounded-[22px] text-[38px]"
          : "h-11.5 w-11.5 rounded-[14px] text-[22px]"
      }`}
      style={{
        color: classTextColor(color),
        borderColor: `color-mix(in srgb, ${tint} 40%, transparent)`,
        backgroundColor: `color-mix(in srgb, ${tint} 12%, transparent)`,
      }}
    >
      {initial}
    </span>
  );
}
