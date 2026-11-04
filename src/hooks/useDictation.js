import { useState, useRef, useCallback, useEffect } from "react";

const ERROR_MESSAGES = {
  "not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  "service-not-allowed": "Microphone access is blocked. Allow the microphone for this site in your browser settings, then try again.",
  "audio-capture": "No microphone was found. Check that one is connected and try again.",
  network: "Speech recognition needs a connection. Check your network and try again.",
  "language-not-supported": "This browser does not support English speech recognition.",
};

/**
 * useDictation — wraps the browser's SpeechRecognition API (English).
 * Appends transcribed words to a target string value.
 *
 * Returns:
 *   isListening, supported, start, stop, error
 */
export function useDictation(onText) {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState(null);
  const recognitionRef = useRef(null);
  // Hold the latest callback in a ref so the speech engine is created once,
  // instead of being torn down and rebuilt on every parent render.
  const onTextRef = useRef(onText);

  useEffect(() => {
    onTextRef.current = onText;
  }, [onText]);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onresult = (event) => {
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        }
      }
      if (final.trim()) {
        onTextRef.current(final);
      }
    };

    rec.onerror = (e) => {
      // "no-speech" and "aborted" are harmless; anything else is worth surfacing.
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(ERROR_MESSAGES[e.error] || `Speech recognition stopped (${e.error}).`);
      }
      setIsListening(false);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      try {
        rec.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    const rec = recognitionRef.current;
    if (!rec) return;
    setError(null);
    try {
      rec.start();
      setIsListening(true);
    } catch {
      // InvalidStateError means a session is already running — treat as listening.
      setIsListening(true);
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recognitionRef.current;
    if (rec) {
      try {
        rec.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  return { isListening, supported, start, stop, error };
}