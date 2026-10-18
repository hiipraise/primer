import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { createPrimerApiKey, listPrimerApiKeys, revokePrimerApiKey, createServerSupabaseClient } from "@primer/db";
import { apiKeyBodySchema, uuidSchema } from "../../../../lib/validation";
import { internalError } from "../../../../lib/api-error";

async function authenticatedUser() {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
}

export async function GET() {
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage API keys.", code: "UNAUTHORIZED" }, { status: 401 });
    return NextResponse.json({ keys: await listPrimerApiKeys(user.id) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return internalError("api/v1/keys", error, "API_KEYS_FAILED"); }
}

export async function POST(request: Request) {
  const parsed = apiKeyBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a valid API key name.", code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage API keys.", code: "UNAUTHORIZED" }, { status: 401 });
    const secret = `pr_live_${randomBytes(32).toString("base64url")}`;
    const key = await createPrimerApiKey({ userId: user.id, name: parsed.data.name, keyHash: createHash("sha256").update(secret).digest("hex"), keyPrefix: secret.slice(0, 14) });
    return NextResponse.json({ key: { id: key.id, name: key.name, prefix: key.key_prefix, created_at: key.created_at }, secret }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) { return internalError("api/v1/keys", error, "API_KEY_CREATE_FAILED"); }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !uuidSchema.safeParse(id).success) return NextResponse.json({ error: "Provide a valid key ID.", code: "INVALID_REQUEST" }, { status: 400 });
  try {
    const user = await authenticatedUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage API keys.", code: "UNAUTHORIZED" }, { status: 401 });
    const revoked = await revokePrimerApiKey(id, user.id);
    return revoked ? NextResponse.json({ revoked: true }) : NextResponse.json({ error: "API key not found.", code: "KEY_NOT_FOUND" }, { status: 404 });
  } catch (error) { return internalError("api/v1/keys", error, "API_KEY_REVOKE_FAILED"); }
}
