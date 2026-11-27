import { z } from "zod";

import * as schema from "@/db/schema";

/** Schemas e tipos compartilhados do domínio de ensaios. */
export const REHEARSAL_NOTIFICATION_CHANNELS = [
  "in_app",
  "push",
  "whatsapp",
  "email",
] as const;

export const rehearsalAlertRuleInputSchema = z
  .object({
    id: z.string().min(1).nullish(),
    label: z.string().trim().min(1).max(120),
    triggerType: z.enum(["offset_minutes", "day_of_at_time"]),
    offsetMinutes: z.number().int().min(0).max(60 * 24 * 60).nullish(),
    timeOfDay: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Horário inválido (use HH:mm).")
      .nullish(),
    channels: z
      .array(z.enum(REHEARSAL_NOTIFICATION_CHANNELS))
      .min(1, "Selecione pelo menos um canal.")
      .max(REHEARSAL_NOTIFICATION_CHANNELS.length),
    enabled: z.boolean().optional(),
  })
  .superRefine((rule, ctx) => {
    if (rule.triggerType === "offset_minutes" && rule.offsetMinutes == null) {
      ctx.addIssue({
        code: "custom",
        message: "Informe os minutos de antecedência.",
        path: ["offsetMinutes"],
      });
    }
    if (rule.triggerType === "day_of_at_time" && !rule.timeOfDay) {
      ctx.addIssue({
        code: "custom",
        message: "Informe o horário do dia.",
        path: ["timeOfDay"],
      });
    }
  });

export const saveRehearsalAlertRulesSchema = z.object({
  rules: z.array(rehearsalAlertRuleInputSchema).min(1).max(20),
});

const rehearsalSongInputSchema = z.object({
  songId: z.string().min(1, "Selecione uma música."),
  musicalKey: z.string().trim().max(12).nullish(),
  notes: z.string().trim().max(500).nullish(),
});

const rehearsalBaseSchema = z.object({
  title: z.string().trim().min(1, "Informe o título.").max(160),
  description: z.string().trim().max(2000).nullish(),
  location: z.string().trim().max(200).nullish(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date().nullish(),
  durationMinutes: z.number().int().min(1).max(24 * 60).nullish(),
  songs: z.array(rehearsalSongInputSchema).max(100).optional(),
  notifyImmediately: z.boolean().optional(),
  alertRules: z.array(rehearsalAlertRuleInputSchema).max(20).nullish(),
});

export const createRehearsalSchema = rehearsalBaseSchema;

export const updateRehearsalSchema = rehearsalBaseSchema.partial();

export type CreateRehearsalInput = z.infer<typeof createRehearsalSchema>;
export type UpdateRehearsalInput = z.infer<typeof updateRehearsalSchema>;
export type RehearsalAlertRuleInput = z.infer<
  typeof rehearsalAlertRuleInputSchema
>;

export type DepartmentRehearsalAlertRow =
  typeof schema.departmentRehearsalAlert.$inferSelect;
