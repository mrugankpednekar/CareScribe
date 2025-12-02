import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Transcript } from "@/lib/types";

interface TranscriptsContextValue {
  transcripts: Transcript[];
  addTranscript: (input: { appointmentId: string; lines: string[] }) => Transcript;
}

const TranscriptsContext = createContext<TranscriptsContextValue | undefined>(undefined);

const TRANSCRIPTS_KEY = "cs_transcripts";

function loadInitialTranscripts(): Transcript[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRANSCRIPTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Transcript[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function TranscriptsProvider({ children }: { children: ReactNode }) {
  const [transcripts, setTranscripts] = useState<Transcript[]>(() => loadInitialTranscripts());

  useEffect(() => {
    try {
      window.localStorage.setItem(TRANSCRIPTS_KEY, JSON.stringify(transcripts));
    } catch {
      // ignore
    }
  }, [transcripts]);

  const addTranscript = (input: { appointmentId: string; lines: string[] }): Transcript => {
    const id = `tr-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;
    const createdAt = new Date().toISOString();
    const title = `Visit transcript - ${new Date().toLocaleString()}`;

    const transcript: Transcript = {
      id,
      appointmentId: input.appointmentId,
      createdAt,
      title,
      lines: input.lines,
    };

    setTranscripts((prev) => [...prev, transcript]);
    return transcript;
  };

  const value = useMemo(
    () => ({
      transcripts,
      addTranscript,
    }),
    [transcripts],
  );

  return (
    <TranscriptsContext.Provider value={value}>
      {children}
    </TranscriptsContext.Provider>
  );
}

export function useTranscripts() {
  const ctx = useContext(TranscriptsContext);
  if (!ctx) {
    throw new Error("useTranscripts must be used within a TranscriptsProvider");
  }
  return ctx;
}
