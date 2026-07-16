"use client";

import { useState } from "react";
import type { StackItem, ToolItem, SkillItem } from "./types";

// ─── Types ───────────────────────────────────────────────────────────
export interface RecommendationPanelProps {
  stack: StackItem[];
  tools: ToolItem[];
  skills: SkillItem[];
}

// ─── Collapsible section ─────────────────────────────────────────────
function CollapsibleSection({
  title,
  items,
  defaultOpen = false,
}: {
  title: string;
  items: { name: string; reason: string }[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-gray-50"
      >
        <span className="text-sm font-medium text-gray-900">{title}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-2 px-5 pb-4">
          {items.length === 0 && (
            <p className="text-sm text-gray-400">None recommended.</p>
          )}
          {items.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-500">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">{item.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────
export function RecommendationPanel({
  stack,
  tools,
  skills,
}: RecommendationPanelProps) {
  const hasItems = stack.length > 0 || tools.length > 0 || skills.length > 0;
  if (!hasItems) return null;

  return (
    <div className="animate-slide-in-from-bottom animate-in-delay-150 w-full">
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {/* Header */}
        <div className="border-b border-gray-100 bg-gray-50/50 px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Recommendations
          </h3>
          <p className="text-xs text-gray-500">
            Stack, tools, and skills matched to your idea
          </p>
        </div>

        {/* Sections */}
        <CollapsibleSection title="Stack" items={stack} defaultOpen />
        <CollapsibleSection title="Tools" items={tools} />
        <CollapsibleSection title="Skills & plugins" items={skills} />
      </div>
    </div>
  );
}
