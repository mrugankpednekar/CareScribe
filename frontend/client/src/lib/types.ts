// Appointment & related

export type AppointmentStatus = "upcoming" | "completed" | "cancelled";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  active: boolean;
}

export interface Appointment {
  id: string;
  date?: string; // ISO string, optional if user skipped for past visit
  doctor: string;
  specialty?: string; // "General", "Dermatology", "ENT", etc.
  reason?: string;
  notes?: string; // AI summary / free-text notes
  status: AppointmentStatus;
  diagnosis: string[];
  instructions: string[];
  medications: Medication[];

  // Backend-linked fields (ids to other lists / resources)
  transcriptIds?: string[];  // IDs of transcripts stored in backend
  documentIds?: string[];    // IDs of docs stored in backend
}

// Transcript metadata (actual content will come from backend)
export interface Transcript {
  id: string;
  appointmentId: string;
  createdAt: string; // ISO
  summary?: string;
  // You might later add: url to fetch full text, or partial preview
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
}
