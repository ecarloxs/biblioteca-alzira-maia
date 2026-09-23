import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/constants";

const toneBg: Record<Tone, string> = {
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-muted text-foreground",
};

export function StatCard({
  label,
  value,
  icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors hover:border-primary/30">
      <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-md [&_svg]:size-5", toneBg[tone])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 truncate text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}
