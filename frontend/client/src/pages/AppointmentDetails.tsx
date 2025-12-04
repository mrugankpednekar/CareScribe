import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { useAppointments } from "@/context/AppointmentsContext";
import { useMedications } from "@/context/MedicationsContext";
import { useCalendar } from "@/context/CalendarContext";
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
  FlaskConical,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-picker";
import jsPDF from "jspdf";

type SaveStatus = "idle" | "saving" | "saved";

export default function AppointmentDetails() {
  const { appointments, updateAppointment, deleteAppointment } = useAppointments();
  const {
    transcripts,
    deleteTranscriptsForAppointment,
    deleteTranscript,
  } = useTranscripts();
  const { documents, detachDocumentsFromAppointment, deleteDocument } = useDocuments();
  const { medications, addMedication } = useMedications();
  const { addEvent, customEvents } = useCalendar();

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

  const [confirmingTranscriptId, setConfirmingTranscriptId] = useState<string | null>(
    null,
  );
  const [processingTranscript, setProcessingTranscript] = useState(false);
  const [previewTranscript, setPreviewTranscript] = useState<Transcript | null>(null);
  const [previewDocument, setPreviewDocument] = useState<DocumentMeta | null>(null);

  const debounceRef = useRef<number | null>(null);
  const lastSavedRef = useRef<{
    doctor: string;
    specialty: string;
    reason: string;
    notes: string;
    dateIso: string | null;
    status: Appointment["status"];
  } | null>(null);
  const initializedRef = useRef(false);

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
      status: appointment.status,
    };
    lastSavedRef.current = snapshot;
    initializedRef.current = true;
  }, [appointment]);

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    };
  }, []);

  if (!match || !appointment) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto py-8">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertTriangle className="w-4 h-4" />
            <p className="text-sm font-medium">
              Appointment not found or no longer exists.
            </p>
          </div>
          <button
            onClick={() => setLocation("/history")}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to history
          </button>
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

  const isLab = appointment.type === "lab";

  const attachedProvider =
    isLab && appointment.attachedProviderId
      ? appointments.find((apt) => apt.id === appointment.attachedProviderId)
      : null;

  const appointmentTranscripts: Transcript[] = transcripts.filter(
    (t) =>
      t.appointmentId === appointment.id ||
      (appointment.transcriptIds ?? []).includes(t.id),
  );

  const appointmentDocuments: DocumentMeta[] = documents.filter(
    (d) =>
      (d.appointmentId === appointment.id ||
        (appointment.documentIds ?? []).includes(d.id)) &&
      !transcripts.some(t => t.documentId === d.id)
  );

  const attachedLabs = appointments.filter(
    (apt) =>
      apt.type === "lab" && apt.attachedProviderId === appointment.id,
  );

  const handleDeleteAppointment = () => {
    deleteTranscriptsForAppointment(appointment.id);
    detachDocumentsFromAppointment(appointment.id);
    deleteAppointment(appointment.id);
    setLocation("/history");
  };

  const handleAutoSave = () => {
    if (!appointment || !initializedRef.current) return;

    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    const trimmedDoctor = doctor.trim();
    const trimmedSpecialty = specialty.trim();
    const trimmedReason = reason.trim();
    const dateIso = effectiveDateIso || null;
    const currentStatus = computeStatusFromDate(dateIso || undefined);

    const current = {
      doctor: trimmedDoctor,
      specialty: trimmedSpecialty,
      reason: trimmedReason,
      notes,
      dateIso,
      status: currentStatus,
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

      lastSavedRef.current = current;
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 1500);
    }, 600);
  };

  useEffect(() => {
    handleAutoSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor, specialty, reason, notes, dateTime]);

  const handleClosePreview = () => {
    setPreviewTranscript(null);
    setPreviewDocument(null);
  };

  const handleRemoveTranscript = (transcriptId: string) => {
    const transcript = transcripts.find(t => t.id === transcriptId);

    deleteTranscript(transcriptId);

    if (transcript?.documentId) {
      deleteDocument(transcript.documentId);
    }

    if (appointment && (appointment.transcriptIds ?? []).includes(transcriptId)) {
      const nextIds = (appointment.transcriptIds ?? []).filter(
        (id) => id !== transcriptId,
      );
      updateAppointment(appointment.id, { transcriptIds: nextIds });
    }

    setConfirmingTranscriptId(null);
  };

  const handleDeleteTranscriptClick = (transcriptId: string) => {
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

  const handleProcessTranscript = async () => {
    if (!appointmentTranscripts.length || processingTranscript) return;

    setProcessingTranscript(true);
    try {
      // Try to get backend ID from transcript, otherwise look up by appointment
      const firstTranscript = appointmentTranscripts[0] as any;
      let transcriptId = firstTranscript.backendId;

      // If no backend ID stored, try to find transcription by appointmentId
      if (!transcriptId) {
        const response = await fetch(`/api/transcriptions?appointmentId=${appointment.id}`);
        if (response.ok) {
          const transcriptions = await response.json();
          if (transcriptions.length > 0) {
            transcriptId = transcriptions[0].id;
          }
        }
      }

      if (!transcriptId) {
        alert("Cannot find backend transcription. Please re-record this appointment.");
        setProcessingTranscript(false);
        return;
      }

      const response = await fetch(`/api/transcriptions/${transcriptId}/process`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to process transcript");
      }

      const result = await response.json();
      console.log("AI Processing Result:", result);

      // Update local state to mirror what backend created so the UI reflects changes immediately.
      const processed = result?.processed;
      if (processed) {
        // 1) Update the current appointment details
        const updates: Partial<Appointment> = {};
        if (processed.diagnosis) updates.diagnosis = [processed.diagnosis];
        if (processed.instructions) updates.instructions = [processed.instructions];
        if (processed.notes) updates.notes = processed.notes;
        updateAppointment(appointment.id, updates);

        // 2) Add medications (avoid duplicates by name + appointment)
        processed.medications?.forEach((med: any) => {
          const frequencyType = deriveFrequencyType(med.frequencyType, med.frequency);
          const times = deriveTimes(med.times, med.frequency);
          const startDate = med.startDate || new Date().toISOString().split("T")[0];
          const endDate = deriveEndDate(med.endDate, med.frequency, startDate);
          const selectedDays = med.selectedDays
            ?? parseSelectedDaysFromFrequency(med.frequency)
            ?? (frequencyType === "weekly" ? [] : []);

          const dup = medications.find((m) => {
            const sameName = m.name.toLowerCase().trim() === (med.name || "").toLowerCase().trim();
            const sameApt = m.appointmentId === appointment.id;
            const sameFreq = (m.frequencyType || "daily") === frequencyType;
            const sameDays = JSON.stringify(m.selectedDays || []) === JSON.stringify(selectedDays || []);
            const sameTimes = JSON.stringify(m.times || []) === JSON.stringify(times || []);
            return sameName && sameApt && sameFreq && sameDays && sameTimes;
          });
          if (!dup) {
            addMedication({
              name: med.name,
              dosage: med.dosage || "",
              frequency: med.frequency || "Once daily",
              active: true,
              times,
              startDate,
              endDate,
              prescribedBy: med.prescribedBy || appointment.doctor,
              prescribedDate: med.prescribedDate || appointment.date,
              appointmentId: appointment.id,
              reason: med.reason,
              frequencyType,
              selectedDays,
            });
          }
        });

        // 3) Add follow-up appointment if returned
        if (processed.followUp?.date) {
          const exists = appointments.find(
            a =>
              a.date === processed.followUp.date &&
              (a.reason || "").toLowerCase().includes("follow"),
          );
          if (!exists) {
            addEvent({
              type: "appointment",
              date: processed.followUp.date,
              doctor: appointment.doctor,
              specialty: appointment.specialty || "General",
              reason: processed.followUp.reason || "Follow-up",
              status: "upcoming",
              diagnosis: [],
              instructions: [],
            });
          }
        }

        // 4) Add any additional appointments returned by the model
        processed.appointments?.forEach((apt: any) => {
          const exists = appointments.find(
            a => a.date === apt.date && a.doctor === apt.doctor,
          );
          if (!exists) {
            addEvent({
              type: "appointment",
              date: apt.date,
              doctor: apt.doctor,
              specialty: apt.specialty,
              reason: apt.reason,
              status: "upcoming",
              diagnosis: [],
              instructions: [],
            });
          }
        });

        // 5) Add labs as lab-type appointments
        processed.labs?.forEach((lab: any) => {
          const exists = appointments.find(
            a => a.type === "lab" && a.date === lab.date && a.labType === lab.labType,
          );
          if (!exists) {
            addEvent({
              type: "lab",
              labType: lab.labType,
              date: lab.date,
              doctor: appointment.doctor || "Lab",
              reason: lab.reason,
              status: "upcoming",
              diagnosis: [],
              instructions: [],
              attachedProviderId: appointment.id,
            });
          }
        });

        // 6) Add activities as custom events (avoid duplicate titles on same day)
        processed.activities?.forEach((act: any, idx: number) => {
          const date = act.due || act.startDate || new Date().toISOString().split("T")[0];
          const activityFrequency = act.frequencyType || deriveActivityFrequency(act.title);
          const selectedDays = act.selectedDays
            ?? (activityFrequency === "weekly" ? [new Date(date).getDay()] : activityFrequency === "daily" ? [0, 1, 2, 3, 4, 5, 6] : []);
          const endDate = act.endDate;
          const dup = customEvents.find((e) => {
            const sameTitle = e.title.toLowerCase().trim() === (act.title || "").toLowerCase().trim();
            const sameType = e.type === "activity";
            const sameFreq = (e as any).frequencyType === activityFrequency;
            const sameDays = JSON.stringify((e as any).selectedDays || []) === JSON.stringify(selectedDays || []);
            return sameType && sameTitle && sameFreq && sameDays;
          });
          if (!dup) {
            addEvent({
              id: `ai-activity-${idx}-${Date.now()}`,
              title: act.title,
              description: act.reason,
              date,
              time: undefined,
              allDay: true,
              type: "activity",
              completed: false,
              frequencyType: activityFrequency,
              selectedDays,
              endDate,
            });
          }
        });
      }
    } catch (error) {
      console.error("Manual AI processing error:", error);
      alert("Failed to process transcript. Please try again.");
    } finally {
      setProcessingTranscript(false);
    }
  };

  const handleDownloadTranscriptAsPdf = (tr: Transcript) => {
    const doc = new jsPDF();
    const margin = 15;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = pageWidth - margin * 2;

    const appointmentLabel = isLab
      ? appointment.labType || "Lab Work"
      : appointment.doctor || "Appointment";

    const title = `Transcript - ${appointmentLabel}`;
    doc.setFontSize(16);
    doc.text(title, margin, 20);

    doc.setFontSize(11);
    const dateLine = appointmentDate
      ? appointmentDate.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      : "No date recorded";
    doc.text(`Date: ${dateLine}`, margin, 28);

    const content = (tr as any).content
      ? String((tr as any).content)
      : (tr as any).lines
        ? (tr as any).lines.join(" ")
        : "";

    const safeContent =
      content || "No transcript content available.";

    const linesWrapped = doc.splitTextToSize(safeContent, maxWidth);

    let y = 38;
    const lineHeight = 6;

    linesWrapped.forEach((line: string) => {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin + 10;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    });

    const safeName = title.replace(/[^\w\d\-]+/g, "_");
    doc.save(`${safeName || "transcript"}.pdf`);
  };

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : "All changes saved";

  const aiSummaryPrompt = buildSummaryPromptFromTranscripts(
    appointment,
    appointmentTranscripts,
  );

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-4 pt-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <button
                type="button"
                onClick={() => setLocation("/history")}
                className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground mb-3"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to history
              </button>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                {isLab
                  ? appointment.labType || "Lab work"
                  : doctor || "Appointment"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLab ? (
                  <>
                    {attachedProvider?.doctor || "Lab"}
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
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                className={`px-3 py-1.5 rounded-full text-xs font-semibold capitalize border ${derivedStatus === "completed"
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
                {isLab ? "Delete lab" : "Delete appointment"}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">{saveLabel}</p>
        </header>

        {/* Details + related items */}
        <section className="grid gap-4 md:grid-cols-3 items-start">
          <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">
              {isLab ? "Lab details" : "Appointment details"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {!isLab && (
                <>
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
                </>
              )}

              {isLab && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Lab type
                    </label>
                    <div className="px-2 py-1 rounded-md bg-muted/50 text-sm">
                      {appointment.labType || "Lab work"}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">
                      Attached visit
                    </label>
                    <select
                      value={appointment.attachedProviderId || ""}
                      onChange={(e) => {
                        updateAppointment(appointment.id, {
                          attachedProviderId: e.target.value || undefined,
                        });
                      }}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    >
                      <option value="">No specific visit</option>
                      {appointments
                        .filter(
                          (a) =>
                            a.id !== appointment.id &&
                            (a.type === "appointment" || !a.type) &&
                            a.status !== "cancelled"
                        )
                        .sort(
                          (a, b) =>
                            new Date(b.date || "").getTime() -
                            new Date(a.date || "").getTime()
                        )
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.doctor || "Provider"} •{" "}
                            {a.date
                              ? new Date(a.date).toLocaleDateString()
                              : "No date"}
                          </option>
                        ))}
                    </select>
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <CalendarIcon className="w-3 h-3" />
                  {isLab ? "Lab date & time" : "Appointment date & time"}
                </label>
                <DateTimePicker
                  date={dateTime ? new Date(dateTime) : undefined}
                  setDate={(date) => setDateTime(date ? date.toISOString() : "")}
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

        {/* Reason & notes */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <StickyNote className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              {isLab ? "Reason for lab" : "Reason for visit"}
            </h2>
          </div>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder={
              isLab
                ? "Why was this lab ordered?"
                : "Why was this visit for? (e.g. follow-up on back pain, new symptoms, medication review)"
            }
            className="text-sm bg-background resize-y min-h-[160px]"
          />

          <div className="mt-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Notes
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder={
                isLab
                  ? "Any details about the lab you want to remember."
                  : "Any extra details you want to remember about this visit."
              }
              className="text-sm bg-background resize-y min-h-[160px]"
            />
          </div>
        </section>

        {/* AI summary */}
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              AI summary helper
            </h2>
          </div>
          {aiSummaryPrompt ? (
            <div className="bg-muted/60 border border-border rounded-xl p-3 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
              {aiSummaryPrompt}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Once you have at least one transcript, we’ll show a helpful
              summary prompt here.
            </p>
          )}
        </section>

        {/* AI Process Button */}
        {appointmentTranscripts.length > 0 && (
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-1">
                  Process all recordings with AI
                </h2>
                <p className="text-xs text-muted-foreground">
                  Analyze all {appointmentTranscripts.length} recording(s) together to extract medications, tasks, and follow-ups.
                </p>
              </div>
              <button
                onClick={handleProcessTranscript}
                disabled={processingTranscript}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed">
                {processingTranscript ? "Processing..." : "Analyze & Create Tasks"}
              </button>
            </div>
          </section>
        )}

        {/* Transcripts */}
        <section className="rounded-2xl border border-border bg-card p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Mic className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Transcripts</h2>
          </div>
          <div className="flex-1 flex flex-col">
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
                    const previewLines: string[] = (tr as any).lines ?? [];
                    const preview = previewLines.slice(0, 2).join(" ");
                    const isConfirming = confirmingTranscriptId === tr.id;

                    return (
                      <div
                        key={tr.id}
                        className="relative border border-border rounded-xl p-3 bg-background cursor-pointer hover:bg-muted/60 transition-colors"
                        onClick={() => handleOpenTranscriptPreview(tr)}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="font-medium text-foreground line-clamp-1">
                            {(tr as any).title ?? "Transcript"}
                          </p>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] text-muted-foreground">
                              {created.toLocaleDateString()}{" "}
                              {created.toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>

                            {!isConfirming && (
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
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {preview || "No preview available."}
                        </p>

                        {isConfirming && (
                          <div
                            className="absolute right-2 bottom-2 bg-card border border-border rounded-lg px-2 py-1.5 flex items-center gap-2 text-[11px] shadow-md"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span>Delete this transcript?</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveTranscript(tr.id)}
                              className="text-red-600 hover:text-red-700 font-semibold"
                            >
                              Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingTranscriptId(null)}
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

        {/* Documents */}
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
                    className="flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-background hover:bg-muted/60 cursor-pointer transition-colors"
                    onClick={() => handleOpenDocumentPreview(doc)}
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {doc.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {doc.mimeType} •{" "}
                        {Math.round(doc.sizeBytes / 1024)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadDocument(doc);
                      }}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Download
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Attached labs (only for visits) */}
        {/* Attached labs (only for visits) */}
        {appointment.type !== "lab" && (
          <section className="rounded-2xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-blue-500" />
              <h2 className="text-sm font-semibold text-foreground">
                Lab work ordered during this visit
              </h2>
            </div>
            <div className="max-h-48 overflow-y-auto pr-1">
              {attachedLabs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No lab work attached to this appointment. Add lab work from the{" "}
                  <span className="font-medium text-foreground">History</span> page
                  and link it to this provider.
                </p>
              ) : (
                <div className="space-y-2">
                  {attachedLabs.map((lab) => {
                    const labDate = lab.date ? new Date(lab.date) : null;
                    const hasDate = !!lab.date;
                    const dateObj = hasDate ? new Date(lab.date as string) : null;

                    return (
                      <div
                        key={lab.id}
                        className="flex items-center justify-between border border-border rounded-xl px-3 py-2 bg-background hover:bg-muted/60 cursor-pointer transition-colors"
                        onClick={() => window.location.href = `/appointment/${lab.id}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <FlaskConical className="w-4 h-4 text-blue-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {lab.labType || "Lab Work"}
                            </p>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              {dateObj ? (
                                <>
                                  <span>
                                    {dateObj.toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </span>
                                  <span>•</span>
                                  <span>
                                    {dateObj.toLocaleTimeString("en-US", {
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </>
                              ) : (
                                <span>No date</span>
                              )}
                              {lab.reason && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{lab.reason}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded capitalize ${lab.status === "completed"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-blue-50 text-blue-700"
                              }`}
                          >
                            {lab.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Transcript preview modal */}
        {previewTranscript && (
          <div className="fixed inset-0 md:left-64 bg-black/40 z-40 flex items-center justify-center px-4">
            <div className="bg-card w-full max-w-2xl rounded-2xl border border-border shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mic className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {(previewTranscript as any).title ?? "Transcript preview"}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownloadTranscriptAsPdf(previewTranscript)}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Download as PDF
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePreview}
                    className="p-1 rounded-full hover:bg-muted"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                <div className="space-y-2 text-sm">
                  {((previewTranscript as any).lines ?? []).map(
                    (line: string, idx: number) => (
                      <p key={idx} className="text-foreground leading-relaxed">
                        {line}
                      </p>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Document preview modal */}
        {previewDocument && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-4xl h-[80vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <h3 className="font-semibold text-lg">{previewDocument.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {previewDocument.mimeType} • {Math.round(previewDocument.sizeBytes / 1024)} KB
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadDocument(previewDocument)}
                    className="p-2 hover:bg-muted rounded-full"
                    title="Download"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleClosePreview}
                    className="p-2 hover:bg-muted rounded-full"
                    title="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-muted/20 overflow-auto flex items-center justify-center p-4">
                {previewDocument.mimeType.startsWith("image/") ? (
                  <img
                    src={previewDocument.downloadUrl}
                    alt={previewDocument.name}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-sm"
                  />
                ) : previewDocument.mimeType === "application/pdf" ? (
                  <iframe
                    src={previewDocument.downloadUrl}
                    className="w-full h-full rounded-lg shadow-sm bg-white"
                    title={previewDocument.name}
                  />
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                      <FileText className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Preview not available</p>
                      <p className="text-sm text-muted-foreground">
                        This file type cannot be previewed directly.
                      </p>
                    </div>
                    <button
                      onClick={() => handleDownloadDocument(previewDocument)}
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
                    >
                      Download File
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <>
            <div className="fixed inset-0 md:left-64 bg-black/40 z-30" />
            <div className="fixed inset-0 md:left-64 z-40 flex items-center justify-center px-4">
              <div className="bg-card w-full max-w-sm rounded-2xl border border-border shadow-xl p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h3 className="text-sm font-semibold text-foreground">
                    {isLab ? "Delete this lab?" : "Delete this appointment?"}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  This will remove{" "}
                  {isLab ? "this lab" : "this appointment"} and detach any linked
                  transcripts and documents. This action can&apos;t be undone.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-md border border-border text-xs hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDeleteAppointment}
                    className="px-3 py-1.5 rounded-md bg-red-600 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    {isLab ? "Delete lab" : "Delete appointment"}
                  </button>
                </div>
              </div>
            </div>
          </>
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
      status: Appointment["status"];
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
) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.doctor === b.doctor &&
    a.specialty === b.specialty &&
    a.reason === b.reason &&
    a.notes === b.notes &&
    a.dateIso === b.dateIso &&
    a.status === b.status
  );
}

function buildSummaryPromptFromTranscripts(
  appointment: Appointment,
  transcripts: Transcript[],
): string | null {
  if (!transcripts.length) return null;

  // Show all transcripts since we process them together
  const allText = transcripts.flatMap((t: any) => t.lines ?? []).join(" ");
  const maxChars = 400;
  const snippet =
    allText.length > maxChars ? allText.slice(0, maxChars) + "…" : allText;

  const parts: string[] = [];

  if (appointment.reason) {
    parts.push(`Reason for visit: ${appointment.reason}.`);
  }

  parts.push(
    "This summary combines all recorded conversations for this appointment. Click 'Analyze & Create Tasks' to process all recordings together.",
  );

  parts.push(`Combined transcript excerpt: ${snippet}`);

  return parts.join("\n\n");
}

function deriveFrequencyType(
  provided: "daily" | "weekly" | "once" | undefined,
  frequencyText?: string,
): "daily" | "weekly" | "once" {
  if (provided) return provided;
  const text = (frequencyText || "").toLowerCase();
  if (text.includes("weekly") || text.includes("every week")) return "weekly";
  if (text.includes("once") || text.includes("one time")) return "once";
  // default to daily if unsure
  return "daily";
}

function deriveTimes(
  existing: string[] | undefined,
  frequencyText: string | undefined,
): string[] {
  if (existing && existing.length) return existing;
  const text = (frequencyText || "").toLowerCase();
  const explicit = extractTimes(text);
  // Use only explicit times; if none found, leave empty to avoid guessing.
  return explicit;
}

function deriveEndDate(
  providedEnd: string | undefined,
  frequencyText: string | undefined,
  startDateIso: string,
): string | undefined {
  if (providedEnd) return providedEnd;
  if (!frequencyText) return undefined;

  const wordToNum: Record<string, number> = {
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  };

  const match = frequencyText
    .toLowerCase()
    .match(/(for\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[-\s]*(day|days|week|weeks)\b/);

  if (match) {
    const raw = match[2];
    const days = Number.isNaN(Number(raw)) ? wordToNum[raw as keyof typeof wordToNum] : parseInt(raw, 10);
    const unit = match[3];
    if (!Number.isNaN(days) && days > 0) {
      const start = new Date(startDateIso || new Date().toISOString());
      const totalDays = unit?.startsWith("week") ? days * 7 : days;
      start.setDate(start.getDate() + (totalDays - 1));
      return start.toISOString().split("T")[0];
    }
  }

  return undefined;
}

function deriveActivityFrequency(title: string | undefined): "daily" | "weekly" | "once" {
  const text = (title || "").toLowerCase();
  if (text.includes("daily") || text.includes("every day") || text.includes("each day")) {
    return "daily";
  }
  if (text.includes("weekly") || text.includes("every week")) {
    return "weekly";
  }
  return "once";
}

function extractTimes(text: string): string[] {
  const times: string[] = [];
  const regex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const hourNum = parseInt(match[1], 10);
    const minuteNum = match[2] ? parseInt(match[2], 10) : 0;
    const hasColon = Boolean(match[2]);
    const meridiem = match[3];

    // Skip plain numbers without context (e.g., "every 8 hours")
    if (!meridiem && !hasColon) continue;
    if (hourNum > 24 || minuteNum > 59) continue;

    let hour24 = hourNum % 24;
    if (meridiem) {
      const isPM = meridiem.toLowerCase() === "pm";
      if (isPM && hourNum < 12) hour24 = hourNum + 12;
      if (!isPM && hourNum === 12) hour24 = 0;
    }

    const hh = hour24.toString().padStart(2, "0");
    const mm = minuteNum.toString().padStart(2, "0");
    const timeStr = `${hh}:${mm}`;
    if (!times.includes(timeStr)) times.push(timeStr);
  }
  return times;
}

function parseSelectedDaysFromFrequency(freq?: string): number[] | undefined {
  if (!freq) return undefined;
  const text = freq.toLowerCase();
  const dayMap: Record<string, number> = {
    sunday: 0, sun: 0,
    monday: 1, mon: 1,
    tuesday: 2, tue: 2, tues: 2,
    wednesday: 3, wed: 3,
    thursday: 4, thu: 4, thurs: 4,
    friday: 5, fri: 5,
    saturday: 6, sat: 6,
  };
  const found = Object.entries(dayMap)
    .filter(([name]) => text.includes(name))
    .map(([, idx]) => idx);
  return found.length ? Array.from(new Set(found)).sort() : undefined;
}
