import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { VoiceVisualizer } from "@/components/record/VoiceVisualizer";
import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useAppointments } from "@/context/AppointmentsContext";
import type { Appointment } from "@/lib/types";
import { useTranscripts } from "@/context/TranscriptsContext";
import { useUserProfile } from "@/context/UserProfileContext";
import { useDocuments } from "@/context/DocumentsContext";
import { DateTimePicker } from "@/components/ui/date-picker";

export default function Record() {
  const { appointments, addAppointment, updateAppointment } = useAppointments();
  const { addTranscript } = useTranscripts();
  const { addDocument } = useDocuments();
  const { profile } = useUserProfile();

  const [status, setStatus] = useState<"idle" | "recording" | "processing" | "done">("idle");
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [flowStep, setFlowStep] = useState<1 | 2>(1);
  const [attachMode, setAttachMode] = useState<"existing" | "new">("existing");

  const defaultAppointmentId = appointments[0]?.id ?? "";
  const [selectedAppointmentId, setSelectedAppointmentId] =
    useState<string>(defaultAppointmentId);
  const [attachedAppointmentId, setAttachedAppointmentId] = useState<string | null>(
    defaultAppointmentId || null,
  );

  const [newAppointment, setNewAppointment] = useState<{ doctor: string; date: string }>({
    doctor: "",
    date: "",
  });

  const [consentUnderstands, setConsentUnderstands] = useState(false);
  const [consentVerbalYes, setConsentVerbalYes] = useState(false);
  const [signature, setSignature] = useState("");
  const [setupError, setSetupError] = useState<string | null>(null);

  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!selectedAppointmentId && appointments[0]) {
      setSelectedAppointmentId(appointments[0].id);
      setAttachedAppointmentId(appointments[0].id);
    }
  }, [appointments, selectedAppointmentId]);

  const startRecording = async () => {
    setMicError(null);
    try {
      const audio = new Audio("/sounds/record-start.mp3");
      audio.play().catch(() => { });
    } catch {
      // ignore audio error
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicError("Microphone access is not supported in this browser.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      audioChunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Stop microphone
        stream.getTracks().forEach((track) => track.stop());

        // Simulate processing state
        setStatus("processing");

        try {
          // Upload to backend
          const formData = new FormData();
          formData.append("audio", blob, "recording.webm");
          if (attachedAppointmentId) {
            formData.append("appointmentId", attachedAppointmentId);
          }

          const response = await fetch("/api/transcriptions", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            throw new Error("Failed to upload recording");
          }

          const transcription = await response.json();

          // Attach a transcript to the selected appointment
          if (attachedAppointmentId) {
            const apt = appointments.find((a) => a.id === attachedAppointmentId);
            if (apt) {
              // 1. Create Document (placeholder for now, or use the one from backend if we returned it)
              const docName = `transcript-${apt.doctor.replace(/\s+/g, "_")}-${new Date().toISOString().split("T")[0]}.txt`;
              const doc = addDocument({
                appointmentId: attachedAppointmentId,
                name: docName,
                sizeBytes: blob.size,
                mimeType: "text/plain",
              });

              // 2. Create Transcript linked to Document
              // We use the text returned from backend AND store the backend ID
              const transcript = addTranscript({
                appointmentId: attachedAppointmentId,
                lines: transcription.transcript ? transcription.transcript.split("\n") : ["Processing..."],
                documentId: doc.id,
                backendId: transcription.id // Store backend ID for processing
              });

              // 3. Update Appointment
              const nextTranscriptIds = [...(apt.transcriptIds ?? []), transcript.id];
              const nextDocIds = [...(apt.documentIds ?? []), doc.id];

              updateAppointment(apt.id, {
                transcriptIds: nextTranscriptIds,
                documentIds: nextDocIds
              });
            }
          }
        } catch (err) {
          console.error("Failed to upload/transcribe", err);
          setMicError("Failed to save recording. Please try again.");
        }

        setTimeout(() => {
          setStatus("done");
        }, 1000);
      };

      mediaRecorder.start(1000);
      setStatus("recording");
    } catch (err) {
      console.error("Error accessing microphone", err);
      setMicError("Unable to access microphone. Please check permissions and try again.");
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.stop();
    } else {
      setStatus("idle");
    }
  };

  const handleToggleRecord = () => {
    if (status === "idle") {
      if (!attachedAppointmentId) {
        setMicError("Please select or create an appointment before recording.");
        return;
      }
      void startRecording();
    } else if (status === "recording") {
      stopRecording();
    }
  };

  const attachedAppointment: Appointment | undefined = attachedAppointmentId
    ? appointments.find((apt) => apt.id === attachedAppointmentId)
    : undefined;

  const completedSummary =
    attachedAppointment && attachedAppointment.date
      ? `Attached to ${attachedAppointment.doctor} (${new Date(
        attachedAppointment.date,
      ).toLocaleDateString()})`
      : "Recording attached to the selected appointment.";

  const handleNextFromAppointmentStep = () => {
    setSetupError(null);

    if (attachMode === "existing") {
      if (!selectedAppointmentId) {
        setSetupError("Please select an appointment.");
        return;
      }
      setAttachedAppointmentId(selectedAppointmentId);
      setFlowStep(2);
      return;
    }

    if (!newAppointment.doctor.trim() || !newAppointment.date) {
      setSetupError("Please provide doctor name and date.");
      return;
    }

    const created = addAppointment({
      doctor: newAppointment.doctor.trim(),
      date: new Date(newAppointment.date).toISOString(),
      specialty: "General Medicine",
      reason: "Recorded via CareScribe",
      diagnosis: [],
      notes: "",
      status: "upcoming",
      instructions: [],
      medications: [],
      transcriptIds: [],
      documentIds: [],
    });

    setSelectedAppointmentId(created.id);
    setAttachedAppointmentId(created.id);
    setNewAppointment({ doctor: "", date: "" });
    setFlowStep(2);
  };

  const handleConsentContinue = () => {
    setSetupError(null);

    if (!consentUnderstands || !consentVerbalYes) {
      setSetupError("Please confirm both consent checkboxes.");
      return;
    }

    if (!signature.trim()) {
      setSetupError("Please sign your name.");
      return;
    }

    const fullName = `${profile.firstName} ${profile.lastName}`.toLowerCase();
    if (signature.trim().toLowerCase() !== fullName) {
      setSetupError(`Signature must match your full name: ${profile.firstName} ${profile.lastName}`);
      return;
    }

    setIsSetupComplete(true);
  };

  const attachmentSummaryText = attachedAppointment
    ? `This recording will be attached to ${attachedAppointment.doctor} on ${attachedAppointment.date
      ? new Date(attachedAppointment.date).toLocaleDateString()
      : "unknown date"
    }.`
    : "This recording will be attached to the selected appointment.";

  return (
    <Layout>
      <div className="relative w-full h-full flex flex-col items-center justify-center min-h-[70vh]">
        {!isSetupComplete ? (
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border shadow-sm p-6 md:p-8">
            {flowStep === 1 && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-2">Choose appointment</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Select or create an appointment before recording.
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm font-semibold",
                      attachMode === "existing"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                    onClick={() => setAttachMode("existing")}
                  >
                    Existing
                  </button>
                  <button
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg text-sm font-semibold",
                      attachMode === "new"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground",
                    )}
                    onClick={() => {
                      setAttachMode("new");
                      setNewAppointment(prev => ({ ...prev, date: new Date().toISOString() }));
                    }}
                  >
                    New
                  </button>
                </div>

                {attachMode === "existing" ? (
                  <div className="space-y-2 mb-6">
                    <label className="text-sm font-medium text-foreground">Appointment</label>
                    <select
                      value={selectedAppointmentId}
                      onChange={(e) => setSelectedAppointmentId(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background text-sm"
                    >
                      {appointments.length === 0 && <option value="">No appointments</option>}
                      {appointments
                        .filter((apt) => apt.date && apt.status !== "cancelled") // Only show scheduled and non-cancelled appointments
                        .map((apt) => {
                          const isLab = apt.type === "lab";
                          const label = isLab
                            ? `${apt.labType || "Lab Work"} (Lab) • ${apt.date ? new Date(apt.date).toLocaleDateString() : "No date"}`
                            : `${apt.doctor || "Provider"} • ${apt.date ? new Date(apt.date).toLocaleDateString() : "No date"}`;
                          return (
                            <option key={apt.id} value={apt.id}>
                              {label}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4 mb-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Provider</label>
                      <input
                        type="text"
                        value={newAppointment.doctor}
                        onChange={(e) =>
                          setNewAppointment((prev) => ({ ...prev, doctor: e.target.value }))
                        }
                        className="w-full p-3 border border-border rounded-lg bg-background text-sm"
                        placeholder="e.g. Dr. Emily White"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Date & time</label>
                      <div className="w-full p-3 border border-border rounded-lg bg-muted text-muted-foreground text-sm">
                        {new Date().toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}

                {setupError && (
                  <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">
                    {setupError}
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleNextFromAppointmentStep}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}

            {flowStep === 2 && (
              <>
                <h2 className="text-2xl font-bold text-foreground mb-2">Recording Consent Form</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  By law and ethics, you MUST obtain explicit verbal consent from your healthcare provider before starting this recording. Recording without permission is a serious violation of trust and may be illegal in your state/jurisdiction.
                </p>

                <div className="mb-4 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {attachmentSummaryText}
                </div>

                <div className="space-y-4 mb-4">
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentUnderstands}
                        onChange={(e) => setConsentUnderstands(e.target.checked)}
                        className="mt-1 w-4 h-4"
                        required
                      />
                      <span className="text-sm text-foreground">
                        I have read and understood my legal obligation to obtain consent before recording.
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentVerbalYes}
                        onChange={(e) => setConsentVerbalYes(e.target.checked)}
                        className="mt-1 w-4 h-4"
                        required
                      />
                      <span className="text-sm text-foreground">
                        I verbally confirm that my healthcare provider has given me explicit permission to record this consultation.
                      </span>
                    </label>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <label className="text-sm font-medium text-foreground">
                    Signature (full name) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                    placeholder="Your full name"
                    required
                  />
                </div>

                {setupError && (
                  <div className="mb-4 px-3 py-2 bg-red-50 text-red-700 text-xs rounded-lg">
                    {setupError}
                  </div>
                )}

                <div className="flex justify-between items-center gap-3">
                  <button
                    onClick={() => setFlowStep(1)}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleConsentContinue}
                    className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                  >
                    Agree & continue
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full flex flex-col items-center justify-center">
            {status === "idle" && (
              <div className="text-center max-w-lg flex flex-col items-center justify-center min-h-[70vh]">
                <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center mb-8">
                  <Mic className="w-16 h-16 text-primary" />
                </div>
                <h1 className="text-4xl font-bold text-foreground mb-4">Ready to Record?</h1>
                <p className="text-base text-muted-foreground mb-4 leading-relaxed">
                  When your appointment begins, tap the button below to start recording.
                </p>
                {attachedAppointment && (
                  <p className="text-xs text-primary mb-6 font-medium">
                    Attached to {attachedAppointment.doctor}
                    {attachedAppointment.date &&
                      ` on ${new Date(attachedAppointment.date).toLocaleDateString()}`}
                  </p>
                )}
                <button
                  onClick={handleToggleRecord}
                  className="bg-primary text-primary-foreground px-10 py-4 rounded-full font-bold shadow-lg text-base"
                  disabled={!isSetupComplete}
                >
                  Start Recording
                </button>
                {micError && (
                  <p className="mt-4 text-xs text-red-500 max-w-sm text-center">{micError}</p>
                )}
              </div>
            )}

            {status === "recording" && (
              <div className="w-full max-w-3xl flex flex-col items-center justify-center min-h-[70vh]">
                <div className="text-center mb-10">
                  <div className="inline-flex items-center px-6 py-3 bg-red-500/10 text-red-600 rounded-full text-base font-bold mb-6 border border-red-200 shadow-sm animate-pulse">
                    <span className="mr-3 inline-block w-4 h-4 rounded-full bg-red-600 animate-ping" />
                    Recording in progress
                  </div>
                  <div className="scale-125 md:scale-150">
                    <VoiceVisualizer isRecording={true} />
                  </div>
                </div>

                <button
                  onClick={handleToggleRecord}
                  className="bg-foreground text-background rounded-full px-6 py-6 shadow-lg flex items-center justify-center gap-2 text-base font-semibold"
                >
                  <Square className="w-7 h-7 fill-current" />
                  Stop Recording
                </button>
                {micError && (
                  <p className="mt-4 text-xs text-red-500 max-w-sm text-center">{micError}</p>
                )}
              </div>
            )}

            {status === "processing" && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
                <Loader2 className="w-14 h-14 text-primary animate-spin mb-4" />
                <h2 className="text-2xl font-bold text-foreground">Processing your recording…</h2>
                <p className="text-muted-foreground mt-2 text-sm">
                  We’re getting your appointment ready to be organized and transcribed.
                </p>
              </div>
            )}

            {status === "done" && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-md">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6 text-primary">
                  <CheckCircle2 className="w-14 h-14" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Recording saved</h2>
                <p className="text-muted-foreground mb-2 text-sm">
                  Transcription will be available soon in your appointment details.
                </p>
                <p className="text-sm text-primary font-medium mb-8">{completedSummary}</p>

                <div className="flex flex-col gap-3 w-full">
                  <Link href="/history">
                    <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold text-sm">
                      View appointment
                    </button>
                  </Link>
                  <button
                    onClick={() => {
                      setStatus("idle");
                    }}
                    className="w-full bg-secondary text-foreground py-3 rounded-lg font-medium text-sm"
                  >
                    Record another
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
