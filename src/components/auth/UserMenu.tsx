import { Avatar } from "primereact/avatar";
import { currentSession } from "@/lib/auth/current-actor";
import { de } from "@/i18n/de";
import { signOutAction } from "./auth-actions";

/** Who is signed in, at the foot of the sidebar; on phones sign-out sits in the menu. */
export async function UserMenu({ role }: { role?: string }) {
  const session = await currentSession();
  if (!session?.user) {
    return null;
  }

  const { name, image } = session.user;
  return (
    <form
      action={signOutAction}
      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
    >
      <Avatar
        image={image ?? undefined}
        label={image ? undefined : name?.charAt(0).toUpperCase()}
        shape="circle"
        aria-hidden
      />
      <span className="flex min-w-0 flex-1 flex-col" title={de.home.signedInAs}>
        <span className="truncate text-sm font-bold">{name}</span>
        {role && <span className="text-xs text-muted">{role}</span>}
      </span>
      <button
        type="submit"
        aria-label={de.auth.signOut}
        title={de.auth.signOut}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-raised hover:text-foreground"
      >
        <i className="pi pi-sign-out" aria-hidden />
      </button>
    </form>
  );
}
