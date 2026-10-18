"use client";

import { useCallback, useState } from "react";
import type { GenerateInput, GenerationResult } from "./types";

interface ApiResponse extends Partial<GenerationResult> {
  error?: string;
  code?: string;
  cap?: number;
  used?: number;
}
export interface GenerateOutcome { result?: GenerationResult; capped?: { used: number; cap: number } }

async function readSse(response: Response, onSection: (name: string, value: unknown) => void): Promise<ApiResponse> {
  if (!response.ok) return response.json() as Promise<ApiResponse>;
  if (!response.body) throw new Error("Generation stream was unavailable.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let complete: ApiResponse | undefined;
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";
    for (const eventFrame of events) {
      const event = eventFrame.match(/^event:\s*(.+)$/m)?.[1];
      const data = eventFrame.match(/^data:\s*(.+)$/m)?.[1];
      if (!event || !data) continue;
      const payload = JSON.parse(data) as ApiResponse & { section?: string; value?: unknown };
      if (event === "section" && payload.section) onSection(payload.section, payload.value);
      if (event === "complete") complete = payload;
      if (event === "error") throw new Error(payload.error ?? "Generation failed.");
    }
    if (done) break;
  }
  if (!complete) throw new Error("Generation stream ended before completion.");
  return complete;
}

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamedSections, setStreamedSections] = useState<string[]>([]);
  const [streamedContent, setStreamedContent] = useState<Record<string, unknown>>({});

  const generate = useCallback(async (input: GenerateInput): Promise<GenerateOutcome> => {
    setLoading(true);
    setError(null);
    setStreamedSections([]);
    setStreamedContent({});
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await readSse(response, (section, value) => {
        setStreamedSections((current) => [...current, section]);
        setStreamedContent((current) => ({ ...current, [section]: value }));
      });
      if (response.status === 403 && data.code === "ANON_CAP_REACHED") {
        return { capped: { used: data.used ?? 0, cap: data.cap ?? 3 } };
      }
      if (!response.ok) throw new Error(data.error ?? "Generation failed.");
      if (!data.prompt || !data.session_id) throw new Error("The generated result was incomplete.");
      return {
        result: {
          prompt: data.prompt,
          stack: data.stack ?? [],
          tools: data.tools ?? [],
          skills: data.skills ?? [],
          session_id: data.session_id,
          generation_id: data.generation_id,
          version_number: data.version_number ?? 1,
          created_at: data.created_at,
          spec: data.spec,
          files: data.files,
          change_summary: data.change_summary,
        },
      };
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Generation failed.");
      return {};
    } finally {
      setLoading(false);
    }
  }, []);

  return { generate, loading, error, setError, streamedSections, streamedContent };
}
