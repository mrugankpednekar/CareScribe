import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAppointments } from "@/context/AppointmentsContext";
import { useTranscripts } from "@/context/TranscriptsContext";
import { useDocuments } from "@/context/DocumentsContext";
import type { Appointment, Transcript, DocumentMeta } from "@/lib/types";
import { useRoute, Link, useLocation } from "wouter";
import { ArrowLeft, FileText, Mic, StickyNote, Trash2, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SaveStatus = "idle" | "saving" | "saved";

export default function AppointmentDetails() {
  const { appointments, updateAppointment, deleteAppointment } = useAppointments();
  const { transcripts, deleteTranscriptsForAppointment } = useTranscripts();
  const { documents } = useDocuments();

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
              The appointment you’re looking for doesn’t exist or was removed.
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
    deleteTranscriptsForAppointment(appointment.id);
    deleteAppointment(appointment.id);
    setLocation("/history");
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
                  {" "}
                  •{" "}
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
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-600 hover:text-red-700"
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
          <div className="max-h-40 overflow-y-auto">
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Why was this visit for? (e.g. follow-up on back pain, new symptoms, medication review)"
              className="text-sm bg-background"
            />
          </div>
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
            <div className="max-h-48 overflow-y-auto flex-1">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={6}
                placeholder="Add anything you want to remember about this appointment."
                className="text-sm bg-background h-full"
              />
            </div>
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
                    return (
                      <div
                        key={tr.id}
                        className="border border-border rounded-xl px-3 py-2 text-sm bg-background"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-foreground line-clamp-1">
                            {tr.title}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {created.toLocaleDateString()}{" "}
                            {created.toLocaleTimeString(undefined, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {preview || "Transcript text not available."}
                        </p>
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
                    className="flex items-center justify-between gap-3 border border-border rounded-xl px-3 py-2 bg-background"
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
                    {doc.uploadedAt && (
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {showDeleteConfirm && (
          <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <Trash2 className="w-4 h-4" />
              Delete appointment?
            </h2>
            <p className="text-xs text-destructive/90">
              This will permanently delete this appointment and all transcripts and data attached
              to it. Uploaded documents will not be deleted, but they will no longer be linked to
              this appointment.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-md text-xs font-medium border border-border bg-background text-foreground"
              >
                No, keep it
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-destructive text-destructive-foreground"
              >
                Yes, delete
              </button>
            </div>
          </section>
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
