import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { CalendarClock, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SEVERITY = {
  red: "bg-red-50 text-red-700 border-red-200",
  amber: "bg-amber-50 text-amber-800 border-amber-200",
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function ComplianceItemsDialog({ card, open, onOpenChange }) {
  const groups = useMemo(() => {
    const map = new Map();
    (card?.items || []).forEach((item) => {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group).push(item);
    });
    return [...map.entries()];
  }, [card]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{card?.title}</DialogTitle>
          <DialogDescription>
            {card?.citation} · {card?.total ?? 0} item{(card?.total ?? 0) === 1 ? "" : "s"}
          </DialogDescription>
        </DialogHeader>

        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nothing is due or late for this measure.</p>
        ) : (
          <div className="space-y-4">
            {groups.map(([group, items]) => (
              <div key={group}>
                <div className="flex items-center gap-2 mb-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h4>
                  <span className="text-[10px] text-muted-foreground">{items.length}</span>
                </div>
                <div className="space-y-1">
                  {items.map((item) => (
                    <Link
                      key={item.id}
                      to={item.link || "/"}
                      onClick={() => onOpenChange(false)}
                      className="flex items-start gap-2 rounded-lg border border-border px-2.5 py-2 hover:bg-accent/40 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.label}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.sublabel}</p>
                      </div>
                      {typeof item.days === "number" && (
                        <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold", SEVERITY[item.severity] || SEVERITY.green)}>
                          <CalendarClock className="w-3 h-3" />
                          {item.days < 0 ? `Overdue ${Math.abs(item.days)}d` : item.days === 0 ? "Today" : `${item.days}d`}
                        </span>
                      )}
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground mt-1 shrink-0" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}