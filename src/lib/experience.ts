export const EXPERIENCE_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export const experienceLevelLabels: Record<ExperienceLevel, string> = {
  beginner: "Iniciante",
  intermediate: "Em treinamento",
  advanced: "Experiente",
};

export const experienceLevelDescriptions: Record<ExperienceLevel, string> = {
  beginner: "Está começando e aprende com acompanhamento.",
  intermediate: "Já atua com autonomia em tarefas do dia a dia.",
  advanced: "Referência na função e pode formar outras pessoas.",
};

export function isExperienceLevel(value: string): value is ExperienceLevel {
  return (EXPERIENCE_LEVELS as readonly string[]).includes(value);
}
