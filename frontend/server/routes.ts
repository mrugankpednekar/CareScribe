import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertAppointmentSchema,
  insertMedicationSchema,
  insertTaskSchema,
  insertMessageSchema
} from "@shared/schema";

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

  return httpServer;
}
