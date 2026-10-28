import { describe, expect, it } from "vitest";
import { detectBuildSource } from "./build-source";

const sources = [
  { domain: "metabot.gg", label: "MetaBot" },
  { domain: "wowhead.com", label: "Wowhead" },
];

describe("detectBuildSource", () => {
  it("maps a known domain to its label", () => {
    expect(detectBuildSource("https://metabot.gg/builds/123", sources)).toBe(
      "MetaBot",
    );
  });

  it("matches subdomains and ignores www", () => {
    expect(
      detectBuildSource("https://classic.wowhead.com/talent-calc", sources),
    ).toBe("Wowhead");
    expect(detectBuildSource("https://www.metabot.gg/x", sources)).toBe(
      "MetaBot",
    );
  });

  it("does not match a domain that merely ends with the same letters", () => {
    expect(detectBuildSource("https://notwowhead.com/x", sources)).toBe(
      "notwowhead.com",
    );
  });

  it("returns undefined for something that is not a URL", () => {
    expect(detectBuildSource("kein link", sources)).toBeUndefined();
  });
});
