export type PersonUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  birthday: string | null;
};

export type PersonLike = {
  name: string;
  email: string | null;
  image: string | null;
  birthday: string | null;
  userId: string | null;
  user?: PersonUser | null;
};

export function normalizeEmail(value?: string | null) {
  const trimmed = value?.trim().toLowerCase();
  return trimmed ? trimmed : null;
}

export function nameFromEmail(email: string) {
  const local = email.split("@")[0] ?? email;

  return (
    local
      .replace(/[._-]+/g, " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
      .trim() || "Pessoa"
  );
}

export function isPlaceholderName(name: string, email: string | null) {
  if (!email) {
    return name.trim().length === 0;
  }

  return name.trim().toLowerCase() === nameFromEmail(email).toLowerCase();
}

export function personDisplayName(person: PersonLike) {
  return person.user?.name ?? person.name;
}

export function personDisplayEmail(person: PersonLike) {
  return person.user?.email ?? person.email;
}

export function personDisplayImage(person: PersonLike) {
  return person.user?.image ?? person.image;
}

export function personDisplayBirthday(person: PersonLike) {
  return person.birthday ?? person.user?.birthday ?? null;
}

export function personHasAccount(person: PersonLike) {
  return Boolean(person.userId);
}
