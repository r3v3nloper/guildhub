import { describe, expect, it } from "vitest";
import { idSearchParam, textParam } from "./search-params";

describe("search params", () => {
  it("reads single text values only", () => {
    // Act & Assert
    expect(textParam("pve")).toBe("pve");
    expect(textParam("")).toBeUndefined();
    expect(textParam(["a", "b"])).toBeUndefined();
    expect(textParam(undefined)).toBeUndefined();
  });

  it("reads positive whole numbers as IDs", () => {
    // Act & Assert
    expect(idSearchParam("12")).toBe(12);
    expect(idSearchParam("-3")).toBeUndefined();
    expect(idSearchParam("1.5")).toBeUndefined();
    expect(idSearchParam("abc")).toBeUndefined();
  });
});
