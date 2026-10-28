import { app, auth, common, errors, home, nav, pwa } from "./texts/core";
import { today } from "./texts/today";
import { tasks } from "./texts/tasks";
import { checklists, farmSpots, todos, visibility } from "./texts/lists";
import {
  badges,
  characters,
  memberRoles,
  professionKinds,
  roles,
  roster,
} from "./texts/roster";
import { admin, auditActions, catalogKinds } from "./texts/admin";

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
  characters,
  roster,
  admin,
  catalogKinds,
  auditActions,
  errors,
  pwa,
} as const;
