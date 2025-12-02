import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { DocumentMeta } from "@/lib/types";

interface DocumentsContextValue {
  documents: DocumentMeta[];
  addDocument: (doc: Omit<DocumentMeta, "id" | "uploadedAt">) => DocumentMeta;
  attachDocumentToAppointment: (docId: string, appointmentId: string) => void;
}

const DocumentsContext = createContext<DocumentsContextValue | undefined>(undefined);

const DOCUMENTS_KEY = "cs_documents";

const nowIso = () => new Date().toISOString();

const initialDocs: DocumentMeta[] = [
  {
    id: "doc-1",
    name: "Visit Summary - May 15, 2024",
    sizeBytes: 2_400_000,
    mimeType: "application/pdf",
    appointmentId: "apt-1",
    uploadedAt: nowIso(),
  },
  {
    id: "doc-2",
    name: "Lab Results - Lipid Panel",
    sizeBytes: 1_100_000,
    mimeType: "application/pdf",
    appointmentId: undefined,
    uploadedAt: nowIso(),
  },
  {
    id: "doc-3",
    name: "Cardiology Referral Letter",
    sizeBytes: 500_000,
    mimeType: "application/pdf",
    appointmentId: "apt-2",
    uploadedAt: nowIso(),
  },
];

function loadInitialDocuments(): DocumentMeta[] {
  if (typeof window === "undefined") return initialDocs;
  try {
    const raw = window.localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return initialDocs;
    const parsed = JSON.parse(raw) as DocumentMeta[];
    if (!Array.isArray(parsed)) return initialDocs;
    return parsed;
  } catch {
    return initialDocs;
  }
}

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DocumentMeta[]>(() => loadInitialDocuments());

  useEffect(() => {
    try {
      window.localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    } catch {
      // ignore
    }
  }, [documents]);

  const addDocument = (doc: Omit<DocumentMeta, "id" | "uploadedAt">): DocumentMeta => {
    const id = `doc-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;
    const newDoc: DocumentMeta = {
      ...doc,
      id,
      uploadedAt: nowIso(),
    };
    setDocuments(prev => [...prev, newDoc]);
    return newDoc;
  };

  const attachDocumentToAppointment = (docId: string, appointmentId: string) => {
    setDocuments(prev =>
      prev.map(doc =>
        doc.id === docId ? { ...doc, appointmentId } : doc,
      ),
    );
  };

  const value = useMemo(
    () => ({
      documents,
      addDocument,
      attachDocumentToAppointment,
    }),
    [documents],
  );

  return (
    <DocumentsContext.Provider value={value}>
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error("useDocuments must be used within a DocumentsProvider");
  return ctx;
}
