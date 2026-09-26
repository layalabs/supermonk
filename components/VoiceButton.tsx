"use client";

import { useEffect, useRef, useState } from "react";

// Web Speech API (Safari iOS, Chrome). English only for the MVP. Hidden where unsupported,
// so the text box is always the fallback.

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
};

function getRecognition(): (new () => Recognition) | undefined {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export default function VoiceButton({
  onInterim,
  onFinal,
  className = "",
}: {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  className?: string;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const finalText = useRef("");

  useEffect(() => {
    setSupported(Boolean(getRecognition()));
    return () => rec.current?.abort();
  }, []);

  if (!supported) return null;

  const toggle = () => {
    if (listening) {
      rec.current?.stop();
      return;
    }
    const Ctor = getRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    finalText.current = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText.current += res[0].transcript;
        else interim += res[0].transcript;
      }
      onInterim((finalText.current + interim).trim());
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone blocked. Type instead." : "Didn't catch that. Try again or type.");
    };
    r.onend = () => {
      setListening(false);
      const text = finalText.current.trim();
      if (text) onFinal(text);
    };
    setError(null);
    rec.current = r;
    r.start();
    setListening(true);
  };

  return (
    <div className={`flex flex-col items-end gap-1 ${className}`}>
      <button
        type="button"
        onClick={toggle}
        aria-label={listening ? "Stop listening" : "Speak your request"}
        aria-pressed={listening}
        className={`flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95 ${
          listening ? "animate-pulse bg-cape text-cream" : "bg-brand text-navy"
        }`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
          <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z" />
        </svg>
      </button>
      {error ? <span className="max-w-48 text-right text-xs text-cape">{error}</span> : null}
    </div>
  );
}
