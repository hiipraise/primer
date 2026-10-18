import { NextResponse } from "next/server";
import { reportPublicPrompt } from "@primer/db";
import { reportBodySchema } from "../../../../../lib/validation";
import { internalError } from "../../../../../lib/api-error";

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 120) return NextResponse.json({ error: "Prompt not found.", code: "PROMPT_NOT_FOUND" }, { status: 404 });
  const body = await request.json().catch(() => null);
  if (!reportBodySchema.safeParse(body).success) return NextResponse.json({ error: "Invalid report request.", code: "INVALID_REQUEST" }, { status: 400 });
  try {
    if (!(await reportPublicPrompt(slug))) return NextResponse.json({ error: "Prompt not found.", code: "PROMPT_NOT_FOUND" }, { status: 404 });
    return NextResponse.json({ reported: true });
  } catch (error) { return internalError("api/public-prompts/report", error, "REPORT_FAILED"); }
}
