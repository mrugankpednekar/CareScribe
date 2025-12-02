import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/layout/Layout";
import { VoiceVisualizer } from "@/components/record/VoiceVisualizer";
import { Mic, Square, Loader2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { useAppointments } from "@/context/AppointmentsContext";
import type { Appointment } from "@/lib/types";
import { useTranscripts } from "@/context/TranscriptsContext";

export default function Record() {
  const { appointments, addAppointment, updateAppointment } = useAppointments();
  const { addTranscript } = useTranscripts();

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
      audio.play().catch(() => {});
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

        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = reader.result as string;

            try {
              // Store recording keyed by appointment (if we have one)
              const key = attachedAppointmentId
                ? `recordingData:${attachedAppointmentId}`
                : "recordingData";
              window.localStorage.setItem(key, base64);
            } catch {
              // localStorage might be full or unavailable
            }
          };
          reader.readAsDataURL(blob);
        } catch {
          // ignore for now
        }

        // Stop microphone
        stream.getTracks().forEach((track) => track.stop());

        // Simulate processing state
        setStatus("processing");

        // Attach a transcript to the selected appointment
        if (attachedAppointmentId) {
          try {
            // Create a basic transcript for now
            const transcript = addTranscript({
              appointmentId: attachedAppointmentId,
              lines: [
                "Audio visit recorded with CareScribe.",
                "Transcription service is not wired up yet, this is a demo transcript attached to your visit.",
              ],
            });

            // Also update the appointment's transcriptIds list
            const apt = appointments.find((a) => a.id === attachedAppointmentId);
            if (apt) {
              const nextTranscriptIds = [...(apt.transcriptIds ?? []), transcript.id];
              updateAppointment(apt.id, { transcriptIds: nextTranscriptIds });
            }
          } catch (err) {
            console.error("Failed to attach transcript to appointment", err);
          }
        }

        setTimeout(() => {
          setStatus("done");
        }, 2000);
      };

      mediaRecorder.start();
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

    setIsSetupComplete(true);
  };

  const attachmentSummaryText = attachedAppointment
    ? `This recording will be attached to ${attachedAppointment.doctor} on ${
        attachedAppointment.date
          ? new Date(attachedAppointment.date).toLocaleDateString()
          : "unknown date"
      }.`
    : "This recording will be attached to the selected appointment.";

  return (
    <Layout>
      <div className="relative w-full h-full">
        {!isSetupComplete && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative bg-card max-w-lg w-full rounded-2xl border border-border shadow-xl p-6 md:p-8">
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
                      onClick={() => setAttachMode("new")}
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
                        {appointments.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            {apt.doctor || "Provider"} •{" "}
                            {apt.date ? new Date(apt.date).toLocaleDateString() : "No date"}
                          </option>
                        ))}
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
                        <input
                          type="datetime-local"
                          value={newAppointment.date}
                          onChange={(e) =>
                            setNewAppointment((prev) => ({ ...prev, date: e.target.value }))
                          }
                          className="w-full p-3 border border-border rounded-lg bg-background text-sm"
                        />
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
                  <h2 className="text-2xl font-bold text-foreground mb-2">Recording consent</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Please confirm consent before recording.
                  </p>

                  <div className="mb-4 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {attachmentSummaryText}
                  </div>

                  <div className="space-y-3 mb-4 text-sm">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={consentUnderstands}
                        onChange={(e) => setConsentUnderstands(e.target.checked)}
                        className="mt-1"
                      />
                      <span>I understand I must obtain my doctor’s consent before recording.</span>
                    </label>

                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={consentVerbalYes}
                        onChange={(e) => setConsentVerbalYes(e.target.checked)}
                        className="mt-1"
                      />
                      <span>I confirm I received a verbal “yes” from my doctor to record.</span>
                    </label>
                  </div>

                  <div className="space-y-2 mb-4">
                    <label className="text-xs font-medium text-foreground">
                      Signature (full name)
                    </label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="w-full p-2.5 border border-border rounded-lg bg-background text-sm"
                      placeholder="Your full name"
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
                      className="px-4 py-2 rounded-lg border border-border text-xs font-medium"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleConsentContinue}
                      className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
                    >
                      Agree & continue
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <div className="flex flex-col items-center justify-center min-h-[70vh] w-full">
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
                  <div className="inline-flex items-center px-5 py-2 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-6">
                    <span className="mr-2 inline-block w-3 h-3 rounded-full bg-red-500 animate-pulse" />
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
                  Your audio is saved locally and linked to your appointment. It will be ready to send
                  to the backend for transcription.
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
        </div>
      </div>
    </Layout>
  );
}
