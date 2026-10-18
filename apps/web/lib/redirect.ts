/** Only accept a same-origin path beginning with exactly one slash. */
export function sanitizeNextPath(next: string | null | undefined): string {
  if (
    !next ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\") ||
    /[a-z][a-z\d+.-]*:/i.test(next)
  ) {
    return "/";
  }
  return next;
}
