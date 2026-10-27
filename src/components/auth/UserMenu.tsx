import { connection } from "next/server";
import { auth, signIn, signOut } from "@/lib/auth/auth";
import { de } from "@/i18n/de";

const buttonClass =
  "rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white active:opacity-80";

export async function UserMenu() {
  // auth() uses crypto.getRandomValues(), which Cache Components forbids during prerendering;
  // this marks the component as request-time so it streams in behind its Suspense boundary.
  await connection();
  const session = await auth();

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
