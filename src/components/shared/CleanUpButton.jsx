import React, { useState } from "react";
import { Sparkles, Loader2, Check, X, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { cn } from "@/lib/utils";

/**
 * CleanUpButton — sends the DSP's text to the AI and returns a clean,
 * professional note. Shows original and cleaned side by side.
 * DSP can edit, accept, or discard. Both versions are saved.
 *
 * Props:
 *   text: string — the current summary text
 *   onAccept: ({ original, cleaned }) => void
 *   goalTitles: string[] — active goal titles for context
 */
export default function CleanUpButton({ text, onAccept, goalTitles = [], disabled }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cleaned, setCleaned] = useState("");
  const [editing, setEditing] = useState(false);
  const [editedText, setEditedText] = useState("");

  const handleClean = async () => {
    if (!text || text.trim().length < 10) return;
    setLoading(true);
    setOpen(true);
    setCleaned("");
    setEditing(false);
    try {
      const goalContext = goalTitles.length > 0
        ? `\n\nGoals addressed this session: ${goalTitles.join(", ")}.`
        : "";
      const prompt = `You are a professional DSP (Direct Support Professional) note editor for I/DD services. Below is a raw session note written by a DSP. Rephrase and organize it into a clear, professional note.

CRITICAL RULES:
- Only rephrase and organize what the DSP wrote.
- NEVER add facts, goals, events, times, or observations that are not in the original text.
- NEVER invent details about the client or session.
- Keep all original facts intact.
- Organize into brief sections if the content supports it (e.g., "Goals Addressed", "Observations", "Highlights", "Health/Safety").
- Use professional, person-centered language.
- Keep it concise — match the length of the original.

Raw note:${goalContext}

${text}`;

      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      const result = typeof res === "string" ? res : res?.text || "";
      setCleaned(result || text);
      setEditedText(result || text);
    } catch {
      setCleaned(text);
      setEditedText(text);
    }
    setLoading(false);
  };

  const handleAccept = () => {
    onAccept({ original: text, cleaned: editing ? editedText : cleaned });
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClean}
        disabled={disabled || !text || text.trim().length < 10}
        className="gap-1.5 text-xs"
      >
        <Sparkles className="w-3.5 h-3.5 text-violet-500" />
        Clean This Up
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-500" />
              Clean Up Summary
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
              <p className="text-sm text-muted-foreground">Organizing your note…</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Original */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  Your Original
                </p>
                <div className="bg-muted/40 border border-border rounded-lg p-3 text-sm text-foreground max-h-64 overflow-y-auto whitespace-pre-wrap">
                  {text}
                </div>
              </div>

              {/* Cleaned */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-violet-600">
                    Cleaned Version
                  </p>
                  {editing && (
                    <button
                      type="button"
                      onClick={() => { setEditing(false); setEditedText(cleaned); }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Cancel edit
                    </button>
                  )}
                </div>
                {editing ? (
                  <Textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={8}
                    className="text-sm resize-none max-h-64"
                  />
                ) : (
                  <div
                    className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-sm text-foreground max-h-64 overflow-y-auto whitespace-pre-wrap cursor-text"
                    onClick={() => setEditing(true)}
                  >
                    {cleaned}
                  </div>
                )}
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="mt-1.5 flex items-center gap-1 text-xs text-violet-600 hover:underline"
                  >
                    <Edit3 className="w-3 h-3" /> Edit cleaned version
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
            <p className="text-xs text-amber-700">
              <strong>AI assistance:</strong> Only rephrases and organizes what you wrote. Never adds facts. Review carefully before accepting.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Discard
            </Button>
            <Button onClick={handleAccept} disabled={loading || !cleaned} className="bg-violet-600 hover:bg-violet-700">
              <Check className="w-4 h-4 mr-1" /> Accept Cleaned Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}