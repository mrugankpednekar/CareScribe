
import {
  type User, type InsertUser,
  type Appointment, type InsertAppointment,
  type Medication, type InsertMedication,
  type Task, type InsertTask,
  type Message, type InsertMessage,
  type Transcription, type InsertTranscription
} from "@shared/schema";
import { users, appointments, medications, tasks, messages, transcriptions } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { drizzle } from "drizzle-orm/neon-serverless";
import { randomUUID } from "crypto";

const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Appointments
  getAppointments(userId: string): Promise<Appointment[]>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, appointment: Partial<InsertAppointment>): Promise<Appointment>;

  // Medications
  getMedications(userId: string): Promise<Medication[]>;
  createMedication(medication: InsertMedication): Promise<Medication>;
  toggleMedication(id: string): Promise<Medication>;

  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  toggleTask(id: string): Promise<Task>;

  // Messages
  getMessages(userId: string): Promise<Message[]>;
  addMessage(message: InsertMessage): Promise<Message>;

  // Transcriptions
  getTranscriptions(userId: string): Promise<Transcription[]>;
  getTranscription(id: string): Promise<Transcription | undefined>;
  createTranscription(transcription: InsertTranscription): Promise<Transcription>;
  updateTranscription(id: string, update: Partial<InsertTranscription>): Promise<Transcription>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private appointments: Map<string, Appointment>;
  private medications: Map<string, Medication>;
  private tasks: Map<string, Task>;
  private messages: Map<string, Message>;
  private transcriptions: Map<string, Transcription>;

  constructor() {
    this.users = new Map();
    this.appointments = new Map();
    this.medications = new Map();
    this.tasks = new Map();
    this.messages = new Map();
    this.transcriptions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Appointments
  async getAppointments(userId: string): Promise<Appointment[]> {
    return Array.from(this.appointments.values()).filter(
      (apt) => apt.userId === userId,
    );
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    const id = randomUUID();
    const appointment: Appointment = {
      ...insertAppointment,
      id,
      diagnosis: insertAppointment.diagnosis || null,
      notes: insertAppointment.notes || null,
      instructions: insertAppointment.instructions || null
    };
    this.appointments.set(id, appointment);
    return appointment;
  }

  async updateAppointment(id: string, update: Partial<InsertAppointment>): Promise<Appointment> {
    const existing = this.appointments.get(id);
    if (!existing) throw new Error("Appointment not found");
    const updated = { ...existing, ...update };
    this.appointments.set(id, updated);
    return updated;
  }

  // Medications
  async getMedications(userId: string): Promise<Medication[]> {
    return Array.from(this.medications.values()).filter(
      (med) => med.userId === userId,
    );
  }

  async createMedication(insertMedication: InsertMedication): Promise<Medication> {
    const id = randomUUID();
    const medication: Medication = {
      ...insertMedication,
      id,
      active: insertMedication.active ?? true,
      appointmentId: insertMedication.appointmentId || null
    };
    this.medications.set(id, medication);
    return medication;
  }

  async toggleMedication(id: string): Promise<Medication> {
    const med = this.medications.get(id);
    if (!med) throw new Error("Medication not found");
    const updated = { ...med, active: !med.active };
    this.medications.set(id, updated);
    return updated;
  }

  // Tasks
  async getTasks(userId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.userId === userId,
    );
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = randomUUID();
    const task: Task = {
      ...insertTask,
      id,
      completed: insertTask.completed ?? false
    };
    this.tasks.set(id, task);
    return task;
  }

  async toggleTask(id: string): Promise<Task> {
    const task = this.tasks.get(id);
    if (!task) throw new Error("Task not found");
    const updated = { ...task, completed: !task.completed };
    this.tasks.set(id, updated);
    return updated;
  }

  // Messages
  async getMessages(userId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter((msg) => msg.userId === userId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { ...insertMessage, id };
    this.messages.set(id, message);
    return message;
  }

  // Transcriptions
  async getTranscriptions(userId: string): Promise<Transcription[]> {
    return Array.from(this.transcriptions.values()).filter(
      (t) => t.userId === userId
    );
  }

  async getTranscription(id: string): Promise<Transcription | undefined> {
    return this.transcriptions.get(id);
  }

  async createTranscription(insertTranscription: InsertTranscription): Promise<Transcription> {
    const id = randomUUID();
    const transcription: Transcription = {
      ...insertTranscription,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transcript: insertTranscription.transcript || null,
      appointmentId: insertTranscription.appointmentId || null,
      status: insertTranscription.status || "pending"
    };
    this.transcriptions.set(id, transcription);
    return transcription;
  }

  async updateTranscription(id: string, update: Partial<InsertTranscription>): Promise<Transcription> {
    const existing = this.transcriptions.get(id);
    if (!existing) throw new Error("Transcription not found");
    const updated = {
      ...existing,
      ...update,
      updatedAt: new Date().toISOString()
    };
    this.transcriptions.set(id, updated);
    return updated;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  db: ReturnType<typeof drizzle> | undefined;

  constructor() {
    this.db = db;
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true,
    });
    if (!db) throw new Error("DB not initialized");
  }

  async getUser(id: string): Promise<User | undefined> {
    if (!this.db) throw new Error("DB not initialized");
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!this.db) throw new Error("DB not initialized");
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!this.db) throw new Error("DB not initialized");
    const [user] = await this.db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAppointments(userId: string): Promise<Appointment[]> {
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.select().from(appointments).where(eq(appointments.userId, userId));
  }

  async createAppointment(insertAppointment: InsertAppointment): Promise<Appointment> {
    if (!this.db) throw new Error("DB not initialized");
    const [appointment] = await this.db.insert(appointments).values(insertAppointment).returning();
    return appointment;
  }

  async updateAppointment(id: string, update: Partial<InsertAppointment>): Promise<Appointment> {
    if (!this.db) throw new Error("DB not initialized");
    const [appointment] = await this.db
      .update(appointments)
      .set(update)
      .where(eq(appointments.id, id))
      .returning();
    return appointment;
  }

  async getMedications(userId: string): Promise<Medication[]> {
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.select().from(medications).where(eq(medications.userId, userId));
  }

  async createMedication(insertMedication: InsertMedication): Promise<Medication> {
    if (!this.db) throw new Error("DB not initialized");
    const [medication] = await this.db.insert(medications).values(insertMedication).returning();
    return medication;
  }

  async toggleMedication(id: string): Promise<Medication> {
    if (!this.db) throw new Error("DB not initialized");
    const [medication] = await this.db
      .update(medications)
      .set({ active: sql`NOT active` })
      .where(eq(medications.id, id))
      .returning();
    return medication;
  }

  async getTasks(userId: string): Promise<Task[]> {
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.select().from(tasks).where(eq(tasks.userId, userId));
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    if (!this.db) throw new Error("DB not initialized");
    const [task] = await this.db.insert(tasks).values(insertTask).returning();
    return task;
  }

  async toggleTask(id: string): Promise<Task> {
    if (!this.db) throw new Error("DB not initialized");
    const [task] = await this.db
      .update(tasks)
      .set({ completed: sql`NOT completed` })
      .where(eq(tasks.id, id))
      .returning();
    return task;
  }

  async getMessages(userId: string): Promise<Message[]> {
    if (!this.db) throw new Error("DB not initialized");
    return await this.db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(messages.timestamp);
  }

  async addMessage(insertMessage: InsertMessage): Promise<Message> {
    if (!this.db) throw new Error("DB not initialized");
    const [message] = await this.db.insert(messages).values(insertMessage).returning();
    return message;
  }

  // Transcriptions
  async getTranscriptions(userId: string): Promise<Transcription[]> {
    if (!this.db) throw new Error("DB not initialized");
    return await this.db.select().from(transcriptions).where(eq(transcriptions.userId, userId));
  }

  async getTranscription(id: string): Promise<Transcription | undefined> {
    if (!this.db) throw new Error("DB not initialized");
    const [transcription] = await this.db.select().from(transcriptions).where(eq(transcriptions.id, id));
    return transcription;
  }

  async createTranscription(insertTranscription: InsertTranscription): Promise<Transcription> {
    if (!this.db) throw new Error("DB not initialized");
    const [transcription] = await this.db
      .insert(transcriptions)
      .values(insertTranscription)
      .returning();
    return transcription;
  }

  async updateTranscription(id: string, update: Partial<InsertTranscription>): Promise<Transcription> {
    if (!this.db) throw new Error("DB not initialized");
    const [transcription] = await this.db
      .update(transcriptions)
      .set({ ...update, updatedAt: new Date().toISOString() })
      .where(eq(transcriptions.id, id))
      .returning();
    return transcription;
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
