"use client";

import { ProgressBar } from "@/components/ui/progress";

interface ProgressProps {
  current: number;
  total: number;
}

export function Progress({ current, total }: ProgressProps) {
  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between text-sm text-neutral-500">
        <span>
          第 {current} / {total} 部分
        </span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <ProgressBar value={current} max={total} showLabel={false} />
    </div>
  );
}
