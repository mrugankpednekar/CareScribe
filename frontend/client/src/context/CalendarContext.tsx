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
    skippedDates?: string[];
};

interface CalendarContextType {
    calendarTasks: CalendarTask[];
    todayTasks: Task[];
    customEvents: CustomEvent[];
    addEvent: (event: any) => void;
    updateEvent: (id: string, event: any) => void;
    deleteEvent: (id: string, type: EventType, deleteSeries?: boolean, date?: string) => void;
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

    // --- Backend Tasks State ---
    const [backendTasks, setBackendTasks] = useState<Task[]>([]);

    useEffect(() => {
        fetch("/api/tasks")
            .then(res => res.json())
            .then(data => setBackendTasks(data))
            .catch(err => console.error("Failed to fetch tasks:", err));
    }, []);

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
    const [completedTaskIds, setCompletedTaskIds] = useState<string[]>([]);

    // Clear local storage on mount to prevent stale data
    useEffect(() => {
        if (typeof window !== "undefined") {
            window.localStorage.removeItem("cs_custom_events");
            window.localStorage.removeItem("cs_completed_tasks");
        }
    }, []);

    // --- Helper: Date Comparison ---
    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    // --- Helper: Local Date String ---
    const toLocalDateString = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // --- 1. Generate Medication Tasks ---
    const generateMedicationTasks = useMemo(() => {
        const tasks: { id: string; date: Date; title: string; time?: string; originalId: string }[] = [];
        const now = new Date();
        const daysToGenerate = 180; // Generate for next 6 months

        medications.forEach((med) => {
            if (!med.active) return;

            const startDate = new Date(med.startDate || now);
            const endDate = med.endDate ? new Date(med.endDate) : null;

            for (let offset = 0; offset < daysToGenerate; offset++) {
                const taskDate = new Date();
                taskDate.setDate(now.getDate() - 30 + offset); // Start from 30 days ago

                const taskDateStr = toLocalDateString(taskDate);
                const startDateStr = toLocalDateString(startDate);

                if (taskDateStr < startDateStr) continue;
                if (endDate) {
                    const endDateStr = toLocalDateString(endDate);
                    if (taskDateStr > endDateStr) continue;
                }

                // Check skipped dates
                if (med.skippedDates && med.skippedDates.includes(taskDateStr)) continue;

                let shouldInclude = false;
                if (med.frequencyType === "daily") shouldInclude = true;
                else if (med.frequencyType === "weekly") {
                    if (med.selectedDays && med.selectedDays.length > 0) {
                        shouldInclude = med.selectedDays.includes(taskDate.getDay());
                    } else {
                        // Fallback if no days selected but weekly
                        shouldInclude = taskDate.getDay() === startDate.getDay();
                    }
                } else if (med.frequencyType === "once") {
                    shouldInclude = taskDateStr === startDateStr;
                } else {
                    // Default to daily if not specified
                    shouldInclude = true;
                }

                if (shouldInclude) {
                    if (med.times && med.times.length > 0) {
                        med.times.forEach((t) => {
                            tasks.push({
                                id: `med-${med.id}-${taskDate.getTime()}-${t}`,
                                date: new Date(taskDate),
                                title: `${med.name} ${med.dosage}`,
                                time: t,
                                originalId: med.id
                            });
                        });
                    } else {
                        tasks.push({
                            id: `med-${med.id}-${taskDate.getTime()}`,
                            date: new Date(taskDate),
                            title: `${med.name} ${med.dosage}`,
                            originalId: med.id
                        });
                    }
                }
            }
        });
        return tasks;
    }, [medications]);

