import { z } from "zod";
import { TASK_KINDS, TASK_SCOPES } from "@/lib/reset/task-kinds";
import { isHttpUrl } from "@/lib/url";
import { RESET_RULE_TYPES } from "@/lib/reset/types";

// Shapes only. Cross-references, capability and per-kind rules live in validate.ts,
// so every finding there can name the exact JSON path.

const slug = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "nur Kleinbuchstaben, Ziffern und Bindestriche",
  );

export const localizedStringSchema = z.union([
  z.string().min(1),
  z
    .record(
      z.string().regex(/^[a-z]{2}$/, "Sprachcode wie 'de'"),
      z.string().min(1),
    )
    .refine(
      (value) => Object.keys(value).length > 0,
      "mindestens eine Sprache",
    ),
]);
export type LocalizedString = z.infer<typeof localizedStringSchema>;

const lifecycleFields = {
  deprecated: z.boolean().default(false),
  replaces: z.array(slug).default([]),
  todo: z.boolean().default(false),
};

const catalogEntry = {
  id: slug,
  name: localizedStringSchema,
  ...lifecycleFields,
};

// "dps" stays for games that do not split damage dealers by range (AION 2).
export const ROLES = [
  "tank",
  "heal",
  "melee",
  "ranged",
  "dps",
  "support",
] as const;
export type Role = (typeof ROLES)[number];
export const PROFESSION_KINDS = ["primary", "secondary", "gathering"] as const;

export const factionSchema = z.strictObject(catalogEntry);

export const classSchema = z.strictObject({
  ...catalogEntry,
  role: z.enum(ROLES).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Farbe als #rrggbb")
    .optional(),
  factions: z.array(slug).default([]),
});

/** A class specialization; where a pack lists them, the spec decides the role, not the class. */
export const specSchema = z.strictObject({
  ...catalogEntry,
  class: slug,
  role: z.enum(ROLES),
});

export const raceSchema = z.strictObject({
  ...catalogEntry,
  faction: slug.optional(),
  allowed_classes: z.array(slug).default([]),
});

export const professionSchema = z.strictObject({
  ...catalogEntry,
  kind: z.enum(PROFESSION_KINDS).default("primary"),
});

const httpLink = z.url().refine(isHttpUrl, "nur http(s)-Links");

/** A recipe a profession can learn; characters pick them instead of typing names. */
export const recipeSchema = z.strictObject({
  ...catalogEntry,
  profession: slug,
  /** Skill at which the recipe can be learned. */
  skill: z.number().int().min(0).optional(),
  reagents: z
    .array(
      z.strictObject({
        name: localizedStringSchema,
        count: z.number().int().positive(),
      }),
    )
    .default([]),
  link: httpLink.optional(),
});

/** Where pack data comes from; shown wherever the app displays that data. */
export const creditSchema = z.strictObject({
  label: z.string().min(1),
  url: httpLink,
});

export const bossSchema = z.strictObject(catalogEntry);
export const serverSchema = z.strictObject(catalogEntry);

export const resetRuleSchema = z.strictObject({
  id: slug,
  ...lifecycleFields,
  type: z.enum(RESET_RULE_TYPES),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Uhrzeit als HH:MM"),
  timezone: z.string().nullable().default(null),
  weekday: z.number().int().min(1).max(7).nullable().default(null),
  day_of_month: z.number().int().min(1).max(28).nullable().default(null),
  n_days: z.number().int().min(1).nullable().default(null),
  anchor: z.iso.date().nullable().default(null),
});

export const taskSchema = z.strictObject({
  id: slug,
  ...lifecycleFields,
  kind: z.enum(TASK_KINDS),
  title: localizedStringSchema,
  description: localizedStringSchema.optional(),
  category: z.string().min(1).optional(),
  scope: z.enum(TASK_SCOPES),
  reset_rule_id: slug.optional(),
  cap: z.number().int().positive().optional(),
  regen_amount: z.number().int().positive().optional(),
  regen_interval_minutes: z.number().int().positive().optional(),
  regen_alignment: z.enum(["fixed", "relative"]).optional(),
  timezone: z.string().optional(),
  per_period_gain: z.number().int().positive().optional(),
  alert_at: z.number().int().positive().optional(),
  bosses: z.array(slug).optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  order: z.number().int().optional(),
  tags: z.array(z.string().min(1)).default([]),
  link: httpLink.optional(),
});

export const capabilitiesSchema = z.strictObject({
  characters: z.boolean().default(true),
  classes: z.boolean().default(false),
  races: z.boolean().default(false),
  professions: z.boolean().default(false),
  builds: z.boolean().default(false),
  resets: z.boolean().default(false),
  lockouts: z.boolean().default(false),
  factions: z.boolean().default(false),
  servers: z.boolean().default(false),
  guild_overview: z.boolean().default(false),
  progress_tracking: z.boolean().default(false),
});
export type Capabilities = z.infer<typeof capabilitiesSchema>;

export const regionSchema = z.strictObject({
  id: slug,
  name: localizedStringSchema.optional(),
  timezone: z.string().min(1),
});

export const buildSourceSchema = z.strictObject({
  domain: z
    .string()
    .regex(
      /^[a-z0-9.-]+\.[a-z]{2,}$/,
      "Domain ohne Protokoll, z. B. wowhead.com",
    ),
  label: z.string().min(1),
});

export const packSchema = z.strictObject({
  id: slug,
  name: localizedStringSchema,
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/, "SemVer, z. B. 0.1.0"),
  type: z.enum(["mmo", "singleplayer", "other"]).default("mmo"),
  character_label: localizedStringSchema.default("Charakter"),
  server_label: localizedStringSchema.default("Server"),
  capabilities: capabilitiesSchema.prefault({}),
  regions: z.array(regionSchema).default([]),
  factions: z.array(factionSchema).default([]),
  races: z.array(raceSchema).default([]),
  classes: z.array(classSchema).default([]),
  specs: z.array(specSchema).default([]),
  professions: z.array(professionSchema).default([]),
  recipes: z.array(recipeSchema).default([]),
  bosses: z.array(bossSchema).default([]),
  servers: z.array(serverSchema).default([]),
  build_sources: z.array(buildSourceSchema).default([]),
  credits: z.array(creditSchema).default([]),
  reset_rules: z.array(resetRuleSchema).default([]),
  tasks: z.array(taskSchema).default([]),
});

export type Pack = z.infer<typeof packSchema>;
export type PackClass = z.infer<typeof classSchema>;
export type PackSpec = z.infer<typeof specSchema>;
export type PackRecipe = z.infer<typeof recipeSchema>;
export type PackRace = z.infer<typeof raceSchema>;
export type PackTask = z.infer<typeof taskSchema>;
export type PackResetRule = z.infer<typeof resetRuleSchema>;
