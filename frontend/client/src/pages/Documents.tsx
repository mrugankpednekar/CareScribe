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
  const { appointments } = useAppointments();
  const {
    documents,
    addDocument,
    attachDocumentToAppointment,
    deleteDocument,
  } = useDocuments();

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [targetAppointmentId, setTargetAppointmentId] =
    useState<string | "none">("none");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [confirmingDocId, setConfirmingDocId] = useState<string | null>(null);

  // Search
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setSelectedFile(file);
    setUploadError(null);

    if (file) {
      setFileName(file.name);
    } else {
      setFileName("");
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setUploadError("Please choose a file to upload.");
      return;
    }

    setUploadError(null);

    const file = selectedFile;
    const reader = new FileReader();

    reader.onloadend = () => {
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
        attachDocumentToAppointment(created.id, targetAppointmentId);
      }

      setSelectedFile(null);
      setFileName("");
      setTargetAppointmentId("none");
      setShowUploadModal(false);
    };

    reader.readAsDataURL(file);
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
    const dateLabel = apt.date
      ? new Date(apt.date).toLocaleDateString()
      : "No date";
    return `${apt.doctor || "Provider"} • ${dateLabel}`;
  };

  // --- SEARCH LOGIC ---

  const normalize = (value: string | undefined | null) =>
    (value ?? "").toLowerCase().trim();

  const matchesSearch = (doc: DocumentMeta) => {
    const q = normalize(searchQuery);
    if (!q) return true;

    const apt = doc.appointmentId
      ? appointments.find((a) => a.id === doc.appointmentId)
      : undefined;

    const aptDateIso = apt?.date ?? "";
    const aptDateHuman =
      apt?.date && !Number.isNaN(new Date(apt.date).getTime())
        ? new Date(apt.date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "";

    const uploadedDateIso = doc.uploadedAt ?? "";
    const uploadedDateHuman =
      doc.uploadedAt && !Number.isNaN(new Date(doc.uploadedAt).getTime())
        ? new Date(doc.uploadedAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "";

    const haystack = normalize(
      [
        doc.name,
        apt?.doctor,
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

  const handleDeleteClick = (docId: string) => {
    setConfirmingDocId((current) => (current === docId ? null : docId));
  };

  const handleConfirmDelete = (docId: string) => {
    deleteDocument(docId);
    setConfirmingDocId(null);
  };

  const handleChangeAttachment = (docId: string, appointmentId: string) => {
  if (appointmentId === "none") {
    // detach
    attachDocumentToAppointment(docId, undefined);
    return;
  }

  // attach normally
  attachDocumentToAppointment(docId, appointmentId);
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

  // --- SUMMARY GENERATION PER DOC (PDF download) ---

  const handleGenerateSummary = async (doc: DocumentMeta) => {
    try {
      setSummaryLoadingId(doc.id);

      // Backend should return a PDF summary for this doc
      const res = await fetch(`/api/documents/${doc.id}/summary`);
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

  // --- PREVIEW DOC MODAL ---

  const canInlinePreview = (doc: DocumentMeta) =>
    !!doc.downloadUrl &&
    (doc.mimeType?.startsWith("image/") ||
      doc.mimeType === "application/pdf" ||
      doc.name?.toLowerCase().endsWith(".pdf"));

  const renderPreviewContent = (doc: DocumentMeta) => {
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

    if (
      doc.mimeType === "application/pdf" ||
      doc.name?.toLowerCase().endsWith(".pdf")
    ) {
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
        Inline preview isn&apos;t available for this file type, but you can
        download it instead.
      </p>
    );
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-10 px-4 md:px-0 space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Documents
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload visit summaries, lab reports, referrals, and keep them
              linked to the right appointments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowUploadModal(true);
              setUploadError(null);
            }}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90"
          >
            <Upload className="w-4 h-4" />
            Upload document
          </button>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
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
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs font-semibold hover:bg-muted"
              >
                <Upload className="w-3 h-3" />
                Upload a document
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocuments.map((doc) => {
                const isConfirming = confirmingDocId === doc.id;
                const sizeLabel =
                  doc.sizeBytes && doc.sizeBytes > 0
                    ? `${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                    : undefined;

                const isSummaryLoading = summaryLoadingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="relative flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
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
                              onChange={(e) => handleChangeAttachment(doc.id, e.target.value)}
                              className="text-[12px] border border-border bg-background rounded-lg px-2 py-1 h-9 max-w-[260px] font-medium"
                             >
                              <option value="none">None</option>
                              {appointments.map((apt) => (
                                <option key={apt.id} value={apt.id}>
                                  {apt.doctor || "Provider"} •{" "}
                                  {apt.date ? new Date(apt.date).toLocaleDateString() : "No date"}
                                </option>
                              ))}
                            </select>

                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.uploadedAt && (
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                      )}

                      {/* Preview icon */}
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="p-2 rounded-full border border-border hover:bg-muted disabled:opacity-40"
                        disabled={!canInlinePreview(doc)}
                        aria-label="Preview document"
                      >
                        <Eye className="w-5 h-5 text-foreground" />
                      </button>

                      {/* Generate summary icon (AI) */}
                      <button
                        type="button"
                        onClick={() => handleGenerateSummary(doc)}
                        className="p-2 rounded-full border border-border hover:bg-muted disabled:opacity-40"
                        disabled={isSummaryLoading}
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
                      <div className="absolute right-3 top-11 z-20 rounded-md border border-border bg-card shadow-md px-3 py-2 flex items-center gap-2">
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
                          onClick={() => setConfirmingDocId(null)}
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
        </section>

        <div className="mt-8 p-6 bg-secondary/30 rounded-2xl border border-dashed border-border text-center">
          <h3 className="font-bold text-foreground mb-2">Export History</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Download your full medical timeline for a new doctor.
          </p>
          <button
            className="px-6 py-2 bg-card border border-border rounded-lg text-sm font-medium shadow-sm hover:bg-secondary transition-colors disabled:opacity-60"
            onClick={handleGenerateFullReport}
            disabled={isExporting}
          >
            {isExporting ? "Generating..." : "Generate Full Report"}
          </button>
        </div>

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-2xl p-6 max-w-md w-full mx-4 shadow-lg border border-border relative">
              <button
                type="button"
                className="absolute right-3 top-3 p-1 rounded-full hover:bg-muted"
                onClick={() => {
                  setShowUploadModal(false);
                }}
                aria-label="Close upload"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <h2 className="text-lg font-semibold text-foreground mb-1">
                Upload document
              </h2>
              <p className="text-xs text-muted-foreground mb-4">
                Choose a file, give it a clear name, and optionally attach it to
                an appointment.
              </p>

              <div className="space-y-3 mb-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    File
                  </label>
                  <input
                    type="file"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-muted-foreground file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border file:border-border file:text-xs file:font-medium file:bg-card file:text-foreground hover:file:bg-muted"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.png,.jpg,.jpeg,.gif,.heic"
                  />
                  {selectedFile && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Selected: {selectedFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
                    Document name
                  </label>
                  <input
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs"
                    placeholder="e.g. Lab Results - June 2025"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">
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
                    {appointments.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        {apt.doctor || "Provider"} •{" "}
                        {apt.date
                          ? new Date(apt.date).toLocaleDateString()
                          : "No date"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {uploadError && (
                <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700">
                  {uploadError}
                </div>
              )}

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-2 rounded-lg border border-border bg-card text-xs font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90"
                >
                  Upload
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-card rounded-2xl border border-border max-w-4xl w-full mx-4 shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {previewDoc.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Preview
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
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
