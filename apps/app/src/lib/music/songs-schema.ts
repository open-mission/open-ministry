import { z } from "zod";

export const songInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "O título da música é obrigatório.")
    .max(160, "O título deve ter no máximo 160 caracteres."),
  artist: z.string().trim().max(120).optional().nullable(),
  tone: z.string().trim().max(10).optional().nullable(),
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
    .default([]),
});

export type SongInput = z.infer<typeof songInputSchema>;
