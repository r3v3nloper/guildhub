import { describe, expect, it } from "vitest";
import { isHttpUrl } from "./url";

describe("isHttpUrl", () => {
  it("accepts only http and https", () => {
    // Act & Assert
    expect(isHttpUrl("https://example.com")).toBe(true);
    expect(isHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpUrl("data:text/html,x")).toBe(false);
    expect(isHttpUrl("example.com")).toBe(false);
  });
});
