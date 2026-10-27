import { DateTime, IANAZone } from "luxon";
import type { z } from "zod";
import { CATALOG_DEFINITIONS, CATALOG_KINDS } from "./catalog";
import { packSchema, type Pack, type PackResetRule } from "./schema";

export interface PackIssue {
  /** JSON path inside pack.json, e.g. `classes[2].id`; empty for the whole file. */
  path: string;
  message: string;
}

export interface PackValidationResult {
  pack: Pack | undefined;
  errors: PackIssue[];
  warnings: PackIssue[];
}

export function formatPath(path: ReadonlyArray<PropertyKey>): string {
  return path
    .map((segment, index) =>
      typeof segment === "number"
        ? `[${segment}]`
        : `${index === 0 ? "" : "."}${String(segment)}`,
    )
    .join("");
}

function schemaIssues(error: z.ZodError): PackIssue[] {
  return error.issues.map((issue) => ({
    path: formatPath(issue.path),
    message: issue.message,
  }));
}

/**
 * Validates one pack.json (SPEC 6.5 A). Used by the CLI, the Docker build and the
 * startup sync alike, so all three report the same findings.
 */
export function validatePack(
  raw: unknown,
  folderName: string,
): PackValidationResult {
  const parsed = packSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      pack: undefined,
      errors: schemaIssues(parsed.error),
      warnings: [],
    };
  }

  const pack = parsed.data;
  const errors: PackIssue[] = [];
  const warnings: PackIssue[] = [];
  const error = (path: string, message: string) =>
    errors.push({ path, message });

  if (pack.id !== folderName) {
    error("id", `muss dem Ordnernamen '${folderName}' entsprechen`);
  }

  checkUniqueIds(pack, error);
  checkCapabilities(pack, error);
  checkReferences(pack, error);
  checkResetRules(pack, error, warnings);
  checkTasks(pack, error);

  return { pack: errors.length === 0 ? pack : undefined, errors, warnings };
}

type Report = (path: string, message: string) => void;

function checkUniqueIds(pack: Pack, error: Report) {
  const lists: Array<[string, Array<{ id: string }>]> = [
    ...CATALOG_KINDS.map((kind): [string, Array<{ id: string }>] => {
      const key = CATALOG_DEFINITIONS[kind].packKey;
      return [key, pack[key]];
    }),
    ["tasks", pack.tasks],
    ["regions", pack.regions],
  ];

  for (const [listName, entries] of lists) {
    const seen = new Set<string>();
    entries.forEach((entry, index) => {
      if (seen.has(entry.id)) {
        error(`${listName}[${index}].id`, `doppelte ID '${entry.id}'`);
      }
      seen.add(entry.id);
    });
  }
}

function checkCapabilities(pack: Pack, error: Report) {
  for (const kind of CATALOG_KINDS) {
    const { packKey, capability } = CATALOG_DEFINITIONS[kind];
    if (
      capability &&
      !pack.capabilities[capability] &&
      pack[packKey].length > 0
    ) {
      error(packKey, `nur erlaubt, wenn capabilities.${capability} aktiv ist`);
    }
  }

  const needsRegion =
    pack.capabilities.resets ||
    pack.tasks.some(
      (task) =>
        task.kind === "regen" && (task.regen_alignment ?? "fixed") === "fixed",
    );
  if (needsRegion && pack.regions.length === 0) {
    error(
      "regions",
      "Pflicht bei capabilities.resets oder regen-Aufgaben mit fester Taktung",
    );
  }
}

function checkReferences(pack: Pack, error: Report) {
  const ids = (list: Array<{ id: string }>) =>
    new Set(list.map((entry) => entry.id));
  const factionIds = ids(pack.factions);
  const classIds = ids(pack.classes);
  const bossIds = ids(pack.bosses);
  const ruleIds = ids(pack.reset_rules);

  pack.classes.forEach((entry, index) =>
    entry.factions.forEach((factionId, i) => {
      if (!factionIds.has(factionId)) {
        error(
          `classes[${index}].factions[${i}]`,
          `unbekannte Fraktion '${factionId}'`,
        );
      }
    }),
  );

  pack.races.forEach((entry, index) => {
    if (entry.faction && !factionIds.has(entry.faction)) {
      error(
        `races[${index}].faction`,
        `unbekannte Fraktion '${entry.faction}'`,
      );
    }
    entry.allowed_classes.forEach((classId, i) => {
      if (!classIds.has(classId)) {
        error(
          `races[${index}].allowed_classes[${i}]`,
          `unbekannte Klasse '${classId}'`,
        );
      }
    });
  });

  pack.tasks.forEach((task, index) => {
    if (task.reset_rule_id && !ruleIds.has(task.reset_rule_id)) {
      error(
        `tasks[${index}].reset_rule_id`,
        `unbekannte Reset-Regel '${task.reset_rule_id}'`,
      );
    }
    task.bosses?.forEach((bossId, i) => {
      if (!bossIds.has(bossId)) {
        error(`tasks[${index}].bosses[${i}]`, `unbekannter Boss '${bossId}'`);
      }
    });
  });

  const replaceableLists: Array<
    [string, Array<{ id: string; replaces: string[] }>]
  > = [
    ...CATALOG_KINDS.map(
      (kind): [string, Array<{ id: string; replaces: string[] }>] => {
        const key = CATALOG_DEFINITIONS[kind].packKey;
        return [key, pack[key]];
      },
    ),
    ["tasks", pack.tasks],
  ];
  for (const [listName, entries] of replaceableLists) {
    const active = ids(entries);
    entries.forEach((entry, index) =>
      entry.replaces.forEach((oldId, i) => {
        if (active.has(oldId)) {
          error(
            `${listName}[${index}].replaces[${i}]`,
            `'${oldId}' ist im Pack noch aktiv und kann nicht ersetzt werden`,
          );
        }
      }),
    );
  }
}

