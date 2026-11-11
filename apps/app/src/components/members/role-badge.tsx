import { Badge } from "@/components/ui/badge";
import { isAdminRole, roleLabel } from "@/lib/format";

export function RoleBadge({ role }: { role: string }) {
  const isOwner = role
    .split(",")
    .map((item) => item.trim())
    .includes("owner");
  const isAdmin = isAdminRole(role);

  return (
    <Badge
      variant={isOwner ? "default" : isAdmin ? "secondary" : "outline"}
      className="font-normal"
    >
      {roleLabel(role)}
    </Badge>
  );
}
