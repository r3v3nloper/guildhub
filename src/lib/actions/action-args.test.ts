import { describe, expect, it } from "vitest";
import { DomainError } from "@/lib/errors";
import { flagArg, idArg, keyListArg, parseArg } from "./action-args";

describe("parseArg", () => {
  it("passes valid arguments through", () => {
    // Act & Assert
    expect(parseArg(idArg, 7)).toBe(7);
    expect(parseArg(flagArg, false)).toBe(false);
    expect(parseArg(keyListArg, ["mining"])).toEqual(["mining"]);
  });

  it("rejects what a tampered request could send", () => {
    // Act & Assert
    expect(() => parseArg(idArg, "7")).toThrow(DomainError);
    expect(() => parseArg(idArg, -1)).toThrow(DomainError);
    expect(() => parseArg(flagArg, "true")).toThrow(DomainError);
    expect(() => parseArg(keyListArg, "mining")).toThrow(DomainError);
    expect(() => parseArg(keyListArg, [""])).toThrow(DomainError);
  });
});