function checkResetRules(pack: Pack, error: Report, warnings: PackIssue[]) {
  pack.regions.forEach((region, index) => {
    if (!IANAZone.isValidZone(region.timezone)) {
      error(
        `regions[${index}].timezone`,
        `unbekannte Zeitzone '${region.timezone}'`,
      );
    }
  });

  const regionZones = pack.regions
    .map((region) => region.timezone)
    .filter((zone) => IANAZone.isValidZone(zone));

  pack.reset_rules.forEach((rule, index) => {
    const path = `reset_rules[${index}]`;
    if (rule.timezone !== null && !IANAZone.isValidZone(rule.timezone)) {
      error(`${path}.timezone`, `unbekannte Zeitzone '${rule.timezone}'`);
      return;
    }
    if (rule.type === "weekly" && rule.weekday === null) {
      error(`${path}.weekday`, "Pflicht bei type weekly");
    }
    if (rule.type === "monthly" && rule.day_of_month === null) {
      error(`${path}.day_of_month`, "Pflicht bei type monthly");
    }
    if (rule.type === "every_n_days") {
      if (rule.n_days === null) {
        error(`${path}.n_days`, "Pflicht bei type every_n_days");
      }
      if (rule.anchor === null) {
        error(`${path}.anchor`, "Pflicht bei type every_n_days");
      }
    }

    const zones = rule.timezone !== null ? [rule.timezone] : regionZones;
    for (const zone of zones) {
      if (fallsIntoDstTransition(rule, zone)) {
        warnings.push({
          path: `${path}.time`,
          message: `${rule.time} liegt in ${zone} in einer Umstellungsstunde (siehe SPEC 5.2)`,
        });
      }
    }
  });
}

/** True if the local time is skipped or repeated on some day of the coming year. */
function fallsIntoDstTransition(rule: PackResetRule, zone: string): boolean {
  const [hour, minute] = rule.time.split(":").map(Number);
  const start = DateTime.now().setZone(zone).startOf("day");

  for (let day = 0; day < 366; day++) {
    const date = start.plus({ days: day });
    const local = DateTime.fromObject(
      { year: date.year, month: date.month, day: date.day, hour, minute },
      { zone },
    );
    // Luxon shifts a time inside the gap forward, so it no longer matches the requested hour.
    const skipped = local.hour !== hour || local.minute !== minute;
    const repeated =
      local.plus({ hours: 1 }).hour === hour ||
      local.minus({ hours: 1 }).hour === hour;
    if (skipped || repeated) {
      return true;
    }
  }
  return false;
}

function checkTasks(pack: Pack, error: Report) {
  pack.tasks.forEach((task, index) => {
    const path = `tasks[${index}]`;
    const has = (value: unknown) => value !== undefined;

    if (task.scope === "user") {
      error(`${path}.scope`, "Pack-Aufgaben haben nie scope 'user'");
    }
    if (task.scope === "server" && !pack.capabilities.servers) {
      error(`${path}.scope`, "scope 'server' nur bei capabilities.servers");
    }
    if (task.kind === "lockout" && !pack.capabilities.lockouts) {
      error(`${path}.kind`, "lockout nur bei capabilities.lockouts");
    }

    const needsRule = ["recurring", "lockout", "stacking"].includes(task.kind);
    if (needsRule && !has(task.reset_rule_id)) {
      error(`${path}.reset_rule_id`, `Pflicht bei kind ${task.kind}`);
    }
    if (task.kind === "one_time" && has(task.reset_rule_id)) {
      error(`${path}.reset_rule_id`, "one_time hat keine Reset-Regel");
    }

    const required: Record<string, Array<keyof typeof task>> = {
      counter: ["cap"],
      stacking: ["cap", "per_period_gain"],
      regen: ["cap", "regen_amount", "regen_interval_minutes"],
    };
    for (const field of required[task.kind] ?? []) {
      if (!has(task[field])) {
        error(`${path}.${field}`, `Pflicht bei kind ${task.kind}`);
      }
    }

    const onlyFor: Array<[keyof typeof task, string]> = [
      ["bosses", "lockout"],
      ["regen_amount", "regen"],
      ["regen_interval_minutes", "regen"],
      ["regen_alignment", "regen"],
      ["timezone", "regen"],
      ["per_period_gain", "stacking"],
    ];
    for (const [field, kind] of onlyFor) {
      if (has(task[field]) && task.kind !== kind) {
        error(`${path}.${field}`, `nur bei kind ${kind} erlaubt`);
      }
    }

    if (has(task.alert_at) && has(task.cap) && task.alert_at! > task.cap!) {
      error(`${path}.alert_at`, "darf nicht größer als cap sein");
    }
    if (task.timezone && !IANAZone.isValidZone(task.timezone)) {
      error(`${path}.timezone`, `unbekannte Zeitzone '${task.timezone}'`);
    }
  });
}
