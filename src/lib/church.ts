export type ChurchPublicMetadata = {
  phone?: string;
  website?: string;
  address?: string;
  instagram?: string;
  youtube?: string;
  facebook?: string;
  description?: string;
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
