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
import { processTranscript } from "./llm";

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

      const processed = await processTranscript(combinedText);
      console.log("Manual AI Processing:", JSON.stringify(processed, null, 2));

      if (appointmentId) {
        // Get existing appointment data to check for duplicates
        const existingApt = (await storage.getAppointments(userId)).find(a => a.id === appointmentId);
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

        // Create Tasks (check for duplicates by title)
        for (const task of processed.tasks) {
          const duplicate = existingTasks.find(
            t => t.title.toLowerCase().trim() === task.title.toLowerCase().trim() &&
              !t.completed
          );
          if (!duplicate) {
            await storage.createTask({
              userId,
              title: task.title,
              type: task.type || "general", // Use AI type or fallback
              due: task.due || new Date().toISOString(),
              completed: false,
            });
          }
        }

        // Create Follow-up Appointment (check for duplicates by date and reason)
        if (processed.followUp && processed.followUp.date) {
          const allApts = await storage.getAppointments(userId);
          const duplicateApt = allApts.find(
            a => a.date === processed.followUp!.date &&
              a.reason.toLowerCase().includes('follow')
          );

          if (!duplicateApt && existingApt) {
            await storage.createAppointment({
              userId,
              doctor: existingApt.doctor || "Dr. Smith",
              specialty: existingApt.specialty || "General",
              date: processed.followUp.date,
              reason: processed.followUp.reason || "Follow-up",
              status: "upcoming",
              diagnosis: null,
              notes: null,
              instructions: null
            });
          }
        }
      }

      res.json({ success: true, processed });
    } catch (error) {
      console.error("Manual AI processing error:", error);
      res.status(500).json({ message: "Failed to process transcript" });
    }
  });

  return httpServer;
}
