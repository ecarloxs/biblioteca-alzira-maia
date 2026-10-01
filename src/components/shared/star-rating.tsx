"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  onChange,
  size = "md",
  showValue = false,
}: {
  value: number;
  onChange?: (value: number) => void;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
}) {
  const interactive = Boolean(onChange);
  const sizeClass = size === "sm" ? "size-3.5" : size === "lg" ? "size-6" : "size-4";

  return (
    <div className="inline-flex items-center gap-0.5" role={interactive ? "radiogroup" : undefined} aria-label="Avaliação em estrelas">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        return interactive ? (
          <button
            key={n}
            type="button"
            onClick={() => onChange?.(n)}
            aria-label={`${n} estrela${n > 1 ? "s" : ""}`}
            className="rounded p-0.5 transition-transform hover:scale-110"
          >
            <Star className={cn(sizeClass, filled ? "fill-accent text-accent" : "text-muted-foreground/40")} />
          </button>
        ) : (
          <Star key={n} className={cn(sizeClass, filled ? "fill-accent text-accent" : "text-muted-foreground/30")} />
        );
      })}
      {showValue && <span className="ml-1 text-sm font-semibold text-foreground">{value.toFixed(1)}</span>}
    </div>
  );
}
