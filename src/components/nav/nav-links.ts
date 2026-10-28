import { de } from "@/i18n/de";

export interface NavEntry {
  href: string;
  label: string;
  icon: string;
  /** Fits the phone's tab bar where the full label would wrap. */
  shortLabel?: string;
}

export interface NavGroup {
  label: string;
  links: NavEntry[];
}

/** Every page of the app, grouped as in the sidebar. Admin only for those who may see it. */
export function navGroups(showAdmin: boolean): NavGroup[] {
  return [
    {
      label: de.nav.mainGroup,
      links: [
        { href: "/", label: de.nav.today, icon: "pi-check-square" },
        { href: "/roster", label: de.nav.roster, icon: "pi-users" },
        {
          href: "/charaktere",
          label: de.nav.characters,
          shortLabel: de.nav.charactersShort,
          icon: "pi-id-card",
        },
      ],
    },
    {
      label: de.nav.guildGroup,
      links: [
        { href: "/matrix", label: de.nav.matrix, icon: "pi-table" },
        { href: "/berufe", label: de.nav.directory, icon: "pi-wrench" },
        { href: "/antraege", label: de.nav.requests, icon: "pi-inbox" },
        {
          href: "/stat-prio",
          label: de.nav.statPriorities,
          icon: "pi-sort-amount-down",
        },
      ],
    },
    {
      label: de.nav.plannerGroup,
      links: [
        { href: "/aufgaben", label: de.nav.tasks, icon: "pi-list-check" },
        { href: "/listen", label: de.nav.todos, icon: "pi-list" },
        { href: "/dungeons", label: de.nav.checklists, icon: "pi-flag" },
        { href: "/farmspots", label: de.nav.farmSpots, icon: "pi-map-marker" },
      ],
    },
    ...(showAdmin
      ? [
          {
            label: de.nav.adminGroup,
            links: [{ href: "/admin", label: de.nav.admin, icon: "pi-cog" }],
          },
        ]
      : []),
  ];
}
