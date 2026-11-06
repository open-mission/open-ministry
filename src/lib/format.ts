const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "America/Sao_Paulo",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function formatDate(value: Date | string | number): string {
  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value: Date | string | number): string {
  return dateTimeFormatter.format(new Date(value));
}

export function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "?";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const visible = localPart.slice(0, 1);
  return `${visible}${"*".repeat(Math.max(localPart.length - 1, 2))}@${domain}`;
}

export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function buildOrganizationSlug(name: string): string {
  const base = slugify(name) || "igreja";
  const suffix = globalThis.crypto.randomUUID().slice(0, 6);

  return `${base}-${suffix}`;
}

export function isExpired(value: Date | string | number): boolean {
  return new Date(value).getTime() < Date.now();
}

export function roleLabel(role: string): string {
  const roles = role
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (roles.includes("owner")) {
    return "Proprietário";
  }

  if (roles.includes("admin")) {
    return "Administrador";
  }

  return "Membro";
}

export function isAdminRole(role: string): boolean {
  const roles = role
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return roles.includes("owner") || roles.includes("admin");
}
