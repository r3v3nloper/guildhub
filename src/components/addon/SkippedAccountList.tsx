import { de } from "@/i18n/de";

/** Accounts passed on in the game that the import leaves out, each with the reason. */
export function SkippedAccountList({ accounts }: { accounts: string[] }) {
  if (accounts.length === 0) {
    return null;
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-base font-bold text-white">
        {de.addonImport.skippedTitle}
      </h2>
      <ul className="flex flex-col gap-1 text-[13px] text-muted">
        {accounts.map((account) => (
          <li key={account}>{account}</li>
        ))}
      </ul>
    </section>
  );
}
