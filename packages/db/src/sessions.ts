import { createServerSupabaseClient } from "./server";
import { createServiceRoleClient } from "./service";

// ─── Types ───────────────────────────────────────────────────────────
export interface SessionRow {
  id: string;
  user_id: string | null;
  anon_cookie_id: string | null;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface GenerationRow {
  id: string;
  session_id: string;
  version_number: number;
  user_input: string;
  output_prompt: string;
  stack_json: Record<string, unknown> | null;
  tools_json: Record<string, unknown> | null;
  skills_json: Record<string, unknown> | null;
  format: string;
  spec_json: Record<string, unknown> | null;
  change_summary: string | null;
  created_at: string;
}

export interface PublicPromptRow {
  id: string;
  generation_id: string;
  slug: string;
  title: string;
  idea_summary: string;
  stack_summary: string;
  is_public: boolean;
  view_count: number;
  created_at: string;
  generation?: GenerationRow;
}

export type SessionOwner =
  | { userId: string; anonCookieId?: null }
  | { userId: null; anonCookieId: string };

async function getOwnerClient(owner: SessionOwner) {
  return owner.userId
    ? createServerSupabaseClient()
    : createServiceRoleClient();
}

// ─── Cookie helper ───────────────────────────────────────────────────
/**
 * Parse a specific cookie value from a Cookie header string.
 * Works in edge/serverless runtimes with no extra dependencies.
 */
export function getCookieValue(
  cookieHeader: string | null,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(name + "=")) {
      try {
        return decodeURIComponent(trimmed.slice(name.length + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

// ─── Sessions ────────────────────────────────────────────────────────
export async function createSession(params: {
  userId: string | null;
  anonCookieId: string | null;
  title: string;
}): Promise<SessionRow> {
  const supabase = params.userId
    ? await createServerSupabaseClient()
    : createServiceRoleClient();

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      user_id: params.userId,
      anon_cookie_id: params.anonCookieId,
      title: params.title,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create session: ${error.message}`);
  }

  return data as SessionRow;
}

export async function getSession(
  sessionId: string,
  owner: SessionOwner,
): Promise<SessionRow | null> {
  const supabase = await getOwnerClient(owner);

  let query = supabase
    .from("sessions")
    .select()
    .eq("id", sessionId);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anon_cookie_id", owner.anonCookieId).is("user_id", null);
  const { data, error } = await query.maybeSingle();

  if (error) {
    console.error("[db/get-session] SESSION_LOOKUP_FAILED", error);
    throw new Error("Failed to look up session.");
  }
  return data as SessionRow | null;
}

export async function updateSession(
  sessionId: string,
  updates: { title?: string },
  owner: SessionOwner,
): Promise<void> {
  const supabase = await getOwnerClient(owner);
  let query = supabase
    .from("sessions")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", sessionId);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anon_cookie_id", owner.anonCookieId).is("user_id", null);
  const { error } = await query;

  if (error) {
    throw new Error(`Failed to update session: ${error.message}`);
  }
}

export async function deleteSession(sessionId: string, owner: SessionOwner): Promise<void> {
  const supabase = await getOwnerClient(owner);
  let query = supabase.from("sessions").delete().eq("id", sessionId);
  query = owner.userId
    ? query.eq("user_id", owner.userId)
    : query.eq("anon_cookie_id", owner.anonCookieId).is("user_id", null);
  const { error } = await query;
  if (error) {
    console.error("[db/delete-session] SESSION_DELETE_FAILED", error);
    throw new Error("Failed to delete session.");
  }
}

// ─── Anonymous sessions ─────────────────────────────────────────────
export async function getOrCreateAnonSession(
  anonCookieId: string,
): Promise<{ id: string; generations_used: number }> {
  const supabase = createServiceRoleClient();

  // Try to find existing — may return null (no rows) or error (RLS, missing table, etc.)
  const { data: existing, error: findError } = await supabase
    .from("anon_sessions")
    .select("id, generations_used")
    .eq("cookie_id", anonCookieId)
    .maybeSingle();

  // .maybeSingle() only returns an error on actual DB failures (RLS, missing table, etc.)
  // — zero rows is not an error with maybeSingle, so any error here is a real problem.
  if (findError) {
    throw new Error(
      `Failed to look up anonymous session: ${findError.message} (${findError.code})`,
    );
  }

  if (existing) {
    return existing as { id: string; generations_used: number };
  }

  // Create new
  const { data: created, error } = await supabase
    .from("anon_sessions")
    .insert({ cookie_id: anonCookieId, generations_used: 0 })
    .select("id, generations_used")
    .single();

  if (error) {
    throw new Error(
      `Failed to create anonymous session: ${error.message} (${error.code})`,
    );
  }
  if (!created) {
    throw new Error(
      "Failed to create anonymous session: insert returned no row.",
    );
  }

  return created as { id: string; generations_used: number };
}

export async function incrementAnonGenerations(
  anonCookieId: string,
  cap: number,
): Promise<number> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("consume_anon_generation", {
    p_cookie_id: anonCookieId,
    p_cap: cap,
  });
  if (error) {
    console.error("[db/consume-anon-generation] QUOTA_RESERVATION_FAILED", error);
    throw new Error("Failed to reserve anonymous generation.");
  }
  if (typeof data !== "number") return 0;
  return data;
}

export async function refundAnonGeneration(anonCookieId: string): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.rpc("refund_anon_generation", {
    p_cookie_id: anonCookieId,
  });
  if (error) {
    console.error("[db/refund-anon-generation] QUOTA_REFUND_FAILED", error);
    throw new Error("Failed to refund anonymous generation.");
  }
}

// ─── Generations ─────────────────────────────────────────────────────
export async function getLatestGeneration(
  sessionId: string,
  owner: SessionOwner,
): Promise<GenerationRow | null> {
  const supabase = await getOwnerClient(owner);

  const { data, error } = await supabase
    .from("generations")
    .select()
    .eq("session_id", sessionId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[db/get-latest-generation] GENERATION_LOOKUP_FAILED", error);
    throw new Error("Failed to look up latest generation.");
  }
  return data as GenerationRow | null;
}

export async function getGeneration(
  sessionId: string,
  versionNumber: number,
  owner: SessionOwner,
): Promise<GenerationRow | null> {
  const supabase = await getOwnerClient(owner);

  const { data, error } = await supabase
    .from("generations")
    .select()
    .eq("session_id", sessionId)
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) {
    console.error("[db/get-generation] GENERATION_LOOKUP_FAILED", error);
    throw new Error("Failed to look up generation.");
  }
  return data as GenerationRow | null;
}

export async function getAllGenerations(
  sessionId: string,
  owner: SessionOwner,
): Promise<GenerationRow[]> {
  const supabase = await getOwnerClient(owner);

  const { data, error } = await supabase
    .from("generations")
    .select()
    .eq("session_id", sessionId)
    .order("version_number", { ascending: true });

  if (error) {
    console.error("[db/get-generations] GENERATIONS_LOOKUP_FAILED", error);
    throw new Error("Failed to look up generations.");
  }
  return (data ?? []) as GenerationRow[];
}

export async function getGenerationCount(sessionId: string): Promise<number> {
  const supabase = await createServerSupabaseClient();

  const { count, error } = await supabase
    .from("generations")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId);

  if (error) {
    console.error("[db/get-generation-count] GENERATION_COUNT_FAILED", error);
    throw new Error("Failed to count generations.");
  }
  return count ?? 0;
}

// ─── Session listing ────────────────────────────────────────────────
export async function getUserSessions(params: {
  userId: string;
  page: number;
  limit: number;
}): Promise<{ sessions: SessionRow[]; total: number }> {
  const supabase = await createServerSupabaseClient();

  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;

  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", params.userId)
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (error) {
    console.error("[db/get-user-sessions] SESSIONS_LOOKUP_FAILED", error);
    throw new Error("Failed to look up sessions.");
  }
  const rows = (data ?? []) as SessionRow[];
  // If we got a full page, there's likely more; otherwise this is the last page
  const hasMore = rows.length >= params.limit;
  return {
    sessions: rows,
    total: hasMore ? from + params.limit + 1 : rows.length,
  };
}

export async function getAnonSessions(
  anonCookieId: string,
): Promise<SessionRow[]> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("sessions")
    .select()
    .eq("anon_cookie_id", anonCookieId)
    .is("user_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[db/get-anon-sessions] SESSIONS_LOOKUP_FAILED", error);
    throw new Error("Failed to look up anonymous sessions.");
  }
  return (data ?? []) as SessionRow[];
}

export async function claimAnonSessions(params: {
  anonCookieId: string;
  userId: string;
}): Promise<number> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("sessions")
    .update({
      user_id: params.userId,
      anon_cookie_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("anon_cookie_id", params.anonCookieId)
    .is("user_id", null)
    .select();

  if (error) {
    console.error("[db/claim-anon-sessions] SESSION_CLAIM_FAILED", error);
    throw new Error("Failed to claim anonymous sessions.");
  }
  return (data ?? []).length;
}

export async function createGeneration(params: {
  sessionId: string;
  versionNumber: number;
  userInput: string;
  outputPrompt: string;
  stack?: Array<{ name: string; reason: string }>;
  tools?: Array<{ name: string; reason: string }>;
  skills?: Array<{ name: string; reason: string }>;
  format: string;
  spec: Record<string, unknown>;
  changeSummary: string;
  owner: SessionOwner;
}): Promise<GenerationRow> {
  const supabase = await getOwnerClient(params.owner);

  const { data, error } = await supabase
    .from("generations")
    .insert({
      session_id: params.sessionId,
      version_number: params.versionNumber,
      user_input: params.userInput,
      output_prompt: params.outputPrompt,
      stack_json: params.stack
        ? JSON.parse(JSON.stringify(params.stack))
        : null,
      tools_json: params.tools
        ? JSON.parse(JSON.stringify(params.tools))
        : null,
      skills_json: params.skills
        ? JSON.parse(JSON.stringify(params.skills))
        : null,
      format: params.format,
      spec_json: JSON.parse(JSON.stringify(params.spec)),
      change_summary: params.changeSummary,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create generation: ${error.message}`);
  }

  return data as GenerationRow;
}

export async function publishGeneration(params: {
  generationId: string;
  isPublic: boolean;
  owner: SessionOwner;
}): Promise<PublicPromptRow> {
  const supabase = await getOwnerClient(params.owner);
  let generationQuery = supabase
    .from("generations")
    .select("*, sessions!inner(user_id, anon_cookie_id)")
    .eq("id", params.generationId)
  generationQuery = params.owner.userId
    ? generationQuery.eq("sessions.user_id", params.owner.userId)
    : generationQuery
        .eq("sessions.anon_cookie_id", params.owner.anonCookieId)
        .is("sessions.user_id", null);
  const { data: generation } = await generationQuery.maybeSingle();
  if (!generation) throw new Error("Generation not found.");

  const slug = `${
    generation.user_input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48) || "prompt"
  }-${generation.id.slice(0, 6)}`;
  const { data, error } = await supabase
    .from("public_prompts")
    .upsert(
      {
        generation_id: params.generationId,
        slug,
        title: generation.user_input.slice(0, 100),
        idea_summary: generation.user_input,
        stack_summary: JSON.stringify(generation.stack_json ?? []),
        is_public: params.isPublic,
      },
      { onConflict: "generation_id" },
    )
    .select()
    .single();
  if (error) throw new Error(`Failed to publish prompt: ${error.message}`);
  return data as PublicPromptRow;
}

export async function hasOwnedGeneration(generationId: string, owner: SessionOwner): Promise<boolean> {
  const supabase = await getOwnerClient(owner);
  let query = supabase
    .from("generations")
    .select("id, sessions!inner(user_id, anon_cookie_id)")
    .eq("id", generationId);
  query = owner.userId
    ? query.eq("sessions.user_id", owner.userId)
    : query.eq("sessions.anon_cookie_id", owner.anonCookieId).is("sessions.user_id", null);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("[db/has-owned-generation] OWNERSHIP_CHECK_FAILED", error);
    throw new Error("Failed to verify generation ownership.");
  }
  return Boolean(data);
}

export async function getPublicPrompt(
  slug: string,
): Promise<PublicPromptRow | null> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("public_prompts")
    .select("*, generations(*)")
    .eq("slug", slug)
    .eq("is_public", true)
    .single();
  if (error || !data) return null;
  await supabase
    .from("public_prompts")
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq("id", data.id);
  return { ...data, generation: data.generations } as PublicPromptRow;
}

export async function listPublicPrompts(params: {
  page: number;
  limit: number;
  tag?: string;
}): Promise<PublicPromptRow[]> {
  const supabase = createServiceRoleClient();
  const from = (params.page - 1) * params.limit;
  const to = from + params.limit - 1;
  let query = supabase
    .from("public_prompts")
    .select("*, generations(*)")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (params.tag) query = query.ilike("stack_summary", `%${params.tag}%`);
  const { data } = await query;
  return (data ?? []).map((row) => ({
    ...row,
    generation: row.generations,
  })) as PublicPromptRow[];
}
