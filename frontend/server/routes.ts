import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema,
  insertMedicationSchema,
  insertTaskSchema,
  insertMessageSchema
} from "@shared/schema";
import multer from "multer";
import { transcribeAudio } from "./transcription";
import { processTranscript, generateChatReply, type ChatMessage } from "./llm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Appointments
  app.get("/api/appointments", async (req, res) => {
    // In a real app, get userId from session
    const userId = "user-1";
    const appointments = await storage.getAppointments(userId);
    res.json(appointments);
  });

  app.post("/api/appointments", async (req, res) => {
    const userId = "user-1";
    const parsed = insertAppointmentSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const appointment = await storage.createAppointment(parsed.data);
    res.json(appointment);
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      await storage.deleteAppointment(req.params.id);
      res.sendStatus(204);
    } catch (e) {
      res.status(404).json({ message: "Appointment not found" });
    }
  });

  // Medications
  app.get("/api/medications", async (req, res) => {
    const userId = "user-1";
    const medications = await storage.getMedications(userId);
    res.json(medications);
  });

  app.post("/api/medications", async (req, res) => {
    const userId = "user-1";
    const parsed = insertMedicationSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const medication = await storage.createMedication(parsed.data);
    res.json(medication);
  });

  app.patch("/api/medications/:id/toggle", async (req, res) => {
    try {
      const medication = await storage.toggleMedication(req.params.id);
      res.json(medication);
    } catch (e) {
      res.status(404).json({ message: "Medication not found" });
    }
  });

  app.delete("/api/medications/:id", async (req, res) => {
    try {
      await storage.deleteMedication(req.params.id);
      res.sendStatus(204);
    } catch (e) {
      res.status(404).json({ message: "Medication not found" });
    }
  });

  // Tasks
  app.get("/api/tasks", async (req, res) => {
    const userId = "user-1";
    const tasks = await storage.getTasks(userId);
    res.json(tasks);
  });

  app.post("/api/tasks", async (req, res) => {
    const userId = "user-1";
    const parsed = insertTaskSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const task = await storage.createTask(parsed.data);
    res.json(task);
  });

  app.patch("/api/tasks/:id/toggle", async (req, res) => {
    try {
      const task = await storage.toggleTask(req.params.id);
      res.json(task);
    } catch (e) {
      res.status(404).json({ message: "Task not found" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      await storage.deleteTask(req.params.id);
      res.sendStatus(204);
    } catch (e) {
      res.status(404).json({ message: "Task not found" });
    }
  });

  // Messages
  app.get("/api/messages", async (req, res) => {
    const userId = "user-1";
    const messages = await storage.getMessages(userId);
    res.json(messages);
  });

  app.post("/api/messages", async (req, res) => {
    const userId = "user-1";
    const parsed = insertMessageSchema.safeParse({ ...req.body, userId });
    if (!parsed.success) {
      return res.status(400).json(parsed.error);
    }
    const message = await storage.addMessage(parsed.data);
    res.json(message);
  });

  // Transcriptions
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
  });

  app.post("/api/transcriptions", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file uploaded" });
      }

      const { appointmentId } = req.body;
      // Use hardcoded userId to match the rest of the app's current state
      const userId = "user-1";

      // 1. Transcribe audio
      const transcriptText = await transcribeAudio(req.file.buffer);

      // 2. Save to database
      const transcription = await storage.createTranscription({
        userId,
        appointmentId: appointmentId || null,
        audioUrl: "placeholder-url", // In a real app, upload to S3/Blob storage
        transcript: transcriptText,
        status: "completed",
      });

      // AI processing is now manual-only via the "Process Transcript" button
      // Users can process all transcripts together from the appointment details page

      res.json(transcription);
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ message: "Failed to process transcription" });
    }
  });

  // Get transcriptions (with optional appointmentId filter)
  app.get("/api/transcriptions", async (req, res) => {
    const userId = "user-1";
    const appointmentId = req.query.appointmentId as string | undefined;

    const allTranscriptions = await storage.getTranscriptions(userId);

    if (appointmentId) {
      const filtered = allTranscriptions.filter(t => t.appointmentId === appointmentId);
      return res.json(filtered);
    }

    res.json(allTranscriptions);
  });

  app.get("/api/transcriptions/:id", async (req, res) => {
    const transcription = await storage.getTranscription(req.params.id);
    if (!transcription) {
      return res.status(404).json({ message: "Transcription not found" });
    }
    res.json(transcription);
  });

  // Process ALL transcripts for an appointment with AI
  app.post("/api/transcriptions/:id/process", async (req, res) => {
    try {
      const userId = "user-1";
      const transcription = await storage.getTranscription(req.params.id);

      if (!transcription) {
        return res.status(404).json({ message: "Transcription not found" });
      }

      const appointmentId = transcription.appointmentId;
      if (!appointmentId) {
        return res.status(400).json({ message: "Transcription not linked to appointment" });
      }

      // Get ALL transcriptions for this appointment
      const allTranscriptions = (await storage.getTranscriptions(userId))
        .filter(t => t.appointmentId === appointmentId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      if (allTranscriptions.length === 0) {
        return res.status(400).json({ message: "No transcripts found" });
      }

      // Combine all transcript texts
      const combinedText = allTranscriptions
        .map((t, i) => `[Recording ${i + 1}/${allTranscriptions.length}]\n${t.transcript || ""}`)
        .join("\n\n");

      console.log(`Processing ${allTranscriptions.length} transcript(s) for appointment ${appointmentId}`);

      // Fetch appointment details to pass to LLM
      const existingApt = (await storage.getAppointments(userId)).find(a => a.id === appointmentId);

      const processed = await processTranscript(combinedText, existingApt ? {
        doctor: existingApt.doctor,
        date: existingApt.date,
        appointmentId: existingApt.id
      } : undefined);

      console.log("Manual AI Processing:", JSON.stringify(processed, null, 2));

      if (appointmentId && existingApt) {
        const existingMeds = await storage.getMedications(userId);
        const existingTasks = await storage.getTasks(userId);

        // Update Appointment details (merge, don't overwrite)
        await storage.updateAppointment(appointmentId, {
          diagnosis: processed.diagnosis ? [processed.diagnosis] : undefined,
          notes: processed.notes || undefined,
          instructions: processed.instructions ? [processed.instructions] : undefined,
        });

        // Create Medications (check for duplicates by name)
        for (const med of processed.medications) {
          const duplicate = existingMeds.find(
            m => m.name.toLowerCase().trim() === med.name.toLowerCase().trim() &&
              m.appointmentId === appointmentId
          );
          if (!duplicate) {
            await storage.createMedication({
              userId,
              name: med.name,
              dosage: med.dosage,
              frequency: med.frequency,
              reason: med.reason,
              active: true,
              appointmentId,
            });
          }
        }

        // Create Appointments
        for (const apt of processed.appointments) {
          // Safety check: skip generic doctor names that the AI might still generate
          const genericNames = ["doctor", "provider", "new provider", "specialist", "unknown"];
          if (genericNames.some(name => apt.doctor.toLowerCase().includes(name)) && !apt.doctor.toLowerCase().includes("dr.")) {
            console.log("Skipping generic appointment:", apt.doctor);
            continue;
          }

          const duplicate = (await storage.getAppointments(userId)).find(
            a => a.date === apt.date && a.doctor === apt.doctor
          );
          if (!duplicate) {
            await storage.createAppointment({
              userId,
              doctor: apt.doctor,
              specialty: apt.specialty,
              date: `${apt.date.split("T")[0]}T12:00:00`,
              reason: apt.reason,
              status: "upcoming",
              diagnosis: null,
              notes: null,
              instructions: null
            });
          }
        }

        // Create Labs (as Appointments with type='lab')
        for (const lab of processed.labs) {
          const duplicate = (await storage.getAppointments(userId)).find(
            a => a.date === lab.date && a.labType === lab.labType
          );
          if (!duplicate) {
            await storage.createAppointment({
              userId,
              doctor: existingApt?.doctor || "Lab",
              specialty: "Lab",
              date: `${lab.date.split("T")[0]}T12:00:00`,
              reason: lab.reason,
              status: "upcoming",
              type: "lab",
              labType: lab.labType,
              attachedProviderId: appointmentId,
              diagnosis: null,
              notes: null,
              instructions: null
            });
          }
        }

        // Create Activities (Tasks)
        console.log('Processing activities:', processed.activities);
        for (const activity of processed.activities) {
          const duplicate = existingTasks.find(
            t => t.title.toLowerCase().trim() === activity.title.toLowerCase().trim() &&
              !t.completed
          );
          if (!duplicate) {
            console.log('Creating activity task:', activity);
            const created = await storage.createTask({
              userId,
              title: activity.title,
              type: "activity",
              due: activity.due || new Date().toISOString(),
              completed: false,
            });
            console.log('Created task:', created);
          } else {
            console.log('Skipping duplicate activity:', activity.title);
          }
        }

      }

      // Update status of all processed transcriptions to 'completed'
      for (const t of allTranscriptions) {
        await storage.updateTranscription(t.id, { status: "completed" });
      }

      res.json({ success: true, processed });
    } catch (error) {
      console.error("Manual AI processing error:", error);
      res.status(500).json({ message: "Failed to process transcript" });
    }
  });

  // Chat endpoint with full user context
  app.post("/api/chat", async (req, res) => {
    try {
      const userId = "user-1";
      const messages = (req.body?.messages || []) as ChatMessage[];
      const clientContext = (req.body?.context || {}) as Record<string, unknown>;
      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "messages array required" });
      }

      const serverContext = await buildUserContext(userId);
      const context = { ...serverContext, ...clientContext };
      try {
        const reply = await generateChatReply(messages, context);
        return res.json({ reply });
      } catch (err) {
        console.error("Chat LLM failed, falling back to heuristic:", err);
        const fallback = buildHeuristicReply(messages[messages.length - 1]?.content || "", context);
        return res.json({ reply: fallback });
      }
    } catch (error) {
      console.error("Chat error:", error);
      res.status(500).json({ message: "Failed to generate chat response" });
    }
  });

  return httpServer;
}

