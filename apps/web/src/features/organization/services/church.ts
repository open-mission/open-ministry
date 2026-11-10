export type DepartmentNomenclatureType =
  | "departments"
  | "ministries"
  | "teams"
  | "networks"
  | "custom";

export type DepartmentNomenclature = {
  type: DepartmentNomenclatureType;
  singular: string;
  plural: string;
};

export const NOMENCLATURE_PRESETS: Record<
  Exclude<DepartmentNomenclatureType, "custom">,
  { label: string; singular: string; plural: string; description: string }
> = {
  departments: {
    label: "Departamentos",
    singular: "Departamento",
    plural: "Departamentos",
    description: "Estrutura tradicional (Infantil, Música, Recepção, etc.)",
  },
  ministries: {
    label: "Ministérios",
    singular: "Ministério",
    plural: "Ministérios",
    description: "Foco vocacional e de serviço ministerial (Louvor, Diaconia, Jovens, etc.)",
  },
  teams: {
    label: "Equipes / Times",
    singular: "Equipe",
    plural: "Equipes",
    description: "Abordagem dinâmica para grupos de voluntários e liderança",
  },
  networks: {
    label: "Redes",
    singular: "Rede",
    plural: "Redes",
    description: "Comum em igrejas organizadas em células ou redes de geração",
  },
};

export function getDepartmentTerminology(metadata?: ChurchPublicMetadata | null): {
  type: DepartmentNomenclatureType;
  singular: string;
  plural: string;
} {
  const nomenclature = metadata?.departmentNomenclature;
  if (nomenclature?.singular && nomenclature?.plural) {
    return {
      type: nomenclature.type || "custom",
      singular: nomenclature.singular,
      plural: nomenclature.plural,
    };
  }

  return {
    type: "departments",
    singular: "Departamento",
    plural: "Departamentos",
  };
}

export type ChurchPublicMetadata = {
  phone?: string;
  website?: string;
  address?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  description?: string;
  departmentNomenclature?: DepartmentNomenclature;
};

export function parseChurchMetadata(
  rawMetadata: string | null | undefined,
): ChurchPublicMetadata {
  if (!rawMetadata) return {};

  try {
    const parsed =
      typeof rawMetadata === "string" ? JSON.parse(rawMetadata) : rawMetadata;

    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    let departmentNomenclature: DepartmentNomenclature | undefined;
    if (parsed.departmentNomenclature && typeof parsed.departmentNomenclature === "object") {
      const nom = parsed.departmentNomenclature;
      if (typeof nom.singular === "string" && typeof nom.plural === "string") {
        departmentNomenclature = {
          type: (typeof nom.type === "string" ? nom.type : "custom") as DepartmentNomenclatureType,
          singular: nom.singular,
          plural: nom.plural,
        };
      }
    }

    return {
      phone: typeof parsed.phone === "string" ? parsed.phone : undefined,
      website: typeof parsed.website === "string" ? parsed.website : undefined,
      address: typeof parsed.address === "string" ? parsed.address : undefined,
      instagram:
        typeof parsed.instagram === "string" ? parsed.instagram : undefined,
      youtube: typeof parsed.youtube === "string" ? parsed.youtube : undefined,
      facebook:
        typeof parsed.facebook === "string" ? parsed.facebook : undefined,
      description:
        typeof parsed.description === "string" ? parsed.description : undefined,
      departmentNomenclature,
    };
  } catch {
    return {};
  }
}

export function formatInstagramHandle(handle: string): string {
  const clean = handle.trim().replace(/^@+/, "");
  return clean ? `@${clean}` : "";
}

export function formatInstagramUrl(handle: string): string {
  const clean = handle.trim().replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "");
  return clean ? `https://instagram.com/${clean}` : "";
}

export function formatYoutubeUrl(channel: string): string {
  const trimmed = channel.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const handle = trimmed.replace(/^@+/, "");
  return `https://youtube.com/@${handle}`;
}

export function formatFacebookUrl(page: string): string {
  const trimmed = page.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const clean = trimmed.replace(/^\/+/, "");
  return `https://facebook.com/${clean}`;
}
