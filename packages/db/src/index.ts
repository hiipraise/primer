export { createClient } from "./client";
export { createServerSupabaseClient } from "./server";
export { createServiceRoleClient } from "./service";
export { createBrowserSupabaseClient } from "./browser";

export {
  createSession,
  getSession,
  updateSession,
  createGeneration,
  getLatestGeneration,
  getGeneration,
  getAllGenerations,
  getGenerationCount,
  getCookieValue,
  getUserSessions,
  getAnonSessions,
  claimAnonSessions,
  getOrCreateAnonSession,
  incrementAnonGenerations,
} from "./sessions";

export type { SessionRow, GenerationRow } from "./sessions";
