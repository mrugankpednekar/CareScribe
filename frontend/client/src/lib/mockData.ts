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

export const mockAppointments: Appointment[] = [
  {
    id: "apt-1",
    date: "2024-05-15T10:00:00",
    doctor: "Dr. Sarah Chen",
    specialty: "Cardiology",
    reason: "Annual Checkup & Chest Pain",
    diagnosis: ["Hypertension", "Vitamin D Deficiency"],
    status: "completed",
    notes: "Patient reported mild chest discomfort after exercise. BP 140/90. Recommended lifestyle changes.",
    instructions: [
      "Monitor blood pressure daily in the morning",
      "Reduce salt intake to <2g per day",
      "Walk for 30 minutes daily"
    ],
    medications: [
      { id: "med-1", name: "Lisinopril", dosage: "10mg", frequency: "Once daily", reason: "Blood Pressure", active: true },
      { id: "med-2", name: "Vitamin D3", dosage: "2000 IU", frequency: "Once daily", reason: "Deficiency", active: true }
    ]
  },
  {
    id: "apt-2",
    date: "2024-02-10T14:30:00",
    doctor: "Dr. Michael Ross",
    specialty: "Orthopedics",
    reason: "Lower Back Pain",
    diagnosis: ["Lumbar Strain"],
    status: "completed",
    notes: "Pain level 6/10. No radiculopathy. Prescribed PT.",
    instructions: [
      "Apply heat for 20 mins twice daily",
      "Perform prescribed stretches",
      "Avoid heavy lifting > 20lbs"
    ]
  },
  {
    id: "apt-3",
    date: "2024-06-20T09:00:00",
    doctor: "Dr. Emily White",
    specialty: "Dermatology",
    reason: "Skin Check",
    diagnosis: [],
    status: "upcoming",
    notes: "Routine annual screening.",
    instructions: []
  }
];

export const mockTasks: Task[] = [
  { id: "task-1", title: "Take Lisinopril (10mg)", due: "08:00 AM", type: "medication", completed: true },
  { id: "task-2", title: "Take Vitamin D3 (2000 IU)", due: "08:00 AM", type: "medication", completed: true },
  { id: "task-3", title: "Blood Pressure Log", due: "09:00 AM", type: "lab", completed: false },
  { id: "task-4", title: "30 min Walk", due: "Anytime", type: "exercise", completed: false },
  { id: "task-5", title: "Book Follow-up with Dr. Chen", due: "Next Week", type: "appointment", completed: false },
];

export const mockMessages = [
  { role: "system", content: "You are CareScribe, a helpful medical assistant." },
  { role: "user", content: "What did Dr. Chen say about my exercise?" },
  { role: "assistant", content: "Dr. Chen recommended that you walk for 30 minutes daily as part of your lifestyle changes to help manage your blood pressure." },
  { role: "user", content: "When is my next appointment?" },
  { role: "assistant", content: "You have an upcoming appointment with Dr. Emily White (Dermatology) on June 20, 2024, at 9:00 AM." }
];
