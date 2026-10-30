import { DeleteForm } from "@/components/ui/DeleteForm";
import type { SpecBuildView } from "@/lib/guild/spec-builds";
import { de } from "@/i18n/de";
import { deleteSpecBuildAction } from "@/app/stat-prio/actions";

/** Recommended builds grouped by spec; officers may delete them. */
export function SpecBuildList({
  builds,
  canEdit = false,
  labelFor,
}: {
  builds: SpecBuildView[];
  canEdit?: boolean;
  /** Extra label per spec, e.g. "Off-Spec" on the character page. */
  labelFor?: (build: SpecBuildView) => string | undefined;
}) {
  const specs = [...new Set(builds.map((build) => build.specName))];
  return (
    <div className="flex flex-col gap-3">
      {specs.map((specName) => {
        const ofSpec = builds.filter((build) => build.specName === specName);
        const label = labelFor?.(ofSpec[0]);
        return (
          <div key={specName} className="flex flex-col gap-1">
            <span className="text-xs font-bold tracking-wider text-muted uppercase">
              {specName}
              {label && ` · ${label}`}
            </span>
            <ul className="flex flex-col gap-1.5">
              {ofSpec.map((build) => (
                <li
                  key={build.id}
                  className="flex items-start justify-between gap-2 text-sm"
                >
                  <span className="flex flex-col gap-0.5">
                    <a
                      href={build.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 font-semibold text-accent-strong hover:text-white"
                    >
                      {build.title}
                      <i
                        className="pi pi-external-link text-[10px]"
                        aria-hidden
                      />
                      <span className="sr-only">{de.specBuilds.open}</span>
                    </a>
                    {build.notes && (
                      <span className="text-xs whitespace-pre-line text-muted">
                        {build.notes}
                      </span>
                    )}
                  </span>
                  {canEdit && (
                    <DeleteForm
                      action={deleteSpecBuildAction.bind(null, build.id)}
                      question={de.specBuilds.deleteConfirm}
                    />
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
