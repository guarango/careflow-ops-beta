import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ReportStatCard({ title, value, subtitle, trend, trendLabel, color = "blue", icon: Icon }) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    green: "bg-green-500/10 text-green-500 border-green-500/20",
    amber: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    red: "bg-red-500/10 text-red-500 border-red-500/20",
    purple: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    cyan: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  };

  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? "text-green-500" : trend < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className={cn("border", colorMap[color])}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{title}</p>
            <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>}
          </div>
          {Icon && (
            <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", colorMap[color])}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
        {trendLabel !== undefined && (
          <div className={cn("flex items-center gap-1 mt-2 text-xs font-medium", trendColor)}>
            <TrendIcon className="w-3 h-3" />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}