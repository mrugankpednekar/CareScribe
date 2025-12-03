import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Appointment } from "@/lib/types";
import { mockAppointments } from "@/lib/mockData";

type AppointmentInput = Omit<Appointment, "id"> & { id?: string };

interface AppointmentsContextValue {
  appointments: Appointment[];
  addAppointment: (appointment: AppointmentInput) => Appointment;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Appointment | undefined;
  deleteAppointment: (id: string) => void;
}

const AppointmentsContext = createContext<AppointmentsContextValue | undefined>(undefined);

const APPOINTMENTS_KEY = "cs_appointments";

function normalizeInitialAppointments(): Appointment[] {
  return mockAppointments.map((apt: any) => {
    const safeStatus =
      apt.status === "processing" ? "upcoming" : apt.status;

    return {
      id: apt.id,
      type: apt.type || "appointment",
      date: apt.date,
      doctor: apt.doctor || "New Provider",
      specialty: apt.specialty || "General",
      reason: apt.reason || "",
      notes: apt.notes || "",
      status: safeStatus,
      diagnosis: apt.diagnosis ?? [],
      instructions: apt.instructions ?? [],
      medications: apt.medications ?? [],
      labType: apt.labType,
      attachedProviderId: apt.attachedProviderId,
      transcriptIds: apt.transcriptIds ?? [],
      documentIds: apt.documentIds ?? [],
    } as Appointment;
  });
}

function loadInitialAppointments(): Appointment[] {
  if (typeof window === "undefined") return normalizeInitialAppointments();
  try {
    const raw = window.localStorage.getItem(APPOINTMENTS_KEY);
    if (!raw) return normalizeInitialAppointments();
    const parsed = JSON.parse(raw) as Appointment[];
    if (!Array.isArray(parsed)) return normalizeInitialAppointments();
    return parsed;
  } catch {
    return normalizeInitialAppointments();
  }
}

export function AppointmentsProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>(() => loadInitialAppointments());

  useEffect(() => {
    try {
      window.localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
    } catch {
      // ignore storage errors
    }
  }, [appointments]);

  const addAppointment = (appointment: AppointmentInput): Appointment => {
    const id =
      appointment.id ??
      `apt-${(globalThis.crypto?.randomUUID?.() ?? Date.now().toString())}`;

    const normalized: Appointment = {
      id,
      type: appointment.type ?? "appointment",
      doctor: appointment.doctor || "New Provider",
      date: appointment.date,
      specialty: appointment.specialty ?? "General",
      reason: appointment.reason ?? "",
      notes: appointment.notes ?? "",
      status: (appointment.status ?? "upcoming") as Appointment["status"],
      diagnosis: appointment.diagnosis ?? [],
      instructions: appointment.instructions ?? [],
      medications: appointment.medications ?? [],
      labType: appointment.labType,
      attachedProviderId: appointment.attachedProviderId,
      transcriptIds: appointment.transcriptIds ?? [],
      documentIds: appointment.documentIds ?? [],
    };

    setAppointments(prev => {
      const next = [...prev, normalized];
      return next.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
    });

    return normalized;
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>): Appointment | undefined => {
    let updated: Appointment | undefined;

    setAppointments(prev => {
      const next = prev.map(apt => {
        if (apt.id !== id) return apt;
        const merged: Appointment = {
          ...apt,
          ...updates,
          diagnosis: updates.diagnosis ?? apt.diagnosis,
          instructions: updates.instructions ?? apt.instructions,
          medications: updates.medications ?? apt.medications,
          transcriptIds: updates.transcriptIds ?? apt.transcriptIds,
          documentIds: updates.documentIds ?? apt.documentIds,
        };
        updated = merged;
        return merged;
      });

      return next.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      });
    });

    return updated;
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(apt => apt.id !== id));
  };

  const value = useMemo(
    () => ({
      appointments,
      addAppointment,
      updateAppointment,
      deleteAppointment,
    }),
    [appointments],
  );

  return (
    <AppointmentsContext.Provider value={value}>
      {children}
    </AppointmentsContext.Provider>
  );
}

export function useAppointments() {
  const context = useContext(AppointmentsContext);
  if (!context) {
    throw new Error("useAppointments must be used within an AppointmentsProvider");
  }
  return context;
}