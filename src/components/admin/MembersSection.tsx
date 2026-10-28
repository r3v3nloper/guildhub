import {
  changeRoleAction,
  disableMemberAction,
  purgeMemberAction,
  reactivateMemberAction,
} from "@/app/admin/actions";
import { ActionForm } from "@/components/ui/ActionForm";
import { SelectField } from "@/components/ui/SelectField";
import { Badge, Button, Card, TextInput } from "@/components/ui/ui";
import { permissions, type Actor } from "@/lib/auth/guards";
import type { MemberView } from "@/lib/auth/membership";
import { MEMBER_ROLES } from "@/lib/db/schema";
import { de } from "@/i18n/de";

/** Controls appear only where the guards would allow the action anyway (SPEC 8). */
export function MembersSection({
  actor,
  members,
}: {
  actor: Actor;
  members: MemberView[];
}) {
  const activeOwners = members.filter(
    (m) => m.role === "owner" && m.status === "active",
  ).length;

  return (
    <Card title={de.admin.members}>
      <ul className="flex flex-col divide-y divide-border">
        {members.map((member) => {
          // Demoting is the restrictive case; if that is denied, only "owner" would remain.
          const canChangeRole = permissions.changeRole(
            actor,
            member,
            "member",
            activeOwners,
          ).allowed;
          const canDisable =
            member.status === "active" &&
            permissions.disableMember(actor, member, activeOwners).allowed;
          const canReactivate =
            member.status === "disabled" &&
            permissions.reactivateMember(actor, member).allowed;
          const canPurge = permissions.purgeMemberData(actor, member).allowed;

          return (
            <li key={member.userId} className="flex flex-col gap-2 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{member.name}</span>
                <Badge tone={member.role === "member" ? "neutral" : "accent"}>
                  {de.memberRoles[member.role]}
                </Badge>
                {member.status === "disabled" && (
                  <Badge tone="danger">{de.badges.former}</Badge>
                )}
                <span className="text-xs text-muted">{member.discordId}</span>
              </div>
              <div className="flex flex-wrap items-start gap-3">
                {canChangeRole && (
                  <ActionForm
                    action={changeRoleAction.bind(null, member.userId)}
                  >
                    <SelectField
                      name="role"
                      defaultValue={member.role}
                      aria-label={de.admin.role}
                      className="w-40"
                      options={MEMBER_ROLES.map((role) => ({
                        value: role,
                        label: de.memberRoles[role],
                      }))}
                    />
                    <Button variant="secondary">{de.common.save}</Button>
                  </ActionForm>
                )}
                {canDisable && (
                  <ActionForm
                    action={disableMemberAction.bind(null, member.userId)}
                  >
                    <Button variant="secondary">{de.admin.deactivate}</Button>
                  </ActionForm>
                )}
                {canReactivate && (
                  <ActionForm
                    action={reactivateMemberAction.bind(null, member.userId)}
                  >
                    <Button variant="secondary">{de.admin.reactivate}</Button>
                  </ActionForm>
                )}
                {canPurge && (
                  <ActionForm
                    action={purgeMemberAction.bind(null, member.userId)}
                  >
                    <label className="flex flex-col gap-1 text-xs">
                      {de.admin.purgeConfirm}
                      <TextInput
                        name="confirm"
                        placeholder={member.name ?? ""}
                        autoComplete="off"
                      />
                    </label>
                    <Button variant="danger">{de.admin.purge}</Button>
                  </ActionForm>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
