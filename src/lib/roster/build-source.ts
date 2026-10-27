export interface BuildSource {
  domain: string;
  label: string;
}

/**
 * Derives the build source from the link itself, never by fetching it (SPEC 2.3).
 * Subdomains count (`classic.wowhead.com` matches `wowhead.com`); unknown hosts fall back
 * to the bare host name.
 */
export function detectBuildSource(
  url: string,
  sources: readonly BuildSource[],
): string | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return undefined;
  }

  const match = sources.find(
    (source) => host === source.domain || host.endsWith(`.${source.domain}`),
  );
  return match?.label ?? host;
}

export function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
