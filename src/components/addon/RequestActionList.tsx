import { Badge } from "@/components/ui/ui";
import type { RequestActionOutcome } from "@/lib/addon/request-actions";
import { de } from "@/i18n/de";

/** Request actions from the game: in the preview what will happen, afterwards what did. */
export function RequestActionList({
  actions,
  applied,
}: {
  actions: RequestActionOutcome[];
  /** True once the import ran; the labels then say what happened. */
  applied: boolean;
}) {
  const texts = de.addonImport;
  if (actions.length === 0) {
    return null;
  }
  const resultLabels = applied ? texts.requestApplied : texts.requestResult;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-white">{texts.requestsTitle}</h2>
      <ul className="flex flex-col gap-2">
        {actions.map((action, index) => (
          <li
            key={`${action.requestId}-${action.action}-${index}`}
            className="flex flex-col gap-1 rounded-[16px] border border-border bg-surface px-4 py-3 text-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <span className="font-semibold text-white">
                  {texts.requestAction[action.action]}:
                </span>{" "}
                {action.item ?? texts.requestGone}
              </span>
              <Badge tone={action.result === "applied" ? "accent" : "danger"}>
                {resultLabels[action.result]}
              </Badge>
            </div>
            {action.reason && (
              <span className="text-[13px] text-muted">{action.reason}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
