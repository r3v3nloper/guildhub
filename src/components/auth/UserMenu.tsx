import { signIn, signOut } from "@/lib/auth/auth";
import { currentSession } from "@/lib/auth/current-actor";
import { de } from "@/i18n/de";

const buttonClass =
  "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white active:opacity-80";

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
        <button type="submit" className={buttonClass}>
          {de.auth.signIn}
        </button>
      </form>
    );
  }

  return (
    <form
      className="flex items-center gap-3"
      action={async () => {
        "use server";
        await signOut();
      }}
    >
      <span className="text-sm" title={de.home.signedInAs}>
        {session.user.name}
      </span>
      <button type="submit" className={buttonClass}>
        {de.auth.signOut}
      </button>
    </form>
  );
}
