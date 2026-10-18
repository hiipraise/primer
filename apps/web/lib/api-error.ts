import { NextResponse } from "next/server";

export function internalError(
  route: string,
  error: unknown,
  code: string,
  message = "The request could not be completed.",
) {
  console.error(`[${route}] ${code}`, error);
  return NextResponse.json({ error: message, code }, { status: 500 });
}
