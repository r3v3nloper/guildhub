import { Avatar } from "primereact/avatar";
import { Button } from "@/components/ui/ui";
import { signIn, signOut } from "@/lib/auth/auth";
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
    <form
      className="flex items-center gap-2"
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <Avatar
        image={image ?? undefined}
        label={image ? undefined : name?.charAt(0).toUpperCase()}
        shape="circle"
        aria-hidden
      />
      <span className="text-sm" title={de.home.signedInAs}>
        {name}
      </span>
      <Button
        variant="secondary"
        icon="pi pi-sign-out"
        aria-label={de.auth.signOut}
        title={de.auth.signOut}
      />
    </form>
  );
}
