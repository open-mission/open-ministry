import { z } from "zod";

export const songInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da música é obrigatório.")
    .max(160, "O título deve ter no máximo 160 caracteres."),
  artist: z.string().trim().max(120).optional().nullable(),
  tone: z.string().trim().max(10).optional().nullable(),
  capo: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z
      .number()
      .int()
      .min(0, "O capotraste deve estar entre 0 e 12.")
      .max(12, "O capotraste deve estar entre 0 e 12.")
      .optional(),
  ),
  bpm: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? null : Number(v)),
      z.number().int().min(20).max(300).nullable().optional(),
    ),
  timeSignature: z.string().trim().max(10).optional().nullable(),
  lyrics: z.string().trim().max(20000).optional().nullable(),
  chords: z.string().trim().max(30000).optional().nullable(),
  youtubeUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
      "Link do YouTube inválido.",
    ),
  youtubeMusicUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
      "Link do YouTube Music inválido.",
    ),
  spotifyUrl: z
    .string()
    .trim()
    .optional()
    .nullable()
    .refine(
      (val) => !val || val.startsWith("http://") || val.startsWith("https://"),
      "Link do Spotify inválido.",
    ),
  collection: z.string().trim().max(100).optional().nullable(),
  tags: z
    .array(z.string().trim())
    .optional()
    .default([])
    .transform((tags) => {
      const seen = new Set<string>();
      const result: string[] = [];
      for (const tag of tags) {
        const clean = tag.trim();
        const key = clean.toLocaleLowerCase("pt-BR");
        if (!clean || seen.has(key)) continue;
        seen.add(key);
        result.push(clean);
      }
      return result;
    }),
});

export type SongInput = z.infer<typeof songInputSchema>;
