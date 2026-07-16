"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";

// ─── Types ───────────────────────────────────────────────────────────
export interface ChatInputProps {
  onSubmit: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Pre-fill the input (e.g. from onboarding answers) */
  initialValue?: string;
}

// ─── Component ───────────────────────────────────────────────────────
export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = "Describe your idea...",
  initialValue = "",
}: ChatInputProps) {
  const [value, setValue] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea as content grows
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!value.trim() || disabled) return;
      onSubmit(value.trim());
    },
    [value, disabled, onSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter submits, Shift+Enter adds a newline
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    },
    [handleSubmit]
  );

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative flex items-end gap-2 rounded-xl border border-gray-200 bg-white p-2 shadow-sm transition-shadow focus-within:border-gray-400 focus-within:shadow-md">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            adjustHeight();
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="min-h-[44px] flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        <button
          type="submit"
          disabled={!value.trim() || disabled}
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-900 text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Generate"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 12h14M12 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
    </form>
  );
}
