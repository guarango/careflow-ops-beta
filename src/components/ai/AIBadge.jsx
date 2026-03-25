import React from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export default function AIBadge({ label = "AI-Assisted", className }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30", className)}>
      <Sparkles className="w-3 h-3" />
      {label}
    </span>
  );
}