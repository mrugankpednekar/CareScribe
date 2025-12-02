import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAppointments } from "@/context/AppointmentsContext";
import { useTranscripts } from "@/context/TranscriptsContext";
import { useDocuments } from "@/context/DocumentsContext";
import type { Appointment, Transcript, DocumentMeta } from "@/lib/types";
import { useRoute, Link, useLocation } from "wouter";
import {
  ArrowLeft,
  FileText,
  Mic,
  StickyNote,
  Trash2,
  Calendar as CalendarIcon,
  AlertTriangle,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import jsPDF from "jspdf";

type SaveStatus = "idle" | "saving" | "saved";

export default function AppointmentDetails() {
  const { appointments, updateAppointment, deleteAppointment } = useAppointments();
  const {
    transcripts,
    deleteTranscriptsForAppointment,
    deleteTranscript,
  } = useTranscripts();
  const { documents, detachDocumentsFromAppointment } = useDocuments();

  const [match, params] = useRoute<{ id: string }>("/appointment/:id");
  const appointmentId = params?.id;
  const [, setLocation] = useLocation();

  const appointment: Appointment | undefined = useMemo(
    () => appointments.find((apt) => apt.id === appointmentId),
    [appointments, appointmentId],
  );

  const [doctor, setDoctor] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // For per-transcript delete confirmation
  const [confirmingTranscriptId, setConfirmingTranscriptId] = useState<string | null>(null);

  // Preview state
  const [previewTranscript, setPreviewTranscript] = useState<Transcript | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentMeta | null>(null);

  const initializedRef = useRef(false);
  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{
    doctor: string;
    specialty: string;
    reason: string;
    notes: string;
    dateIso: string | null;
  } | null>(null);

  useEffect(() => {
    if (!appointment) return;

    setDoctor(appointment.doctor || "");
    setSpecialty(appointment.specialty || "");
    setReason(appointment.reason || "");
    setNotes(appointment.notes || "");

    if (appointment.date) {
      const d = new Date(appointment.date);
      const localInput = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDateTime(localInput);
    } else {
      setDateTime("");
    }

    const snapshot = {
      doctor: appointment.doctor || "",
      specialty: appointment.specialty || "",
      reason: appointment.reason || "",
      notes: appointment.notes || "",
      dateIso: appointment.date || null,
    };
    lastSavedRef.current = snapshot;
    initializedRef.current = true;
  }, [appointment]);

  useEffect(() => {
    if (!appointment || !initializedRef.current) return;

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    const trimmedDoctor = doctor.trim();
    const trimmedSpecialty = specialty.trim();
    const trimmedReason = reason.trim();

    let dateIso: string | null = null;
    if (dateTime) {
      const d = new Date(dateTime);
      dateIso = d.toISOString();
    } else if (appointment.date) {
      dateIso = appointment.date;
    }

    const derivedStatus = computeStatusFromDate(dateIso || undefined);

    const current = {
      doctor: trimmedDoctor,
      specialty: trimmedSpecialty,
      reason: trimmedReason,
      notes,
      dateIso,
      status: derivedStatus as Appointment["status"],
    };

    if (shallowEqual(lastSavedRef.current, current)) {
      return;
    }

    setSaveStatus("saving");

    debounceRef.current = window.setTimeout(() => {
      updateAppointment(appointment.id, {
        doctor: current.doctor,
        specialty: current.specialty,
        reason: current.reason,
        notes: current.notes,
        date: current.dateIso || undefined,
        status: current.status,
      });

      lastSavedRef.current = {
        doctor: current.doctor,
        specialty: current.specialty,
        reason: current.reason,
        notes: current.notes,
        dateIso: current.dateIso,
      };

      setSaveStatus("saved");

      window.setTimeout(() => {
        setSaveStatus("idle");
      }, 2000);
    }, 1000);

    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, [doctor, specialty, reason, notes, dateTime, appointment, updateAppointment]);

  if (!match || !appointment) {
    return (
      <Layout>
        <div className="flex flex-col gap-4 max-w-xl mx-auto py-16">
          <Link href="/history">
            <button className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              Back to history
            </button>
          </Link>
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground mb-2">
              Appointment not found
            </p>
            <p className="text-sm text-muted-foreground">
              The appointment you're looking for doesn't exist or was removed.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  const effectiveDateIso = (() => {
    if (dateTime) {
      const d = new Date(dateTime);
      return d.toISOString();
    }
    return appointment.date || undefined;
  })();

  const appointmentDate = effectiveDateIso ? new Date(effectiveDateIso) : null;
  const derivedStatus = computeStatusFromDate(effectiveDateIso);

  const appointmentTranscripts: Transcript[] = transcripts.filter(
    (t) =>
      t.appointmentId === appointment.id ||
      (appointment.transcriptIds ?? []).includes(t.id),
  );

  const appointmentDocuments: DocumentMeta[] = documents.filter(
    (d) =>
      d.appointmentId === appointment.id ||
      (appointment.documentIds ?? []).includes(d.id),
  );

  const aiSummary = buildSimpleSummary({ ...appointment, reason }, appointmentTranscripts);

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
      ? "Saved"
      : "Autosave";

  const handleDeleteConfirm = () => {
    // Delete transcripts attached to this appointment
    deleteTranscriptsForAppointment(appointment.id);

    // Detach documents from this appointment
    detachDocumentsFromAppointment(appointment.id);

    // Delete the appointment itself
    deleteAppointment(appointment.id);

    // Redirect to history page
    setLocation("/history");
  };

  const handleDeleteTranscript = (transcriptId: string) => {
    // Remove from transcripts store (and therefore from localStorage)
    deleteTranscript(transcriptId);

    // Also clean up the appointment's transcriptIds array, if it references this transcript
    if (appointment.transcriptIds?.includes(transcriptId)) {
      const nextIds = appointment.transcriptIds.filter((id) => id !== transcriptId);
      updateAppointment(appointment.id, { transcriptIds: nextIds });
    }

    setConfirmingTranscriptId(null);
  };

  const handleDeleteTranscriptClick = (transcriptId: string) => {
    // Toggle small popup for this transcript
    setConfirmingTranscriptId((current) =>
      current === transcriptId ? null : transcriptId,
    );
  };

  const handleOpenTranscriptPreview = (tr: Transcript) => {
    setPreviewTranscript(tr);
  };

  const handleOpenDocumentPreview = (doc: DocumentMeta) => {
    setPreviewDocument(doc);
  };

  const handleDownloadDocument = (doc: DocumentMeta) => {
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

  const canPreviewDocument = (doc: DocumentMeta) => {
    if (!doc.downloadUrl || !doc.mimeType) return false;
    if (doc.mimeType.startsWith("image/")) return true;
    if (doc.mimeType === "application/pdf") return true;
    if (doc.mimeType.startsWith("text/")) return true;
    return false;
  };

  const handleDownloadTranscriptPdf = (tr: Transcript) => {
    try {
      const doc = new jsPDF();
      const title = tr.title || "Transcript";
      const createdLabel = new Date(tr.createdAt).toLocaleString();

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;
      const maxWidth = pageWidth - margin * 2;

      doc.setFontSize(14);
      doc.text(title, margin, 20);

      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(createdLabel, margin, 26);

      doc.setDrawColor(200);
      doc.line(margin, 30, pageWidth - margin, 30);

      doc.setFontSize(11);
      doc.setTextColor(0);

      const content = tr.lines.join("\n\n");
      const lines = doc.splitTextToSize(content, maxWidth);

      let y = 38;
      const lineHeight = 6;

      lines.forEach((line: string) => {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin + 10;
        }
        doc.text(line, margin, y);
        y += lineHeight;
      });

      const safeName = title.replace(/[^\w\d\-]+/g, "_");
      doc.save(`${safeName || "transcript"}.pdf`);
    } catch (err) {
      console.error("Failed to generate PDF for transcript", err);
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-10 px-4 md:px-0 space-y-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href="/history">
              <button className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-3">
                <ArrowLeft className="w-3 h-3" />
                Back to history
              </button>
            </Link>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              {doctor || "Appointment"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {specialty || "General"}
              {appointmentDate && (
                <>
                  {" • "}
                  {appointmentDate.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </>
              )}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div
              className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${
                derivedStatus === "completed"
                  ? "bg-gray-100 text-gray-700 border-gray-200"
                  : "bg-primary/20 text-primary border-primary/20"
              }`}
            >
              {derivedStatus}
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-3 h-3" />
              Delete appointment
            </button>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3 items-start">
          <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              Appointment details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Provider
                </label>
                <Input
                  value={doctor}
                  onChange={(e) => setDoctor(e.target.value)}
                  placeholder="Provider name"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">
                  Specialty
                </label>
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. General, Cardiology"
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  Appointment date &amp; time
                </label>
                <Input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">
                  Status is automatically set based on this date.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col justify-between">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Related items
              </h2>
              <p className="text-xs text-muted-foreground mb-1">
                Transcripts:{" "}
                <span className="font-semibold text-foreground">
                  {appointmentTranscripts.length}
                </span>
              </p>
              <p className="text-xs text-muted-foreground">
                Documents:{" "}
                <span className="font-semibold text-foreground">
                  {appointmentDocuments.length}
                </span>
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Reason for visit
            </h2>
          </div>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Why was this visit for? (e.g. follow-up on back pain, new symptoms, medication review)"
            className="text-sm bg-background resize-y min-h-[160px]"
          />

          <p className="mt-2 text-[11px] text-muted-foreground text-right">
            {saveLabel}
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">AI summary</h2>
          </div>
          <div className="max-h-56 overflow-y-auto pr-1">
            {aiSummary ? (
              <div className="prose prose-sm max-w-none text-sm text-muted-foreground">
                {aiSummary.split("\n").map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Once a recording is transcribed, a smart summary of this visit will
                appear here.
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Personal notes
              </h2>
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              placeholder="Add anything you want to remember about this appointment."
              className="text-sm bg-background resize-y min-h-[190px]"
            />

            <p className="mt-2 text-[11px] text-muted-foreground text-right">
              {saveLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Mic className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Transcripts
              </h2>
            </div>
            <div className="max-h-48 overflow-y-auto pr-1">
              {appointmentTranscripts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No transcripts attached yet. Record this visit from the{" "}
                  <span className="font-medium text-foreground">Record</span> page
                  to see transcripts here.
                </p>
              ) : (
                <div className="space-y-3">
                  {appointmentTranscripts.map((tr) => {
                    const created = new Date(tr.createdAt);
                    const preview = tr.lines.slice(0, 2).join(" ");
                    const isConfirming = confirmingTranscriptId === tr.id;

                    return (
                      <div
                        key={tr.id}
                        className="relative border border-border rounded-xl px-3 py-2 text-sm bg-background cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => handleOpenTranscriptPreview(tr)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-foreground line-clamp-1">
                            {tr.title}
                          </p>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {created.toLocaleDateString()}{" "}
                              {created.toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTranscriptClick(tr.id);
                              }}
                              className="p-1 rounded-md hover:bg-muted"
                              aria-label="Delete transcript"
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {preview || "Transcript text not available."}
                        </p>

                        {isConfirming && (
                          <div className="absolute right-2 top-8 z-20 rounded-md border border-border bg-card shadow-md px-3 py-2 flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground">
                              Delete this transcript?
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTranscript(tr.id);
                              }}
                              className="text-[11px] font-semibold text-red-600 hover:text-red-700"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmingTranscriptId(null);
                              }}
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
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Documents</h2>
          </div>
          <div className="max-h-48 overflow-y-auto pr-1">
            {appointmentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No documents attached. Upload documents in the{" "}
                <span className="font-medium text-foreground">Documents</span> page
                and link them to this appointment to see them here.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {appointmentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between gap-3 border border-border rounded-xl px-3 py-2 bg-background cursor-pointer hover:bg-muted/60 transition-colors"
                    onClick={() => handleOpenDocumentPreview(doc)}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {doc.mimeType || "Document"}
                          {doc.sizeBytes
                            ? ` • ${(doc.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                            : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {doc.uploadedAt && (
                        <span className="text-[11px] text-muted-foreground flex-shrink-0">
                          {new Date(doc.uploadedAt).toLocaleDateString()}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadDocument(doc);
                        }}
                        className="px-2 py-1 rounded-md border border-border text-[11px] hover:bg-muted"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Delete Confirmation Modal for appointment */}
        {showDeleteConfirm && (
          <>
            {/* Backdrop – covers only main content on desktop, full screen on mobile */}
            <div
              className="fixed inset-0 md:left-64 bg-black/40 z-30"
              onClick={() => setShowDeleteConfirm(false)}
            />

            {/* Modal container – also only from left-64 on desktop */}
            <div className="fixed inset-0 md:left-64 z-40 flex items-center justify-center p-4">
              <div
                className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="rounded-full bg-destructive/10 p-2">
                    <AlertTriangle className="w-6 h-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">
                      Delete appointment?
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <p className="text-sm text-foreground">
                    Are you sure you want to delete this appointment? This will permanently delete:
                  </p>
                  <ul className="space-y-2 text-sm text-foreground">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive/40" />
                      All appointment details and notes
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive/40" />
                      {appointmentTranscripts.length} recorded transcript
                      {appointmentTranscripts.length !== 1 ? "s" : ""}
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive/40" />
                      All AI-generated summaries
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-destructive/40" />
                      Appointment history and timeline
                    </li>
                  </ul>
                  <div className="mt-4 p-3 rounded-lg bg-gray-100 border border-border">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Note:</span>{" "}
                      Uploaded documents will not be deleted, but they will be detached from this appointment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2.5 rounded-lg text-sm font-medium border-2 border-border bg-gray-100 text-foreground hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-red-900 transition-colors shadow-sm"
                  >
                    Delete appointment
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Transcript Preview Modal */}
        {previewTranscript && (
          <div className="fixed inset-0 md:left-64 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPreviewTranscript(null)}
            />
            <div className="relative w-full max-w-xl max-h-[80vh] rounded-2xl border border-border bg-card shadow-lg p-5 flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {previewTranscript.title || "Transcript"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {new Date(previewTranscript.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTranscriptPdf(previewTranscript)}
                    className="px-3 py-1.5 rounded-md border border-border text-[11px] hover:bg-muted"
                  >
                    Download PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewTranscript(null)}
                    className="p-1 rounded-full hover:bg-muted"
                    aria-label="Close transcript preview"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="mt-1 text-xs text-muted-foreground border-y border-border py-2 mb-3">
                Full transcript text from this visit.
              </div>

              <div className="flex-1 overflow-y-auto pr-2 text-sm text-foreground space-y-2">
                {previewTranscript.lines.map((line, idx) => (
                  <p key={idx}>{line}</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Document Preview Modal */}
        {previewDocument && (
          <div className="fixed inset-0 md:left-64 z-40 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setPreviewDocument(null)}
            />
            <div className="relative w-full max-w-3xl max-h-[85vh] rounded-2xl border border-border bg-card shadow-lg flex flex-col">
              <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {previewDocument.name}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {previewDocument.mimeType || "Document"}
                    {previewDocument.sizeBytes
                      ? ` • ${(previewDocument.sizeBytes / (1024 * 1024)).toFixed(
                          1,
                        )} MB`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadDocument(previewDocument)}
                    className="px-3 py-1.5 rounded-md border border-border text-[11px] hover:bg-muted"
                    disabled={!previewDocument.downloadUrl}
                  >
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDocument(null)}
                    className="p-1 rounded-full hover:bg-muted"
                    aria-label="Close document preview"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {previewDocument.downloadUrl && canPreviewDocument(previewDocument) ? (
                  <>
                    {previewDocument.mimeType?.startsWith("image/") && (
                      <img
                        src={previewDocument.downloadUrl}
                        alt={previewDocument.name}
                        className="max-w-full rounded-lg mx-auto"
                      />
                    )}

                    {previewDocument.mimeType === "application/pdf" && (
                      <iframe
                        src={previewDocument.downloadUrl}
                        className="w-full h-[80vh] rounded-lg border border-border"
                        title={previewDocument.name}
                      />
                    )}

                    {previewDocument.mimeType?.startsWith("text/") && (
                      <iframe
                        src={previewDocument.downloadUrl}
                        className="w-full h-[80vh] rounded-lg border border-border bg-background"
                        title={previewDocument.name}
                      />
                    )}
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <FileText className="w-10 h-10 text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Preview is not available for this file type.
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Use the download button above to open it in another app.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function computeStatusFromDate(dateIso?: string): Appointment["status"] {
  if (!dateIso) return "upcoming";
  const now = new Date();
  const d = new Date(dateIso);
  return d.getTime() < now.getTime() ? "completed" : "upcoming";
}

function shallowEqual(
  a:
    | {
        doctor: string;
        specialty: string;
        reason: string;
        notes: string;
        dateIso: string | null;
      }
    | null,
  b: {
    doctor: string;
    specialty: string;
    reason: string;
    notes: string;
    dateIso: string | null;
    status: Appointment["status"];
  },
): boolean {
  if (!a) return false;
  return (
    a.doctor === b.doctor &&
    a.specialty === b.specialty &&
    a.reason === b.reason &&
    a.notes === b.notes &&
    a.dateIso === b.dateIso
  );
}

function buildSimpleSummary(
  appointment: Appointment,
  transcripts: Transcript[],
): string | null {
  if (!transcripts.length) return null;

  const allText = transcripts.flatMap((t) => t.lines).join(" ");
  const maxChars = 400;
  const snippet =
    allText.length > maxChars ? allText.slice(0, maxChars) + "…" : allText;

  const parts: string[] = [];

  if (appointment.reason) {
    parts.push(`Reason for visit: ${appointment.reason}.`);
  }

  parts.push(
    "This summary is based on the recorded conversation and is meant to help you remember the key points from your appointment.",
  );

  parts.push(`Transcript excerpt: ${snippet}`);

  return parts.join("\n\n");
}
