"use server";

import { signOut } from "@/lib/auth/auth";

export async function signOutAction(): Promise<void> {
  await signOut();
}
