import { Avatar } from "primereact/avatar";
import { Button } from "@/components/ui/ui";
import { signIn } from "@/lib/auth/auth";
import { signOutAction } from "./auth-actions";
import { currentSession } from "@/lib/auth/current-actor";
import { de } from "@/i18n/de";

export async function UserMenu() {
  const session = await currentSession();

  if (!session?.user) {
    return (
      <form
        action={async () => {
          "use server";
          await signIn("discord");
        }}
      >
        <Button icon="pi pi-discord" label={de.auth.signIn} />
      </form>
    );
  }

  const { name, image } = session.user;
  return (
    <form className="flex shrink-0 items-center gap-2" action={signOutAction}>
      <Avatar
        image={image ?? undefined}
        label={image ? undefined : name?.charAt(0).toUpperCase()}
        shape="circle"
        aria-hidden
      />
      <span className="hidden text-sm md:inline" title={de.home.signedInAs}>
        {name}
      </span>
      {/* On phones sign-out lives in the navigation menu. */}
      <span className="hidden md:inline-flex">
        <Button
          variant="secondary"
          icon="pi pi-sign-out"
          aria-label={de.auth.signOut}
          title={de.auth.signOut}
        />
      </span>
    </form>
  );
}
