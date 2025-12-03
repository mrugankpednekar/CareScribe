// Appointment & related

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string; // e.g., "Once daily", "Twice daily", "Every 8 hours"
  active: boolean;
  // Calendar scheduling fields
  times?: string[]; // Array of times in HH:MM format, e.g., ["08:00", "20:00"]
  startDate?: string; // ISO date string when medication starts
  endDate?: string; // ISO date string when medication ends (optional for ongoing)
  // Prescription details
  prescribedBy?: string; // Doctor name
  prescribedDate?: string; // ISO date string
  appointmentId?: string; // Link to appointment if prescribed during visit
  reason?: string; // Why this medication was prescribed

  // Recurrence fields
  frequencyType?: "daily" | "weekly" | "once";
  selectedDays?: number[]; // 0-6 (Sun-Sat)
  skippedDates?: string[]; // ISO date strings to skip
}

export type AppointmentType = "appointment" | "lab";

export interface Appointment {
  id: string;
  type?: AppointmentType; // "appointment" or "lab", defaults to "appointment"
  date?: string; // ISO string, optional if user skipped for past visit
  doctor: string;
  specialty?: string; // "General", "Dermatology", "ENT", etc.
  reason?: string;
  notes?: string; // AI summary / free-text notes
  status: AppointmentStatus;
  diagnosis: string[];
  instructions: string[];
  medications: Medication[];

  // Lab-specific fields
  labType?: string; // e.g., "Blood Test", "X-Ray", "MRI", etc.
  attachedProviderId?: string; // Appointment ID of the provider who ordered this lab

  // Backend-linked fields (ids to other lists / resources)
  transcriptIds?: string[];  // IDs of transcripts stored in backend
  documentIds?: string[];    // IDs of docs stored in backend
}



// Document metadata (file stored in backend, only meta & link here)
export interface DocumentMeta {
  id: string;
  appointmentId?: string;    // optional: could be unattached
  name: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;        // ISO
  downloadUrl?: string;      // signed URL provided by backend
}

// Basic user profile

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  age?: number;
  bloodType?: string;
  weightKg?: number;
  heightCm?: number;
  gender?: string
}


export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt?: string; // ISO
}

export interface Transcript {
  id: string;
  appointmentId: string;
  createdAt: string; // ISO
  title: string;
  lines: string[];
  documentId?: string; // Link to the corresponding document
  backendId?: string; // Backend transcription ID for API calls
}
// ---------------------------
// Calendar + Checklist Types
// ---------------------------

// Valid event/task types
export type EventType =
  | "appointment"
  | "lab"
  | "medication"
  | "activity"
  | "other";

// Task object used by TaskCard
export interface Task {
  id: string;
  title: string;
  subtitle?: string;
  due: string;
  type: EventType;
  completed: boolean;
}

// Calendar tasks used by Calendar.tsx
export interface CalendarTask {
  id: string;
  date: Date;
  title: string;
  type: EventType;
  time?: string;
  originalId?: string;
}
