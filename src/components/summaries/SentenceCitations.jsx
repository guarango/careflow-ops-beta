import React, { useState } from "react";
import { Link2, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

/**
 * Renders the narrative sentence by sentence. Hovering a sentence highlights the
 * approved session notes behind it in the side panel.
 */
export default function SentenceCitations({ citations = [], notes = [], fallbackText }) {
  const [active, setActive] = useState(-1);

  const notesById = Object.fromEntries(notes.map(n => [n.id, n]));
  const activeIds = active >= 0 ? (citations[active]?.source_note_ids || []) : [];
  const hasSentences = citations.length > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <div className="text-sm leading-relaxed">
        {hasSentences ? (
          citations.map((c, i) => (
            <span
              key={i}
              onMouseEnter={() => setActive(i)}
              onFocus={() => setActive(i)}
              tabIndex={0}
              className={cn(
                "rounded-sm px-0.5 outline-none transition-colors",
                active === i ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-muted"
              )}
            >
              {c.text}{" "}
            </span>
          ))
        ) : (
          <p className={cn(!fallbackText && "text-muted-foreground")}>{fallbackText || "No data recorded."}</p>
        )}
      </div>

      <aside className="border-t lg:border-t-0 lg:border-l pt-3 lg:pt-0 lg:pl-4">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1 mb-2">
          <Link2 className="w-3 h-3" />
          {active >= 0 ? "Source notes for this sentence" : "All source notes"}
        </p>
        {notes.length === 0 ? (
          <p className="text-xs text-muted-foreground">No approved session notes cited.</p>
        ) : (
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {notes.map(n => {
              const highlighted = activeIds.includes(n.id);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "rounded-md border p-2 text-xs transition-colors",
                    highlighted ? "border-primary/50 bg-primary/5" : "border-border bg-muted/20"
                  )}
                >
                  <div className="flex items-center gap-1 font-medium">
                    <FileText className="w-3 h-3 shrink-0" />
                    {n.date ? format(parseISO(n.date), "MMM d, yyyy") : "Note"}
                    {n.staff_name && <span className="font-normal text-muted-foreground">· {n.staff_name}</span>}
                  </div>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2">
                    {n.summary || n.ai_cleaned_summary || "No summary text"}
                  </p>
                  <p className="text-[10px] text-muted-foreground/70 mt-0.5">ID {String(n.id).slice(-6)}</p>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </div>
  );
}