async function buildUserContext(userId: string) {
  const [appointments, medications, tasks, transcriptions] = await Promise.all([
    storage.getAppointments(userId),
    storage.getMedications(userId),
    storage.getTasks(userId),
    storage.getTranscriptions(userId),
  ]);

  // Keep transcripts concise for the LLM
  const recentTranscripts = transcriptions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)
    .map((t) => ({
      id: t.id,
      appointmentId: t.appointmentId,
      transcript: t.transcript,
      createdAt: t.createdAt,
    }));

  return {
    appointments,
    medications,
    tasks,
    transcriptions: recentTranscripts,
  };
}

// Simple heuristic fallback when LLM is unavailable
function buildHeuristicReply(latestUserMessage: string, context: Awaited<ReturnType<typeof buildUserContext>>): string {
  const msg = latestUserMessage.toLowerCase();

  const upcomingApts = (context.appointments || []).filter(a => a.date && a.status !== "cancelled")
    .sort((a, b) => new Date(a.date || 0).getTime() - new Date(b.date || 0).getTime())
    .slice(0, 5);

  const activeMeds = (context.medications || []).filter(m => m.active);

  if (msg.includes("appointment")) {
    if (!upcomingApts.length) return "You have no upcoming appointments in your record.";
    const lines = upcomingApts.map(a => {
      const when = a.date ? new Date(a.date).toLocaleString() : "unscheduled";
      return `${a.doctor || "Provider"} on ${when} (${a.reason || "no reason recorded"})`;
    });
    return `Upcoming appointments:\n- ${lines.join("\n- ")}`;
  }

  if (msg.includes("med") || msg.includes("prescription")) {
    if (!activeMeds.length) return "You have no active medications in your record.";
    const lines = activeMeds.map(m => {
      const freq = m.frequency || "";
      return `${m.name} ${m.dosage || ""} (${freq})`;
    });
    return `Active medications:\n- ${lines.join("\n- ")}`;
  }

  return "I don't have enough context to answer that. Try asking about your appointments or medications.";
}
