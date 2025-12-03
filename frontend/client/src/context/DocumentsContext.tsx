import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { DocumentMeta } from "@/lib/types";
import { useAppointments } from "@/context/AppointmentsContext";

interface DocumentsContextValue {
  documents: DocumentMeta[];
  addDocument: (doc: Omit<DocumentMeta, "id" | "uploadedAt">) => DocumentMeta;
  updateDocument: (id: string, updates: Partial<DocumentMeta>) => DocumentMeta | undefined; // NEW
  attachDocumentToAppointment: (docId: string, appointmentId?: string) => void;
  detachDocumentsFromAppointment: (appointmentId: string) => void;
  deleteDocument: (docId: string) => void;
}

const DocumentsContext = createContext<DocumentsContextValue | undefined>(
  undefined,
);

const DOCUMENTS_KEY = "cs_documents";

function loadInitialDocuments(): DocumentMeta[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DOCUMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item: any) => normalizeDocument(item))
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      );
  } catch {
    return [];
  }
}

function normalizeDocument(input: any): DocumentMeta {
  const id =
    typeof input.id === "string" && input.id.length > 0
      ? input.id
      : `doc-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;

  const uploadedAt =
    typeof input.uploadedAt === "string"
      ? input.uploadedAt
      : new Date().toISOString();

  return {
    id,
    appointmentId:
      typeof input.appointmentId === "string" ? input.appointmentId : undefined,
    name:
      typeof input.name === "string" && input.name.length > 0
        ? input.name
        : "Document",
    sizeBytes: typeof input.sizeBytes === "number" ? input.sizeBytes : 0,
    mimeType:
      typeof input.mimeType === "string" && input.mimeType.length > 0
        ? input.mimeType
        : "application/octet-stream",
    uploadedAt,
    downloadUrl:
      typeof input.downloadUrl === "string" ? input.downloadUrl : undefined,
  };
}

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const { appointments, updateAppointment } = useAppointments();
  const [documents, setDocuments] = useState<DocumentMeta[]>(() =>
    loadInitialDocuments(),
  );

  // persist to localStorage
  useEffect(() => {
    try {
      window.localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(documents));
    } catch {
      // ignore storage issues (quota, private mode, etc.)
    }
  }, [documents]);

  const addDocument = (
    doc: Omit<DocumentMeta, "id" | "uploadedAt">,
  ): DocumentMeta => {
    const id =
      (doc as any).id ??
      `doc-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString()}`;

    const uploadedAt = new Date().toISOString();

    const normalized: DocumentMeta = {
      id,
      appointmentId: doc.appointmentId,
      name: doc.name || "Document",
      sizeBytes: doc.sizeBytes ?? 0,
      mimeType: doc.mimeType || "application/octet-stream",
      uploadedAt,
      downloadUrl: doc.downloadUrl,
    };

    setDocuments((prev) => [normalized, ...prev]);
    return normalized;
  };

  // NEW: Update document function
  const updateDocument = (id: string, updates: Partial<DocumentMeta>): DocumentMeta | undefined => {
    let updatedDoc: DocumentMeta | undefined;

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id !== id) return doc;
        updatedDoc = { ...doc, ...updates };
        return updatedDoc;
      }),
    );

    return updatedDoc;
  };

  /**
   * Attach a document to an appointment, or detach if appointmentId is undefined.
   * - When attaching, ensures only the target appointment has this docId in its documentIds.
   * - When detaching, removes this docId from all appointments' documentIds.
   */
  const attachDocumentToAppointment = (
    docId: string,
    appointmentId?: string,
  ) => {
    // Update document meta
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === docId ? { ...doc, appointmentId } : doc,
      ),
    );

    // Update appointments' documentIds to reflect this new link
    appointments.forEach((apt) => {
      const existing = apt.documentIds ?? [];
      const hasDoc = existing.includes(docId);

      if (!appointmentId) {
        // Detach from all appointments
        if (hasDoc) {
          const nextIds = existing.filter((id) => id !== docId);
          updateAppointment(apt.id, { documentIds: nextIds });
        }
        return;
      }

      if (apt.id === appointmentId) {
        // Target appointment: ensure docId is present
        const nextIds = hasDoc ? existing : [...existing, docId];
        updateAppointment(apt.id, { documentIds: nextIds });
      } else if (hasDoc) {
        // Any other appointment: ensure docId is removed (moving doc)
        const nextIds = existing.filter((id) => id !== docId);
        updateAppointment(apt.id, { documentIds: nextIds });
      }
    });
  };

  const detachDocumentsFromAppointment = (appointmentId: string) => {
    // Clear appointmentId from docs
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.appointmentId === appointmentId
          ? { ...doc, appointmentId: undefined }
          : doc,
      ),
    );

    // Clear documentIds on that appointment (used when deleting the appointment)
    const apt = appointments.find((a) => a.id === appointmentId);
    if (apt && apt.documentIds?.length) {
      updateAppointment(apt.id, { documentIds: [] });
    }
  };

  const deleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== docId));

    // Remove from any appointments that reference it
    appointments.forEach((apt) => {
      if (apt.documentIds?.includes(docId)) {
        const nextIds = apt.documentIds.filter((id) => id !== docId);
        updateAppointment(apt.id, { documentIds: nextIds });
      }
    });
  };

  const value: DocumentsContextValue = useMemo(
    () => ({
      documents,
      addDocument,
      updateDocument, // Include in context value
      attachDocumentToAppointment,
      detachDocumentsFromAppointment,
      deleteDocument,
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
  if (!ctx)
    throw new Error("useDocuments must be used within a DocumentsProvider");
  return ctx;
}