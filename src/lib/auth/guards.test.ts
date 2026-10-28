import { describe, expect, it } from "vitest";
import type { MemberRole } from "@/lib/db/schema";
import { permissions, type Actor, type MemberTarget } from "./guards";

function actor(role: MemberRole, userId = `${role}-1`): Actor {
  return { userId, guildId: 1, role, status: "active" };
}

function target(role: MemberRole, userId = `${role}-2`): MemberTarget {
  return { userId, role, status: "active" };
}

describe("permissions", () => {
  it("lets nobody edit someone else's data, not even an owner", () => {
    expect(permissions.editOwnData(actor("owner"), "member-2").allowed).toBe(
      false,
    );
    expect(permissions.editOwnData(actor("member"), "member-1").allowed).toBe(
      true,
    );
  });

  it("denies a disabled member everything", () => {
    const disabled: Actor = { ...actor("owner"), status: "disabled" };

    expect(permissions.viewGuild(disabled).allowed).toBe(false);
    expect(permissions.editOwnData(disabled, disabled.userId).allowed).toBe(
      false,
    );
    expect(permissions.manageGames(disabled).allowed).toBe(false);
  });

  it("lets the author and officers edit shared entries, only the author private ones", () => {
    // Arrange
    const shared = { ownerId: "member-2", visibility: "guild" as const };
    const own = { ownerId: "member-2", visibility: "private" as const };

    // Act & Assert
    expect(permissions.editSharedEntry(actor("member"), shared).allowed).toBe(
      false,
    );
    expect(permissions.editSharedEntry(actor("officer"), shared).allowed).toBe(
      true,
    );
    expect(permissions.editSharedEntry(actor("owner"), own).allowed).toBe(
      false,
    );
    expect(
      permissions.editSharedEntry(actor("member", "member-2"), own).allowed,
    ).toBe(true);
  });

  it("reserves guild-wide tasks and games for officers and owners", () => {
    expect(permissions.manageGuildTasks(actor("member")).allowed).toBe(false);
    expect(permissions.manageGuildTasks(actor("officer")).allowed).toBe(true);
    expect(permissions.manageGames(actor("member")).allowed).toBe(false);
    expect(permissions.manageGames(actor("owner")).allowed).toBe(true);
  });

  it("lets officers disable members but nobody of equal or higher rank", () => {
    const officer = actor("officer");

    expect(
      permissions.disableMember(officer, target("member"), 1).allowed,
    ).toBe(true);
    expect(
      permissions.disableMember(officer, target("officer"), 1).allowed,
    ).toBe(false);
    expect(permissions.disableMember(officer, target("owner"), 2).allowed).toBe(
      false,
    );
  });

  it("lets owners disable officers and other owners", () => {
    expect(
      permissions.disableMember(actor("owner"), target("officer"), 1).allowed,
    ).toBe(true);
    expect(
      permissions.disableMember(actor("owner"), target("owner"), 2).allowed,
    ).toBe(true);
  });

  it("protects the last active owner from being disabled or demoted, even by themself", () => {
    const owner = actor("owner", "owner-1");
    const self = target("owner", "owner-1");

    expect(permissions.disableMember(owner, self, 1).allowed).toBe(false);
    expect(permissions.changeRole(owner, self, "officer", 1).allowed).toBe(
      false,
    );
    expect(permissions.changeRole(owner, self, "officer", 2).allowed).toBe(
      true,
    );
  });

  it("does not let officers change roles", () => {
    expect(
      permissions.changeRole(actor("officer"), target("member"), "officer", 1)
        .allowed,
    ).toBe(false);
  });

  it("lets only owners purge data, and only of disabled members", () => {
    const disabledTarget: MemberTarget = {
      ...target("member"),
      status: "disabled",
    };

    expect(
      permissions.purgeMemberData(actor("officer"), disabledTarget).allowed,
    ).toBe(false);
    expect(
      permissions.purgeMemberData(actor("owner"), target("member")).allowed,
    ).toBe(false);
    expect(
      permissions.purgeMemberData(actor("owner"), disabledTarget).allowed,
    ).toBe(true);
  });

  it("reserves backups for owners", () => {
    expect(permissions.downloadBackup(actor("officer")).allowed).toBe(false);
    expect(permissions.downloadBackup(actor("owner")).allowed).toBe(true);
  });
});
