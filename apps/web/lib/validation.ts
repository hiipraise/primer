import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const formatSchema = z.enum(["claude-code", "cursor", "v0", "windsurf", "generic"]);

export const generateBodySchema = z.object({
  input: z.string().trim().min(1).max(4000),
  session_id: uuidSchema.optional(),
  format: formatSchema.optional(),
}).strict();

export const generationsQuerySchema = z.object({
  session_id: uuidSchema,
  version: z.string().regex(/^[1-9]\d{0,7}$/).optional(),
});

export const pageQuerySchema = z.object({
  page: z.string().regex(/^[1-9]\d{0,7}$/).optional(),
  limit: z.string().regex(/^[1-9]\d{0,2}$/).optional(),
});

export const exploreQuerySchema = pageQuerySchema.extend({
  tag: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(100).optional(),
});

export const publishBodySchema = z.object({
  is_public: z.boolean().optional(),
  title: z.string().trim().min(1).max(100).optional(),
  summary: z.string().trim().min(1).max(500).optional(),
}).strict();

export const reportBodySchema = z.object({
  reason: z.string().trim().max(500).optional(),
}).strict();

export const updateSessionBodySchema = z.object({
  title: z.string().trim().min(1).max(120),
}).strict();

export const authCallbackQuerySchema = z.object({
  code: z.string().min(1).max(4096).optional(),
  next: z.string().max(2048).optional(),
});

export function parsePage(value: string | undefined, fallback: number, max: number): number {
  if (!value) return fallback;
  return Math.min(max, Number(value));
}
