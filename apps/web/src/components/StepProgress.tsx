import { cn } from "@/lib/cn";

export function StepProgress({
  step,
  total,
  labels,
}: {
  step: number;
  total: number;
  labels?: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Paso {step} de {total}
        </span>
        {labels?.[step - 1] ? (
          <span className="font-medium text-foreground">{labels[step - 1]}</span>
        ) : null}
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition",
              i < step ? "bg-primary" : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
