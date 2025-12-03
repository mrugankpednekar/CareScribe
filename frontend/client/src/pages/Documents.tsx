import { useMemo, useState, ChangeEvent } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/layout/Layout";
import {
  FileText,
  Upload,
  Download,
  X,
  Trash2,
  Search,
  Eye,
  Sparkles,
} from "lucide-react";
import { useAppointments } from "@/context/AppointmentsContext";
import { useDocuments } from "@/context/DocumentsContext";
import { useTranscripts } from "@/context/TranscriptsContext";
import { Input } from "@/components/ui/input";
import type { DocumentMeta } from "@/lib/types";

export default function Documents() {
  const [, setLocation] = useLocation();
  const { appointments, updateAppointment } = useAppointments();
  const {
    documents,
    addDocument,
    deleteDocument,
    updateDocument,
    detachDocumentsFromAppointment,
  } = useDocuments();
  const { transcripts, deleteTranscript } = useTranscripts();

  // Upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [targetAppointmentId, setTargetAppointmentId] = useState<string | "none">(
    "none",
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Export full report state
  const [isExporting, setIsExporting] = useState(false);

  // Preview modal
  const [previewDoc, setPreviewDoc] = useState<DocumentMeta | null>(null);

  // Summary generation
  const [summaryLoadingId, setSummaryLoadingId] = useState<string | null>(null);

  // Rename/Delete state
  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDocId, setConfirmingDocId] = useState<string | null>(null);

  const sortedDocuments = useMemo(
    () =>
      [...documents].sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
      ),
    [documents],
  );

  const handleUploadClick = () => {
    setShowUploadModal(true);
    setUploadingFile(null);
    setFileName("");
    setTargetAppointmentId("none");
    setUploadError(null);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setUploadingFile(file);
    setFileName(file?.name || "");
    setUploadError(null);
  };

  const handleUpload = async () => {
    if (!uploadingFile) {
      setUploadError("Please select a file first.");
      return;
    }

    try {
      const file = uploadingFile;
      const reader = new FileReader();

      reader.onload = () => {
        const dataUrl = reader.result as string;
        const name = fileName.trim() || file.name;

        const docInput: Omit<DocumentMeta, "id" | "uploadedAt"> = {
          name,
          sizeBytes: file.size,
          mimeType: file.type || "application/octet-stream",
          appointmentId:
            targetAppointmentId === "none" ? undefined : targetAppointmentId,
          downloadUrl: dataUrl,
        };

        const created = addDocument(docInput);

        if (targetAppointmentId !== "none") {
          const apt = appointments.find(a => a.id === targetAppointmentId);
          if (apt) {
            const currentIds = apt.documentIds ?? [];
            const updatedIds = [...currentIds, created.id];
            updateAppointment(apt.id, { documentIds: updatedIds });
          }
        }

        setShowUploadModal(false);
        setUploadingFile(null);
        setFileName("");
        setTargetAppointmentId("none");
        setUploadError(null);
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setUploadError("Something went wrong while reading the file.");
    }
  };

  const handleDelete = (id: string) => {
    // Check if transcript
    const transcript = transcripts.find(t => t.documentId === id);
    if (transcript) {
      deleteTranscript(transcript.id);
    }
    deleteDocument(id);
  };

  const handleRename = (id: string, newName: string) => {
    updateDocument(id, { name: newName });
  };

  const handleOpenPreview = (doc: DocumentMeta) => {
    setPreviewDoc(doc);
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
  };

  const handleDownload = (doc: DocumentMeta) => {
    if (!doc.downloadUrl) return;
    try {
      const link = document.createElement("a");
      link.href = doc.downloadUrl;
      link.download = doc.name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      // ignore
    }
  };

  const handleChangeAttachment = (docId: string, appointmentId: string) => {
    updateDocument(docId, { appointmentId: appointmentId === "none" ? undefined : appointmentId });

    if (appointmentId === "none") {
      appointments.forEach(apt => {
        if (apt.documentIds?.includes(docId)) {
          const updatedIds = apt.documentIds.filter(id => id !== docId);
          updateAppointment(apt.id, { documentIds: updatedIds });
        }
      });
      return;
    }

    appointments.forEach(apt => {
      const currentIds = apt.documentIds ?? [];
      if (apt.id === appointmentId) {
        if (!currentIds.includes(docId)) {
          updateAppointment(apt.id, { documentIds: [...currentIds, docId] });
        }
      } else if (currentIds.includes(docId)) {
        const updatedIds = currentIds.filter(id => id !== docId);
        updateAppointment(apt.id, { documentIds: updatedIds });
      }
    });
  };

  const normalize = (s?: string) => (s || "").toLowerCase();

  const matchesSearch = (doc: DocumentMeta) => {
    if (!searchQuery.trim()) return true;
    const q = normalize(searchQuery);

    const apt = appointments.find((a) => a.id === doc.appointmentId);
    const doctor = normalize(apt?.doctor);
    const specialty = normalize(apt?.specialty);
    const labType = normalize(apt?.labType);

    const docName = normalize(doc.name);
    const mime = normalize(doc.mimeType);

    const uploadedDateIso = doc.uploadedAt;
    const uploadedDateHuman = uploadedDateIso
      ? new Date(uploadedDateIso).toLocaleDateString()
      : "";

    const aptDateIso = apt?.date;
    const aptDateHuman = aptDateIso
      ? new Date(aptDateIso).toLocaleDateString()
      : "";

    const haystack = normalize(
      [
        docName,
        mime,
        doctor,
        specialty,
        labType,
        aptDateIso,
        aptDateHuman,
        uploadedDateIso,
        uploadedDateHuman,
      ].join(" "),
    );

    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  };

  const filteredDocuments = sortedDocuments.filter(matchesSearch);

  const handleGenerateFullReport = async () => {
    try {
      setIsExporting(true);
      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      // In real app, fetch PDF blob
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleGenerateSummary = async (doc: DocumentMeta) => {
    setSummaryLoadingId(doc.id);
    setTimeout(() => {
      setSummaryLoadingId(null);
    }, 2000);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmingDocId(id);
  };

  const startRenaming = (doc: DocumentMeta) => {
    setRenamingDocId(doc.id);
    setRenameValue(doc.name);
  };

  const handleRenameSubmit = (docId: string) => {
    if (!renameValue.trim()) return;
    handleRename(docId, renameValue.trim());
    setRenamingDocId(null);
  };

  const handleConfirmDelete = (id: string) => {
    handleDelete(id);
    setConfirmingDocId(null);
  };

  const handleCancelDelete = () => {
    setConfirmingDocId(null);
  };

  const isSummaryLoading = (docId: string) => summaryLoadingId === docId;

  const renderPreviewContent = (doc: DocumentMeta | null) => {
    if (!doc) return null;
    if (!doc.downloadUrl) {
      return (
        <p className="text-sm text-muted-foreground">
          This document doesn&apos;t have a preview URL.
        </p>
      );
    }
    if (doc.mimeType?.startsWith("image/")) {
      return (
        <div className="w-full h-[70vh] flex items-center justify-center overflow-auto">
          <img
            src={doc.downloadUrl}
            alt={doc.name}
            className="max-h-full max-w-full object-contain"
          />
        </div>
      );
    }
    if (doc.mimeType === "application/pdf") {
      return (
        <iframe
          src={doc.downloadUrl}
          title={doc.name}
          className="w-full h-[70vh] rounded-lg border border-border"
        />
      );
    }
    return (
      <p className="text-sm text-muted-foreground">
        Preview not available for this file type. Try downloading it instead.
      </p>
    );
  };

  const resolveAppointmentLabel = (doc: DocumentMeta) => {
    if (!doc.appointmentId) return "Unattached";
    const apt = appointments.find((a) => a.id === doc.appointmentId);
    if (!apt) return "Unknown Appointment";
    if (apt.type === "lab") return `${apt.labType || "Lab"} • ${new Date(apt.date || "").toLocaleDateString()}`;
    return `${apt.doctor} • ${new Date(apt.date || "").toLocaleDateString()}`;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Documents & Reports
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload lab reports, visit summaries, and other health documents.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateFullReport}
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-primary/60 text-xs font-medium text-primary hover:bg-primary/5 disabled:opacity-60"
            >
              <Sparkles className="w-4 h-4" />
              {isExporting ? "Generating..." : "Export full history"}
            </button>

            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
            >
              <Upload className="w-4 h-4" />
              Upload document
            </button>
          </div>
        </div>

        {/* Document list */}
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Your documents
              </h2>
              <p className="text-xs text-muted-foreground">
                {sortedDocuments.length} file
                {sortedDocuments.length === 1 ? "" : "s"}
              </p>
            </div>

            {/* Loading bar for summary generation */}
            {summaryLoadingId && (
              <div className="mb-4 h-1 w-full rounded-full bg-muted overflow-hidden">
                <div className="h-full w-1/3 animate-pulse bg-primary" />
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground">No documents found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {filteredDocuments.map((doc) => {
                const isRenaming = renamingDocId === doc.id;
                const isConfirming = confirmingDocId === doc.id;
                const sizeLabel = doc.sizeBytes
                  ? `${Math.round(doc.sizeBytes / 1024)} KB`
                  : "";

                return (
                  <div
                    key={doc.id}
                    className={`relative flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted/60 transition-colors group ${doc.appointmentId ? "cursor-pointer" : ""}`}
                    onClick={(e) => {
                      // Prevent navigation if clicking on interactive elements
                      if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select')) {
                        return;
                      }
                      if (doc.appointmentId) {
                        setLocation(`/appointment/${doc.appointmentId}`);
                      }
                    }}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-8 text-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleRenameSubmit(doc.id);
                              }
                              if (e.key === "Escape") {
                                setRenamingDocId(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSubmit(doc.id)}
                            className="text-xs font-semibold text-primary hover:underline"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setRenamingDocId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-foreground truncate">
                            {doc.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {doc.mimeType || "Document"}
                            {sizeLabel ? ` • ${sizeLabel}` : ""}
                          </p>

                          <div className="mt-0.5 flex flex-wrap items-center gap-2">
                            <p className="text-[11px] text-muted-foreground truncate">
                              {resolveAppointmentLabel(doc)}
                            </p>

                            {appointments.length > 0 && (
                              <select
                                value={doc.appointmentId ?? "none"}
                                onChange={(e) =>
                                  handleChangeAttachment(doc.id, e.target.value)
                                }
                                disabled={transcripts.some(t => t.documentId === doc.id)}
                                className="text-[12px] border border-border bg-background rounded-lg px-2 py-1 h-9 max-w-[260px] font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                title={transcripts.some(t => t.documentId === doc.id) ? "Transcripts cannot be moved" : "Change attachment"}
                              >
                                <option value="none">None</option>
                                {appointments.map((apt) => {
                                  const isLab = apt.type === "lab";
                                  const dateLabel = apt.date
                                    ? new Date(apt.date).toLocaleDateString()
                                    : "No date";
                                  const label = isLab
                                    ? `${apt.labType || "Lab work"} (Lab) • ${dateLabel}`
                                    : `${apt.doctor || "Provider"}${apt.specialty
                                      ? ` - ${apt.specialty}`
                                      : ""
                                    } • ${dateLabel}`;
                                  return (
                                    <option key={apt.id} value={apt.id}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(doc)}
                        className="p-2 rounded-full hover:bg-muted"
                        aria-label="Preview document"
                      >
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleGenerateSummary(doc)}
                        disabled={isSummaryLoading(doc.id)}
                        className="p-2 rounded-full hover:bg-muted disabled:opacity-40"
                        aria-label="Generate AI summary"
                      >
                        <Sparkles className="w-5 h-5 text-foreground" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="p-2 rounded-full border border-border hover:bg-muted disabled:opacity-40"
                        disabled={!doc.downloadUrl}
                        aria-label="Download document"
                      >
                        <Download className="w-5 h-5 text-foreground" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteClick(doc.id)}
                        className="p-2 rounded-full hover:bg-muted"
                        aria-label="Delete document"
                      >
                        <Trash2 className="w-5 h-5 text-muted-foreground" />
                      </button>
                    </div>

                    {isConfirming && (
                      <div className="absolute right-3 top-3 bg-card border border-border shadow-md px-3 py-2 flex items-center gap-2 rounded-xl z-10">
                        <span className="text-[11px] text-muted-foreground">
                          Delete this document?
                        </span>
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(doc.id)}
                          className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelDelete}
                          className="text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-xl">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Upload className="w-4 h-4 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">
                    Upload a document
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFile(null);
                    setFileName("");
                    setUploadError(null);
                    setTargetAppointmentId("none");
                  }}
                  className="p-1 rounded-full hover:bg-muted"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    File
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-muted-foreground file:mr-2 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                  </div>
                  {uploadingFile && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Selected: {uploadingFile.name} (
                      {Math.round(uploadingFile.size / 1024)} KB)
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Document name
                  </label>
                  <Input
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    placeholder="e.g. Lab results - July 2024"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">
                    Attach to appointment (optional)
                  </label>
                  <select
                    value={targetAppointmentId}
                    onChange={(e) =>
                      setTargetAppointmentId(
                        (e.target.value || "none") as string | "none",
                      )
                    }
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                  >
                    <option value="none">Don&apos;t attach</option>
                    {appointments.map((apt) => {
                      const isLab = apt.type === "lab";
                      const dateLabel = apt.date
                        ? new Date(apt.date).toLocaleDateString()
                        : "No date";
                      const label = isLab
                        ? `${apt.labType || "Lab work"} (Lab) • ${dateLabel}`
                        : `${apt.doctor || "Provider"}${apt.specialty ? ` - ${apt.specialty}` : ""
                        } • ${dateLabel}`;
                      return (
                        <option key={apt.id} value={apt.id}>
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {uploadError && (
                  <p className="text-[11px] text-red-500">{uploadError}</p>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadingFile(null);
                    setFileName("");
                    setUploadError(null);
                    setTargetAppointmentId("none");
                  }}
                  className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:bg-muted/60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-60"
                  disabled={!uploadingFile}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card w-full max-w-3xl rounded-2xl border border-border shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {previewDoc.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClosePreview}
                  className="p-1 rounded-full hover:bg-muted"
                  aria-label="Close preview"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-4 bg-muted/20">
                {renderPreviewContent(previewDoc)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
