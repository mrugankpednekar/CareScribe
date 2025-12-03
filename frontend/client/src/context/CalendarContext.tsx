import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import { useAppointments } from "./AppointmentsContext";
import { useMedications } from "./MedicationsContext";
import type { CalendarTask, EventType, Appointment, Medication } from "@/lib/types";

// Custom Event Type (Activity)
export type CustomEvent = {
    id: string;
    title: string;
    description?: string;
    date: string;
    time?: string;
    allDay?: boolean;
    type: "activity";
    completed?: boolean;
    frequencyType?: "daily" | "weekly" | "once";
    selectedDays?: number[];
    endDate?: string;
};

interface CalendarContextType {
    calendarTasks: CalendarTask[];
    todayTasks: Task[];
    customEvents: CustomEvent[];
    addEvent: (event: any) => void;
    updateEvent: (id: string, event: any) => void;
    deleteEvent: (id: string, type: EventType) => void;
    toggleTaskCompletion: (id: string, type: EventType, completed: boolean) => void;
    notifications: AppNotification[];
    removeNotification: (id: string) => void;
    clearNotifications: () => void;
}

interface Task {
    id: string;
    title: string;
    subtitle?: string;
    due: string;
    type: EventType;
    completed: boolean;
}

export type AppNotification = {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
};

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

