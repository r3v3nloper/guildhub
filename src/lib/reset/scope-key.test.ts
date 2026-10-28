import { describe, expect, it } from "vitest";
import { scopeKey } from "./scope-key";

const owner = { userId: "u1", gameId: "aion2" };

describe("scopeKey", () => {
  it("shares a server task between characters on the same server", () => {
    // Act
    const first = scopeKey("server", {
      ...owner,
      characterId: 1,
      server: "ariel",
    });
    const second = scopeKey("server", {
      ...owner,
      characterId: 2,
      server: "ariel",
    });

    // Assert
    expect(first).toBe("s:u1:aion2:ariel");
    expect(second).toBe(first);
  });

  it("separates characters on different servers", () => {
    // Act
    const first = scopeKey("server", {
      ...owner,
      characterId: 1,
      server: "ariel",
    });
    const second = scopeKey("server", {
      ...owner,
      characterId: 2,
      server: "azphel",
    });

    // Assert
    expect(second).not.toBe(first);
  });

  it("treats a character without server as a server of its own", () => {
    // Act
    const key = scopeKey("server", { ...owner, characterId: 7, server: null });

    // Assert
    expect(key).toBe("s:u1:aion2:c7");
  });

  it("builds character, account and user keys", () => {
    // Act & Assert
    expect(scopeKey("character", { ...owner, characterId: 3 })).toBe("c:3");
    expect(scopeKey("account", owner)).toBe("a:u1:aion2");
    expect(scopeKey("user", { userId: "u1", gameId: null })).toBe("u:u1");
  });
});
