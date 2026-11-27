/**
 * Barrel único do cliente Evolution — mantém TODOS os contratos públicos
 * históricos. A implementação vive em `lib/evolution/*`.
 */
export type {
  EvolutionConfig,
  ResolvedEvolutionInstance,
} from "./evolution/messaging";
export {
  formatPhoneNumberForEvolution,
  resolveEvolutionInstanceToken,
  checkEvolutionConnection,
  sendEvolutionTextMessage,
} from "./evolution/messaging";
export {
  cleanEvolutionUrl,
  parseEvolutionApiUrl,
  assertEvolutionUrlResolvedSafe,
} from "./evolution/url-safety";
export type {
  EvolutionHealthResult,
  EvolutionInstanceResult,
  EvolutionConnectResult,
  EvolutionStatusResult,
} from "./evolution/instance-lifecycle";
export {
  checkEvolutionPlatformHealth,
  createEvolutionInstance,
  connectEvolutionInstance,
  getEvolutionInstanceStatus,
  disconnectEvolutionInstance,
  deleteEvolutionInstance,
} from "./evolution/instance-lifecycle";
export { configureEvolutionWebhook } from "./evolution/webhook";
