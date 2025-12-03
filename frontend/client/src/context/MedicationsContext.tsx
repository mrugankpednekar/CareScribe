import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import type { Medication } from "@/lib/types";

interface MedicationsContextValue {
  medications: Medication[];
  addMedication: (medication: Omit<Medication, "id">) => Medication;
  updateMedication: (id: string, updates: Partial<Medication>) => Medication | undefined;
  deleteMedication: (id: string) => void;
  toggleMedicationActive: (id: string) => void;
}

const MedicationsContext = createContext<MedicationsContextValue | undefined>(undefined);

const MEDICATIONS_KEY = "cs_medications";

function loadInitialMedications(): Medication[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEDICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Medication[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function MedicationsProvider({ children }: { children: ReactNode }) {
  const [medications, setMedications] = useState<Medication[]>(() => loadInitialMedications());

  useEffect(() => {
    try {
      window.localStorage.setItem(MEDICATIONS_KEY, JSON.stringify(medications));
    } catch {
      // ignore storage errors
    }
  }, [medications]);

  const addMedication = (medication: Omit<Medication, "id">): Medication => {
    const id = `med-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newMedication: Medication = {
      id,
      name: medication.name || "",
      dosage: medication.dosage || "",
      frequency: medication.frequency || "Once daily",
      active: medication.active ?? true,
      times: medication.times || [],
      startDate: medication.startDate || new Date().toISOString().split("T")[0],
      endDate: medication.endDate,
      prescribedBy: medication.prescribedBy,
      prescribedDate: medication.prescribedDate || new Date().toISOString(),
      appointmentId: medication.appointmentId,
      reason: medication.reason,
    };

    setMedications((prev) => [...prev, newMedication]);
    return newMedication;
  };

  const updateMedication = (id: string, updates: Partial<Medication>): Medication | undefined => {
    let updated: Medication | undefined;

    setMedications((prev) =>
      prev.map((med) => {
        if (med.id !== id) return med;
        updated = { ...med, ...updates };
        return updated;
      })
    );

    return updated;
  };

  const deleteMedication = (id: string) => {
    setMedications((prev) => prev.filter((med) => med.id !== id));
  };

  const toggleMedicationActive = (id: string) => {
    setMedications((prev) =>
      prev.map((med) => (med.id === id ? { ...med, active: !med.active } : med))
    );
  };

  const value = useMemo(
    () => ({
      medications,
      addMedication,
      updateMedication,
      deleteMedication,
      toggleMedicationActive,
    }),
    [medications]
  );

  return (
    <MedicationsContext.Provider value={value}>
      {children}
    </MedicationsContext.Provider>
  );
}

export function useMedications() {
  const context = useContext(MedicationsContext);
  if (!context) {
    throw new Error("useMedications must be used within a MedicationsProvider");
  }
  return context;
}

