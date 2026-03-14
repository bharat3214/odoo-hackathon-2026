"use client";

import { cn } from "@/lib/utils";

interface StatusStepperProps {
  currentStatus: string;
}

const steps = [
  { key: "DRAFT", label: "Draft" },
  { key: "WAITING", label: "Waiting" },
  { key: "READY", label: "Ready" },
  { key: "DONE", label: "Done" },
];

export function StatusStepper({ currentStatus }: StatusStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentStatus);
  const isCancelled = currentStatus === "CANCELLED";

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isComplete = i < currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 transition-colors",
                  isCancelled
                    ? "border-muted bg-muted text-muted-foreground"
                    : isComplete
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : isCurrent
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                {isComplete ? "✓" : i + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] mt-1",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 h-0.5 mb-4",
                  isComplete ? "bg-emerald-600" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
      {isCancelled && (
        <div className="ml-3 flex flex-col items-center">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-red-500 bg-red-500 text-white">
            ✕
          </div>
          <span className="text-[10px] mt-1 text-red-500 font-medium">Cancelled</span>
        </div>
      )}
    </div>
  );
}
