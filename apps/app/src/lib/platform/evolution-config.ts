import "server-only";

/**
 * Compatibilidade: os módulos de notificação, WhatsApp e entitlements continuam
 * importando `getPlatformEvolutionConfig` daqui. A resolução real (`.env`
 * primário + customização opcional da plataforma, com cache seguro) vive em
 * `integrations-config.ts`.
 */
export {
  getPlatformEvolutionConfig,
  type PlatformEvolutionConfig,
} from "@/lib/platform/integrations-config";
