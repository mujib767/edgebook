import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "profit" | "loss";
  icon?: ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
        <p
          className={cn(
            "mt-2 text-2xl font-mono-tabular font-semibold",
            tone === "profit" && "text-profit",
            tone === "loss" && "text-loss",
          )}
        >
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
