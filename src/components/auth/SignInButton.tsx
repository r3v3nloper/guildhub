import { signIn } from "@/lib/auth/auth";
import { de } from "@/i18n/de";

/** The Discord sign-in, as the one big action of the start page. */
export function SignInButton() {
  return (
    <form
      action={async () => {
        "use server";
        await signIn("discord");
      }}
    >
      <button
        type="submit"
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#4752c4] px-6 text-base font-bold text-white shadow-[0_10px_30px_rgba(71,82,196,0.35)] hover:bg-[#3c46b0]"
      >
        <i className="pi pi-discord text-xl" aria-hidden />
        {de.auth.signIn}
      </button>
    </form>
  );
}
