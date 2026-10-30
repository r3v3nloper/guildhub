import {
  app,
  auth,
  common,
  errors,
  home,
  nav,
  pwa,
  stepper,
} from "./texts/core";
import { today } from "./texts/today";
import { tasks } from "./texts/tasks";
import { checklists, farmSpots, todos, visibility } from "./texts/lists";
import {
  badges,
  characters,
  learnings,
  memberRoles,
  professionKinds,
  roles,
  roster,
} from "./texts/roster";
import { admin, auditActions, catalogKinds } from "./texts/admin";
import {
  directory,
  matrix,
  requests,
  specBuilds,
  statPriorities,
} from "./texts/guild";

/** All UI texts. Each feature keeps its own file under texts/; callers use `de.<group>`. */
export const de = {
  app,
  auth,
  nav,
  home,
  today,
  tasks,
  todos,
  checklists,
  farmSpots,
  visibility,
  roles,
  memberRoles,
  professionKinds,
  badges,
  common,
  stepper,
  characters,
  learnings,
  roster,
  admin,
  catalogKinds,
  auditActions,
  errors,
  pwa,
  matrix,
  directory,
  requests,
  statPriorities,
  specBuilds,
} as const;
