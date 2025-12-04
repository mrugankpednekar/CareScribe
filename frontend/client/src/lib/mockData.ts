export interface Appointment {
  id: string;
  date: string;
  doctor: string;
  specialty: string;
  reason: string;
  diagnosis: string[];
  notes: string;
  status: "completed" | "upcoming" | "processing";
  instructions?: string[];
  medications?: Medication[];
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reason: string;
  active: boolean;
}

export interface Task {
  id: string;
  title: string;
  due: string; // ISO date or "Today"
  type: "medication" | "appointment" | "lab" | "exercise";
  completed: boolean;
}

export const mockAppointments: Appointment[] = [];

export const mockTasks: Task[] = [];

export const mockMessages = [];