    // --- 2. Generate Custom Activity Tasks ---
    const activityTasks = useMemo(() => {
        const events: CalendarTask[] = [];

        customEvents.forEach((ev) => {
            const startDate = new Date(ev.date);
            const parseLocal = (s: string) => {
                const [y, m, d] = s.split("-").map(Number);
                return new Date(y, m - 1, d);
            };
            // const startDate = parseLocal(ev.date);
            const endDate = ev.endDate ? parseLocal(ev.endDate) : null;

            if (!ev.frequencyType || ev.frequencyType === "once") {
                events.push({
                    id: `custom-${ev.id}`,
                    date: startDate,
                    title: ev.title,
                    type: ev.type as EventType,
                    time: ev.allDay ? undefined : ev.time,
                    originalId: ev.id
                });
                return;
            }

            const daysToGenerate = 60;
            const now = new Date();

            for (let offset = 0; offset < daysToGenerate; offset++) {
                const taskDate = new Date();
                taskDate.setDate(now.getDate() - 5 + offset);

                const taskDateStr = toLocalDateString(taskDate);
                const startDateStr = toLocalDateString(startDate);

                if (taskDateStr < startDateStr) continue;
                if (endDate) {
                    const endDateStr = toLocalDateString(endDate);
                    if (taskDateStr > endDateStr) continue;
                }

                // Check skipped dates
                if (ev.skippedDates && ev.skippedDates.includes(taskDateStr)) continue;

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
                        originalId: ev.id
                    });
                }
            }
        });
        return events;
    }, [customEvents]);

    // --- 3. Combine All Tasks for Calendar ---
    const calendarTasks: CalendarTask[] = useMemo(() => {
        // Convert backend tasks to CalendarTask format
        const dbTasks: CalendarTask[] = backendTasks.map(t => ({
            id: `task-${t.id}`,
            date: new Date(t.due),
            title: t.title,
            type: "other", // or map based on t.type
            time: undefined,
            originalId: t.id
        }));

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
                    originalId: apt.id
                };
            })
            .filter(Boolean) as CalendarTask[];

        const seenMedDays = new Set<string>();
        const medTasks = generateMedicationTasks
            .filter(t => {
                const key = `${t.originalId}-${t.date.toISOString().split("T")[0]}`;
                if (seenMedDays.has(key)) return false;
                seenMedDays.add(key);
                return true;
            })
            .map((t) => ({
                id: t.id,
                date: t.date,
                title: t.title,
                type: "medication" as EventType,
                time: t.time,
                originalId: t.originalId
            }));

        return [...aptTasks, ...medTasks, ...activityTasks, ...dbTasks].sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [appointments, generateMedicationTasks, activityTasks, backendTasks]);

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
                    originalId: apt.id
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
                originalId: task.originalId
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
                    completed: completedTaskIds.includes(t.id),
                    originalId: t.originalId
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
            const key = `notified-${nowTime}`;

            if (sessionStorage.getItem(key)) return;

            const notify = (title: string, body: string, id: string) => {
                if (notifications.some(n => n.id === id)) return;

                // Play sound
                try {
                    const audio = new Audio("/sounds/notification.mp3");
                    audio.play().catch(() => { });
                } catch { }

                setNotifications(prev => [
                    {
                        id,
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
                if (!task.time) return;

                // Parse task time on task date
                const [h, m] = task.time.split(":").map(Number);
                const taskTime = new Date(task.date);
                taskTime.setHours(h, m, 0, 0);

                // Check if we are within the minute of the task time
                // Since we align to :00 seconds, we can just check if minutes match and seconds are low
                const diff = Math.abs(nowTime - taskTime.getTime());
                if (diff < 1000) { // Within 1 second tolerance
                    notify("Medication Reminder", `Time to take: ${task.title}`, task.id);
                }
            });

            // Activities: 30m before, At time
            activityTasks.forEach(task => {
                if (!task.time) return;

                const [h, m] = task.time.split(":").map(Number);
                const taskTime = new Date(task.date);
                taskTime.setHours(h, m, 0, 0);

                const diff = taskTime.getTime() - nowTime;

                // 30 mins before (exact minute match)
                // 30 * 60 * 1000 = 1800000
                if (Math.abs(diff - 1800000) < 1000) {
                    notify("Upcoming Activity", `${task.title} in 30 minutes`, `${task.id}-30m`);
                }
                // At time
                if (Math.abs(diff) < 1000) {
                    notify("Activity Reminder", `Starting now: ${task.title}`, `${task.id}-now`);
                }
            });

            // Appointments/Labs: 1d before, 1h before, At time
            appointments.forEach(apt => {
                if (!apt.date || apt.status === "completed" || apt.status === "cancelled") return;
                const aptTime = new Date(apt.date).getTime();
                const diff = aptTime - nowTime;

                // 24h before
                if (Math.abs(diff - 86400000) < 1000) {
                    notify("Upcoming Appointment", `${apt.doctor || "Appointment"} tomorrow`, `${apt.id}-24h`);
                }
                // 1h before
                if (Math.abs(diff - 3600000) < 1000) {
                    notify("Upcoming Appointment", `${apt.doctor || "Appointment"} in 1 hour`, `${apt.id}-1h`);
                }
                // At time
                if (Math.abs(diff) < 1000) {
                    notify("Appointment Reminder", `${apt.doctor || "Appointment"} starting now`, `${apt.id}-now`);
                }
            });
        };

        // Align to next minute start
        const now = new Date();
        const msToNextMinute = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        let interval: NodeJS.Timeout;
        const timeout = setTimeout(() => {
            checkNotifications(); // Run immediately at start of minute
            interval = setInterval(checkNotifications, 60000); // Then every 60s
        }, msToNextMinute);

        return () => {
            clearTimeout(timeout);
            clearInterval(interval);
        };
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
        }
    };

    const deleteEvent = (id: string, type: EventType, deleteSeries: boolean = true, date?: string) => {
        if (type === "appointment" || type === "lab") {
            deleteAppointment(id);
        } else if (type === "medication") {
            const med = medications.find(m => m.id === id);
            if (med) {
                if (deleteSeries) {
                    const startDate = new Date(med.startDate || new Date());
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    startDate.setHours(0, 0, 0, 0);

                    // If it started today or in the future, just delete it entirely
                    if (startDate >= today) {
                        deleteMedication(id);
                    } else {
                        // Otherwise stop future occurrences by setting endDate to yesterday
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        updateMedication(id, { endDate: yesterday.toISOString().split("T")[0] });
                    }
                } else if (date) {
                    // Just this instance
                    const skipped = med.skippedDates || [];
                    updateMedication(id, { skippedDates: [...skipped, date] });
                }
            }
        } else if (type === "activity") {
            if (deleteSeries) {
                setCustomEvents(prev => prev.filter(e => e.id !== id));
            } else if (date) {
                setCustomEvents(prev => prev.map(e => {
                    if (e.id === id) {
                        const skipped = e.skippedDates || [];
                        return { ...e, skippedDates: [...skipped, date] };
                    }
                    return e;
                }));
            }
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
