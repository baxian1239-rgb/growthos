"use client";

import { cn } from "@/lib/utils";
import { OPTION_LABELS, OptionValue } from "@/types";

interface OptionButtonProps {
  option: OptionValue;
  selected: boolean;
  onClick: () => void;
}

export function OptionButton({ option, selected, onClick }: OptionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left text-sm transition-all duration-200",
        selected
          ? "border-[#0071e3] bg-[#0071e3]/5 text-neutral-900 shadow-sm"
          : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
          selected
            ? "bg-[#0071e3] text-white"
            : "bg-neutral-100 text-neutral-500"
        )}
      >
        {option}
      </span>
      <span className="font-medium">{OPTION_LABELS[option]}</span>
    </button>
  );
}
