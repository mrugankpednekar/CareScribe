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
  addTranscript: (input: { appointmentId: string; lines: string[]; documentId?: string }) => Transcript;
  deleteTranscriptsForAppointment: (appointmentId: string) => void;
  deleteTranscript: (transcriptId: string) => void;
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

  const addTranscript = (input: { appointmentId: string; lines: string[]; documentId?: string }): Transcript => {
    const id = `tr-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;
    const createdAt = new Date().toISOString();
    const title = `Visit transcript - ${new Date().toLocaleString()}`;

    const transcript: Transcript = {
      id,
      appointmentId: input.appointmentId,
      createdAt,
      title,
      lines: input.lines,
      documentId: input.documentId,
    };

    setTranscripts((prev) => [...prev, transcript]);
    return transcript;
  };

  const deleteTranscriptsForAppointment = (appointmentId: string) => {
    setTranscripts(prev =>
      prev.filter(transcript => transcript.appointmentId !== appointmentId)
    );
  };

  const deleteTranscript = (transcriptId: string) => {
    setTranscripts((prev) => prev.filter((t) => t.id !== transcriptId));
  };

  const value = useMemo<TranscriptsContextValue>(
    () => ({
      transcripts,
      addTranscript,
      deleteTranscriptsForAppointment,
      deleteTranscript,
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