export function CalendarProvider({ children }: { children: ReactNode }) {
    const { appointments, addAppointment, updateAppointment, deleteAppointment } = useAppointments();
    const { medications, addMedication, updateMedication, deleteMedication } = useMedications();

    // --- Custom Events (Activities) State ---
    const [customEvents, setCustomEvents] = useState<CustomEvent[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem("cs_custom_events");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem("cs_custom_events", JSON.stringify(customEvents));
        } catch {
            // ignore
        }
    }, [customEvents]);

    // --- Completion State for Generated Tasks ---
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem("cs_completed_tasks");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem("cs_completed_tasks", JSON.stringify(completedTaskIds));
        } catch {
            // ignore
        }
    }, [completedTaskIds]);

    // --- Helper: Date Comparison ---
    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    // --- 1. Generate Medication Tasks (Recurring) ---
    const generateMedicationTasks = useMemo(() => {
        const tasks: Array<{
            id: string;
            date: Date;
            title: string;
            type: "medication";
            time?: string;
            originalId: string;
        }> = [];

        const now = new Date();
        const daysToGenerate = 60;

        medications.forEach((med) => {
            if (!med.active) return;

            // Parse dates safely
            // We assume stored dates are YYYY-MM-DD or ISO. 
            // To prevent timezone shifts, we should treat YYYY-MM-DD as local date.
            // But new Date("YYYY-MM-DD") is UTC. new Date("YYYY-MM-DDT00:00") is local.
            // Let's ensure we work with local time for dates.

            const parseLocal = (dateStr: string) => {
                if (!dateStr) return new Date();
                // If it's just YYYY-MM-DD, append T00:00 to force local
                if (dateStr.length === 10) return new Date(dateStr + "T00:00:00");
                return new Date(dateStr);
            };

            const startDate = parseLocal(med.startDate || "");
            const endDate = med.endDate ? parseLocal(med.endDate) : null;

            const freq = med.frequency || "";
            const isDaily = med.frequencyType === "daily" || (!med.frequencyType && freq.toLowerCase().includes("daily"));
            const isWeekly = med.frequencyType === "weekly";
            const isOnce = med.frequencyType === "once";

            if (isOnce) {
                // Single occurrence
                if (med.times && med.times.length > 0) {
                    med.times.forEach(time => {
                        tasks.push({
                            id: `med-${med.id}-${startDate.toISOString().split("T")[0]}-${time}`,
                            date: startDate,
                            title: `${med.name} (${med.dosage})`,
                            type: "medication",
                            time,
                            originalId: med.id
                        });
                    });
                } else {
                    tasks.push({
                        id: `med-${med.id}-${startDate.toISOString().split("T")[0]}`,
                        date: startDate,
                        title: `${med.name} (${med.dosage})`,
                        type: "medication",
                        time: undefined,
                        originalId: med.id
                    });
                }
                return;
            }

            // Recurring
            for (let offset = 0; offset < daysToGenerate; offset++) {
                const taskDate = new Date();
                taskDate.setDate(now.getDate() - 5 + offset);

                const taskDateStr = taskDate.toISOString().split("T")[0];
                const startDateStr = startDate.toISOString().split("T")[0];

                if (taskDateStr < startDateStr) continue;
                if (endDate) {
                    const endDateStr = endDate.toISOString().split("T")[0];
                    if (taskDateStr > endDateStr) continue;
                }

                let shouldInclude = false;
                if (isDaily) shouldInclude = true;
                else if (isWeekly) {
                    if (med.selectedDays && med.selectedDays.length > 0) {
                        shouldInclude = med.selectedDays.includes(taskDate.getDay());
                    } else {
                        shouldInclude = taskDate.getDay() === startDate.getDay();
                    }
                } else {
                    shouldInclude = true; // Default
                }

                if (shouldInclude) {
                    if (med.times && med.times.length > 0) {
                        med.times.forEach((time) => {
                            tasks.push({
                                id: `med-${med.id}-${taskDateStr}-${time}`,
                                date: new Date(taskDate),
                                title: `${med.name} (${med.dosage})`,
                                type: "medication",
                                time,
                                originalId: med.id
                            });
                        });
                    } else {
                        tasks.push({
                            id: `med-${med.id}-${taskDateStr}`,
                            date: new Date(taskDate),
                            title: `${med.name} (${med.dosage})`,
                            type: "medication",
                            time: undefined,
                            originalId: med.id
                        });
                    }
                }
            }
        });

        return tasks;
    }, [medications]);

    // --- 2. Generate Activity Tasks (Recurring) ---
    const activityTasks = useMemo(() => {
        return customEvents.flatMap((ev) => {
            const events: CalendarTask[] = [];

            const parseLocal = (dateStr: string) => {
                if (!dateStr) return new Date();
                if (dateStr.length === 10) return new Date(dateStr + "T00:00:00");
                return new Date(dateStr);
            };

            const startDate = parseLocal(ev.date);
            const endDate = ev.endDate ? parseLocal(ev.endDate) : null;

            if (!ev.frequencyType || ev.frequencyType === "once") {
                return [{
                    id: `custom-${ev.id}`,
                    date: startDate,
                    title: ev.title,
                    type: ev.type as EventType,
                    time: ev.allDay ? undefined : ev.time,
                }];
            }

            const daysToGenerate = 60;
            const now = new Date();

            for (let offset = 0; offset < daysToGenerate; offset++) {
                const taskDate = new Date();
                taskDate.setDate(now.getDate() - 5 + offset);

                const taskDateStr = taskDate.toISOString().split("T")[0];
                const startDateStr = startDate.toISOString().split("T")[0];

                if (taskDateStr < startDateStr) continue;
                if (endDate) {
                    const endDateStr = endDate.toISOString().split("T")[0];
                    if (taskDateStr > endDateStr) continue;
                }

                let shouldInclude = false;
                if (ev.frequencyType === "daily") shouldInclude = true;
                else if (ev.frequencyType === "weekly") {
                    if (ev.selectedDays && ev.selectedDays.length > 0) {
                        shouldInclude = ev.selectedDays.includes(taskDate.getDay());
                    } else {
                        shouldInclude = taskDate.getDay() === startDate.getDay();
                    }
                }

                if (shouldInclude) {
                    events.push({
                        id: `custom-${ev.id}`,
                        date: new Date(taskDate),
                        title: ev.title,
                        type: ev.type as EventType,
                        time: ev.allDay ? undefined : ev.time,
                    });
                }
            }
            return events;
        });
    }, [customEvents]);

    // --- 3. Combine All Tasks for Calendar ---
    const calendarTasks: CalendarTask[] = useMemo(() => {
        const aptTasks = appointments
            .filter(apt => apt.status !== 'cancelled') // Filter cancelled/deleted
            .map((apt) => {
                if (!apt.date) return null;
                const date = new Date(apt.date);
                const isLab = apt.type === "lab";
                return {
                    id: `${isLab ? "lab" : "apt"}-${apt.id}`,
                    date,
                    title: isLab ? apt.labType || "Lab" : apt.doctor || "Appointment",
                    type: (isLab ? "lab" : "appointment") as EventType,
                    time: date.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                    }),
                };
            })
            .filter(Boolean) as CalendarTask[];

        const medTasks = generateMedicationTasks.map((t) => ({
            id: t.id,
            date: t.date,
            title: t.title,
            type: "medication" as EventType,
            time: t.time,
        }));

        return [...aptTasks, ...medTasks, ...activityTasks];
    }, [appointments, generateMedicationTasks, activityTasks]);

    // --- 4. Today's Checklist ---
    const todayTasks = useMemo(() => {
        const today = new Date();
        const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        const apts = appointments
            .filter((apt) => apt.date && isSameDay(new Date(apt.date), todayDateOnly) && apt.status !== 'cancelled')
            .map((apt) => {
                const d = new Date(apt.date!);
                const isLab = apt.type === "lab";
                return {
                    id: `apt-${apt.id}`,
                    title: isLab ? apt.labType || "Lab Work" : apt.doctor || "Appointment",
                    subtitle: isLab ? "Lab" : apt.specialty || "Visit",
                    due: d.toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                    }),
                    type: (isLab ? "lab" : "appointment") as EventType,
                    completed: apt.status === "completed",
                };
            });

        const meds = generateMedicationTasks
            .filter((task) => isSameDay(task.date, todayDateOnly))
            .map((task) => ({
                id: task.id,
                title: task.title,
                subtitle: "Medication",
                due: task.time || "Any time",
                type: "medication" as EventType,
                completed: completedTaskIds.includes(task.id),
            }));

        const todaysActs = activityTasks
            .filter(t => isSameDay(t.date, todayDateOnly))
            .map(t => {
                return {
                    id: t.id,
                    title: t.title,
                    subtitle: "Activity",
                    due: t.time || "All day",
                    type: "activity" as EventType,
                    completed: completedTaskIds.includes(t.id)
                };
            });

        return [...apts, ...meds, ...todaysActs];
    }, [appointments, generateMedicationTasks, activityTasks, customEvents, completedTaskIds]);


    // --- 5. Notifications ---
    const [notifications, setNotifications] = useState<AppNotification[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem("cs_notifications");
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem("cs_notifications", JSON.stringify(notifications));
        } catch {
            // ignore
        }
    }, [notifications]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    useEffect(() => {
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") Notification.requestPermission();

        const checkNotifications = () => {
            const now = new Date();
            const nowTime = now.getTime();

            const notify = (title: string, body: string, id: string) => {
                const key = `notified-${id}-${now.toDateString()}-${now.getHours()}-${now.getMinutes()}`;
                if (sessionStorage.getItem(key)) return;

                // Play sound
                try {
                    const audio = new Audio("/sounds/notification.mp3");
                    audio.play().catch((e) => console.error("Audio play failed", e));
                } catch (e) {
                    console.error("Audio creation failed", e);
                }

                // Browser notification
                new Notification(title, { body, icon: "/favicon.ico" });

                // Add to in-app notifications
                setNotifications(prev => [
                    {
                        id: `notif-${Date.now()}-${Math.random()}`,
                        title,
                        message: body,
                        timestamp: new Date().toISOString(),
                        read: false
                    },
                    ...prev
                ]);

                sessionStorage.setItem(key, "true");
            };

            // Meds: At time
            generateMedicationTasks.forEach(task => {
                // Only check today's meds to save perf? No, need to check all generated.
                // generateMedicationTasks is already limited to +/- 60 days.
                if (!task.time) return;

                // Parse task time on task date
                const [h, m] = task.time.split(":").map(Number);
                const taskTime = new Date(task.date);
                taskTime.setHours(h, m, 0, 0);

                if (Math.abs(nowTime - taskTime.getTime()) < 60000) {
                    notify("Medication Reminder", `Time to take: ${task.title}`, task.id);
                }
            });

            // Activities: 30m before, At time
            activityTasks.forEach(task => {
                if (!task.time) return; // All day events? Maybe notify at 9am? Skipping for now.

                const [h, m] = task.time.split(":").map(Number);
                const taskTime = new Date(task.date);
                taskTime.setHours(h, m, 0, 0);

                const diff = taskTime.getTime() - nowTime;

                // 30 mins before (29-31 mins)
                if (diff > 29 * 60000 && diff < 31 * 60000) {
                    notify("Upcoming Activity", `${task.title} in 30 minutes`, `${task.id}-30m`);
                }
                // At time
                if (Math.abs(diff) < 60000) {
                    notify("Activity Reminder", `Starting now: ${task.title}`, `${task.id}-now`);
                }
            });

            // Appointments/Labs: 1d before, 1h before, At time
            appointments.forEach(apt => {
                if (!apt.date || apt.status === "completed" || apt.status === "cancelled") return;
                const aptTime = new Date(apt.date).getTime();
                const diff = aptTime - nowTime;

                // 24h before
                if (diff > 23.9 * 3600000 && diff < 24.1 * 3600000) {
                    notify("Upcoming Appointment", `${apt.doctor || "Appointment"} tomorrow`, `${apt.id}-24h`);
                }
                // 1h before
                if (diff > 59 * 60000 && diff < 61 * 60000) {
                    notify("Upcoming Appointment", `${apt.doctor || "Appointment"} in 1 hour`, `${apt.id}-1h`);
                }
                // At time
                if (Math.abs(diff) < 60000) {
                    notify("Appointment Reminder", `${apt.doctor || "Appointment"} starting now`, `${apt.id}-now`);
                }
            });
        };

        const interval = setInterval(checkNotifications, 60000);
        return () => clearInterval(interval);
    }, [generateMedicationTasks, activityTasks, appointments]);


    // --- CRUD Wrappers ---
    const addEvent = (event: any) => {
        if (event.type === "appointment" || event.type === "lab") {
            addAppointment(event);
        } else if (event.type === "medication") {
            addMedication(event);
        } else if (event.type === "activity") {
            setCustomEvents(prev => [...prev, { id: `ce-${Date.now()}`, ...event }]);
        }
    };

    const updateEvent = (id: string, event: any) => {
        if (event.type === "appointment" || event.type === "lab") {
            updateAppointment(id, event);
        } else if (event.type === "medication") {
            updateMedication(id, event);
        } else if (event.type === "activity") {
            setCustomEvents(prev => prev.map(e => e.id === id ? { ...e, ...event } : e));
        }
    };



    const toggleTaskCompletion = (id: string, type: EventType, completed: boolean) => {
        if (type === "appointment" || type === "lab") {
            const aptId = id.replace(/^(apt-|lab-)/, "");
            updateAppointment(aptId, { status: completed ? "completed" : "upcoming" });
        } else {
            // For meds and activities, toggle in local state
            setCompletedTaskIds(prev => {
                if (completed) return [...prev, id];
                return prev.filter(tid => tid !== id);
            });

            // Also update the original custom event if it's an activity, for persistence across reloads if needed?
            // Actually, for recurring activities, we might want to track instance completion.
            // Using completedTaskIds (which includes date in ID) is better for recurring instances.
        }
    };

    const deleteEvent = (id: string, type: EventType) => {
        if (type === "appointment" || type === "lab") {
            deleteAppointment(id);
        } else if (type === "medication") {
            // For meds, we usually delete the whole prescription. 
            // User asked to "only delete all future events... dont delete past".
            // We can achieve this by setting endDate to yesterday.
            const med = medications.find(m => m.id === id);
            if (med) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                updateMedication(id, { endDate: yesterday.toISOString().split("T")[0] });
            }
        } else if (type === "activity") {
            setCustomEvents(prev => prev.filter(e => e.id !== id));
        }
    };

    return (
        <CalendarContext.Provider value={{
            calendarTasks,
            todayTasks,
            customEvents,
            notifications,
            addEvent,
            updateEvent,
            deleteEvent,
            toggleTaskCompletion,
            removeNotification,
            clearNotifications
        }}>
            {children}
        </CalendarContext.Provider>
    );
}

export function useCalendar() {
    const context = useContext(CalendarContext);
    if (context === undefined) {
        throw new Error("useCalendar must be used within a CalendarProvider");
    }
    return context;
}
