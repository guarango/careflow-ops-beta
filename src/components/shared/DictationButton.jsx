import React, { useEffect } from "react";
import { Mic, Square } from "lucide-react";
import { useDictation } from "@/hooks/useDictation";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

/**
 * DictationButton — microphone button for free-text fields.
 * Appends spoken words (English) to the field's current value.
 *
 * Props:
 *   value: string — current field value
 *   onChange: (newValue) => void
 *   className: optional
 */
export default function DictationButton({ value, onChange, className }) {
  const { toast } = useToast();
  const { isListening, supported, start, stop, error } = useDictation((text) => {
    const separator = value && !value.endsWith(" ") && !value.endsWith("\n") ? " " : "";
    onChange((value || "") + separator + text.trim() + " ");
  });

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Microphone couldn't start",
        description: error,
      });
    }
  }, [error, toast]);

  if (!supported) return null;

  const toggle = () => {
    if (isListening) stop();
    else start();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={isListening ? "Stop dictation" : "Dictate with voice"}
      aria-label={isListening ? "Stop dictation" : "Dictate with voice"}
      className={cn(
        "flex items-center justify-center w-8 h-8 rounded-lg border transition-all shrink-0",
        isListening
          ? "bg-red-500 border-red-500 text-white animate-pulse"
          : "bg-white border-border text-muted-foreground hover:text-primary hover:border-primary/30",
        className
      )}
    >
      {isListening ? <Square className="w-3.5 h-3.5" /> : <Mic className="w-4 h-4" />}
    </button>
  );
}