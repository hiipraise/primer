"use client";

import { useState, useCallback, type FormEvent } from "react";

// ─── Types ───────────────────────────────────────────────────────────
export interface OnboardingAnswers {
  goal: string;
  constraints: string;
  stage: string;
}

export interface OnboardingWizardProps {
  onComplete: (answers: OnboardingAnswers) => void;
}

// ─── Questions ───────────────────────────────────────────────────────
interface Question {
  id: keyof OnboardingAnswers;
  label: string;
  placeholder: string;
  description: string;
}

const QUESTIONS: Question[] = [
  {
    id: "goal",
    label: "What are you trying to build or achieve?",
    placeholder: "e.g. A mobile-first e-commerce app for vintage clothing",
    description:
      "Be as specific as you can. The more detail you give, the better the output.",
  },
  {
    id: "constraints",
    label: "Any constraints?",
    placeholder:
      "e.g. Must be free tools, React preferred, need real-time updates",
    description:
      "Budget, timeline, tech preferences, or must-have features. If none, just type none.",
  },
  {
    id: "stage",
    label: "What stage are you at?",
    placeholder: "e.g. Idea only / Already started / Stuck and debugging",
    description:
      "This helps Primer tailor the prompt to where you actually are.",
  },
];

// ─── Component ───────────────────────────────────────────────────────
export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>({
    goal: "",
    constraints: "",
    stage: "",
  });
  const [inputValue, setInputValue] = useState("");

  const current = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;

  const handleNext = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (!inputValue.trim()) return;

      const updated = { ...answers, [current.id]: inputValue.trim() };
      setAnswers(updated);
      setInputValue("");

      if (isLast) {
        onComplete(updated);
      } else {
        setStep((s) => s + 1);
      }
    },
    [answers, current.id, inputValue, isLast, onComplete]
  );

  const progress = ((step + 1) / QUESTIONS.length) * 100;

  return (
    <div className="mx-auto w-full max-w-lg">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>
            Step {step + 1} of {QUESTIONS.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gray-900 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <form onSubmit={handleNext} className="space-y-4">
        <div>
          <label
            htmlFor={`onboarding-${current.id}`}
            className="block text-base font-medium text-gray-900"
          >
            {current.label}
          </label>
          <p className="mt-1 text-sm text-gray-500">{current.description}</p>
        </div>

        <textarea
          id={`onboarding-${current.id}`}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={current.placeholder}
          rows={3}
          autoFocus
          className="w-full resize-none rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder-gray-400 transition-colors focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleNext(e);
            }
          }}
        />

        <div className="flex items-center justify-between">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setStep((s) => s - 1);
                setInputValue(answers[QUESTIONS[step - 1].id]);
              }}
              className="text-sm text-gray-500 transition-colors hover:text-gray-700"
            >
              Back
            </button>
          )}
          <div className={step === 0 ? "ml-auto" : undefined}>
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLast ? "Start refining" : "Continue"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
