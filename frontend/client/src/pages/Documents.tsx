import { useMemo, useState, ChangeEvent } from "react";
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
import { Input } from "@/components/ui/input";
import type { DocumentMeta } from "@/lib/types";

export default function Documents() {
  const { appointments, updateAppointment } = useAppointments();
  const {
    documents,
    addDocument,
    deleteDocument,
    updateDocument,
    detachDocumentsFromAppointment,
  } = useDocuments();

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
          // Find the appointment and add the document ID to its documentIds
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
    detachDocumentsFromAppointment(id);
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
      // ignore download errors for now
    }
  };

  const resolveAppointmentLabel = (doc: DocumentMeta): string => {
    if (!doc.appointmentId) {
      return "Not attached to an appointment";
    }
    const apt = appointments.find((a) => a.id === doc.appointmentId);
    if (!apt) {
      return "Linked appointment not found";
    }
    const isLab = apt.type === "lab";
    const dateLabel = apt.date
      ? new Date(apt.date).toLocaleDateString()
      : "No date";

    if (isLab) {
      const orderedBy =
        apt.attachedProviderId &&
        appointments.find((a) => a.id === apt.attachedProviderId)?.doctor;

      const base = apt.labType || "Lab work";
      if (orderedBy) {
        return `${base} (Lab, ordered by ${orderedBy}) • ${dateLabel}`;
      }
      return `${base} (Lab) • ${dateLabel}`;
    }

    const providerLabel = `${apt.doctor || "Provider"}${apt.specialty ? ` - ${apt.specialty}` : ""
      }`;

    return `${providerLabel} • ${dateLabel}`;
  };

  // --- SEARCH LOGIC ---

  const normalize = (value: string | undefined | null) =>
    (value ?? "").toLowerCase().trim();

  const matchesSearch = (doc: DocumentMeta) => {
    if (!searchQuery.trim()) return true;
    const q = normalize(searchQuery);

    const apt = doc.appointmentId
      ? appointments.find((a) => a.id === doc.appointmentId)
      : undefined;

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

  // --- ATTACH / RE-ATTACH AFTER UPLOAD ---

  const handleChangeAttachment = (docId: string, appointmentId: string) => {
    // Update the document's own metadata
    updateDocument(docId, { appointmentId: appointmentId === "none" ? undefined : appointmentId });

    if (appointmentId === "none") {
      // Detach from all appointments
      appointments.forEach(apt => {
        if (apt.documentIds?.includes(docId)) {
          const updatedIds = apt.documentIds.filter(id => id !== docId);
          updateAppointment(apt.id, { documentIds: updatedIds });
        }
      });
      return;
    }

    // Attach to specific appointment and remove from others
    appointments.forEach(apt => {
      const currentIds = apt.documentIds ?? [];
      if (apt.id === appointmentId) {
        // Add to this appointment if not already there
        if (!currentIds.includes(docId)) {
          updateAppointment(apt.id, { documentIds: [...currentIds, docId] });
        }
      } else if (currentIds.includes(docId)) {
        // Remove from other appointments
        const updatedIds = currentIds.filter(id => id !== docId);
        updateAppointment(apt.id, { documentIds: updatedIds });
      }
    });
  };

  // --- FULL REPORT EXPORT (PDF from backend) ---

  const handleGenerateFullReport = async () => {
    try {
      setIsExporting(true);

      // Backend should return a PDF here
      const res = await fetch("/api/reports/full-history");
      if (!res.ok) {
        throw new Error("Failed to generate report");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "medical-history.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmingDocId(id);
  };

  const [renamingDocId, setRenamingDocId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDocId, setConfirmingDocId] = useState<string | null>(null);

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

  const handleGenerateSummary = async (doc: DocumentMeta) => {
    try {
      setSummaryLoadingId(doc.id);

      // Call backend endpoint to generate a summary PDF
      const res = await fetch(`/api/documents/${doc.id}/summary`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to generate summary");
      }

      const blob = await res.blob(); // Expecting application/pdf
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.name || "document"} - summary.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoadingId(null);
    }
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
          {sortedDocuments.length > 0 && (
            <div className="mb-4">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, doctor, or date..."
                  className="pl-9 h-9 bg-background border-border/60 text-xs"
                />
              </div>
            </div>
          )}

          {filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {sortedDocuments.length === 0
                  ? "No documents uploaded yet."
                  : "No documents match your search."}
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">
                Upload visit summaries, lab reports, referrals, or any other
                files you want to keep with your medical history.
              </p>
              <button
                type="button"
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
              >
                <Upload className="w-4 h-4" />
                Upload a document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const isRenaming = renamingDocId === doc.id;
                const isConfirming = confirmingDocId === doc.id;
                const sizeLabel = doc.sizeBytes
                  ? `${Math.round(doc.sizeBytes / 1024)} KB`
                  : "";

                return (
                  <div
                    key={doc.id}
                    className="relative flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2 hover:bg-muted/60 transition-colors group"
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
                                className="text-[12px] border border-border bg-background rounded-lg px-2 py-1 h-9 max-w-[260px] font-medium"
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
                      {/* Preview icon */}
                      <button
                        type="button"
                        onClick={() => handleOpenPreview(doc)}
                        className="p-2 rounded-full hover:bg-muted"
                        aria-label="Preview document"
                      >
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>

                      {/* AI summary icon */}
                      <button
                        type="button"
                        onClick={() => handleGenerateSummary(doc)}
                        disabled={isSummaryLoading(doc.id)}
                        className="p-2 rounded-full hover:bg-muted disabled:opacity-40"
                        aria-label="Generate AI summary"
                      >
                        <Sparkles className="w-5 h-5 text-foreground" />
                      </button>

                      {/* Download icon */}
                      <button
                        type="button"
                        onClick={() => handleDownload(doc)}
                        className="p-2 rounded-full border border-border hover:bg-muted disabled:opacity-40"
                        disabled={!doc.downloadUrl}
                        aria-label="Download document"
                      >
                        <Download className="w-5 h-5 text-foreground" />
                      </button>

                      {/* Delete icon */}
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
                      <div className="absolute right-3 top-3 bg-card border border-border shadow-md px-3 py-2 flex items-center gap-2 rounded-xl">
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

              <div className="p-4 overflow-auto">
                {renderPreviewContent(previewDoc)}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
