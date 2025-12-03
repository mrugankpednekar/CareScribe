import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Layout } from "@/components/layout/Layout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { Mic, Plus, ChevronRight, Calendar as CalendarIcon, FlaskConical, Activity, Pill, Bell, X } from "lucide-react";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { Calendar } from "@/components/dashboard/Calendar";
import { DatePicker, DateTimePicker } from "@/components/ui/date-picker";
import { useCalendar } from "@/context/CalendarContext";
import type { CalendarTask, EventType, Appointment } from "@/lib/types";
import { useUserProfile } from "@/context/UserProfileContext";
import { useAppointments } from "@/context/AppointmentsContext"; // Still needed for finding appointments by ID in handleEventClick?
import { useMedications } from "@/context/MedicationsContext"; // Still needed for finding meds by ID?

// Images
const noTasksIllustration = new URL("@assets/notasks.png", import.meta.url).href;
const recordingIllustration = new URL("@assets/image_1764639118210.png", import.meta.url).href;
const tasksIllustration = new URL("@assets/image_1764639012729.png", import.meta.url).href;
const medicationsIllustration = new URL("@assets/image_1764639028767.png", import.meta.url).href;
const historyIllustration = new URL("@assets/image_1764639172491.png", import.meta.url).href;
const manageMedicationIllustration = new URL("@assets/medications.png", import.meta.url).href;

export default function Dashboard() {
  const {
    calendarTasks,
    todayTasks,
    customEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    toggleTaskCompletion,
    notifications,
    removeNotification
  } = useCalendar();

  // We still need direct access to appointments/medications for populating the edit form
  // because calendarTasks are simplified objects.
  const { appointments } = useAppointments();
  const { medications } = useMedications();
  const providers = Array.from(new Set(appointments.map(a => a.doctor).filter(Boolean)));

  // Greeting
  const { profile } = useUserProfile();

  const today = new Date();
  const hour = today.getHours();
  const greeting =
    hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  // --- Event modal state ---
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventType, setEventType] = useState<EventType>("appointment");
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [selectedInstanceDate, setSelectedInstanceDate] = useState<string | null>(null);

  // Appointment / lab form state (mirrors History.tsx)
  const [provider, setProvider] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [category, setCategory] = useState(""); // specialty or lab type filter
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [labType, setLabType] = useState("");
  const [attachedProviderId, setAttachedProviderId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Activity fields
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);

  // Recurrence fields
  const [frequencyType, setFrequencyType] = useState<"daily" | "weekly" | "once">("once");
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Medication form (aligned with Profile page)
  const [medForm, setMedForm] = useState({
    name: "",
    dosage: "",
    frequency: "Once daily",
    times: [] as string[],
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: "",
    prescribedBy: "",
    reason: "",
    frequencyType: "once" as "daily" | "weekly" | "once",
    selectedDays: [] as number[],
  });
  const [newMedTime, setNewMedTime] = useState("");

  const handleAddMedTime = () => {
    if (newMedTime && !medForm.times.includes(newMedTime)) {
      setMedForm((prev) => ({
        ...prev,
        times: [...prev.times, newMedTime].sort(),
      }));
      setNewMedTime("");
    }
  };

  const handleRemoveMedTime = (time: string) => {
    setMedForm((prev) => ({
      ...prev,
      times: prev.times.filter((t) => t !== time),
    }));
  };

  // 🔥 LISTEN FOR CALENDAR "+" CLICK
  useEffect(() => {
    const handler = () => {
      resetEventForm();
      setShowAddEventModal(true);
    };

    window.addEventListener("calendar-add-event", handler);
    return () => window.removeEventListener("calendar-add-event", handler);
  }, []);

  const handleEventClick = (task: CalendarTask) => {
    // Determine type and populate form
    resetEventForm();
    setEventType(task.type);
    setIsEditing(true);
    setSelectedInstanceDate(task.date.toISOString().split("T")[0]);

    if (task.type === "appointment" || task.type === "lab") {
      const id = task.originalId || task.id.replace(/^(apt-|lab-)/, "");
      const apt = appointments.find(a => a.id === id);
      if (apt) {
        setEditingEventId(apt.id); // Use the REAL appointment ID
        setDateTime(apt.date ? new Date(apt.date).toISOString().slice(0, 16) : "");
        if (task.type === "appointment") {
          setProvider(apt.doctor);
          setCategory(apt.specialty || "");
          setReason(apt.reason || "");
          setNotes(apt.notes || "");
        } else {
          setLabType(apt.labType || "");
          setAttachedProviderId(apt.attachedProviderId || "");
          setReason(apt.reason || "");
          setNotes(apt.notes || "");
        }
      }
    } else if (task.type === "medication") {
      // Use originalId if available, otherwise fallback to parsing
      let medId = task.originalId;
      if (!medId) {
        const parts = task.id.split("-");
        // ID format: med-{id}-{date}-{time} OR med-{id}-{date}
        // If ID has hyphens (UUID), this split is tricky.
        // But now we have originalId, so we should rely on that.
        // Fallback: assume parts[1] is ID if simple numeric, otherwise try to reconstruct?
        // Actually, if originalId is missing, we might be in trouble for UUIDs.
        // But CalendarContext now provides it.
        medId = parts[1];
      }

      const med = medications.find(m => m.id === medId);
      if (med) {
        setMedForm({
          name: med.name,
          dosage: med.dosage,
          frequency: med.frequency,
          times: med.times || [],
          startDate: med.startDate || "",
          endDate: med.endDate || "",
          prescribedBy: med.prescribedBy || "",
          reason: med.reason || "",
          frequencyType: med.frequencyType || "once",
          selectedDays: med.selectedDays || [],
        });
        setEditingEventId(med.id); // Use the REAL med ID for editing
      }
    } else if (task.type === "activity") {
      // custom-ce-123
      const id = task.originalId || task.id.replace(/^custom-/, "");
      const evt = customEvents.find(e => e.id === id);
      if (evt) {
        setEventTitle(evt.title);
        setEventDescription(evt.description || "");
        setEventDate(evt.date);
        setEventTime(evt.time || "");
        setIsAllDay(evt.allDay || false);
        setFrequencyType(evt.frequencyType || "once");
        setSelectedDays(evt.selectedDays || []);
        setRecurrenceEndDate(evt.endDate || "");
        setEditingEventId(evt.id);
      }
    }

    setShowAddEventModal(true);
  };

  const completedCount = todayTasks.filter((t) => t.completed).length;
  const totalCount = todayTasks.length;



  // Submit event (appointments / labs / activity / medication)
  const handleAddEvent = () => {
    setFormError(null);

    if (eventType === "appointment" || eventType === "lab") {
      // --- same logic as History.handleCreateAppointment ---
      if (!dateTime) {
        setFormError("Please select a date and time.");
        return;
      }

      if (eventType === "appointment" && !provider.trim()) {
        setFormError("Please enter a provider name.");
        return;
      }

      if (eventType === "lab" && !labType.trim()) {
        setFormError("Please enter the type of lab work.");
        return;
      }

      const selectedDate = new Date(dateTime);
      const now = new Date();

      const status: Appointment["status"] =
        selectedDate.getTime() > now.getTime() ? "upcoming" : "completed";

      const appointmentData = {
        type: eventType,
        date: dateTime, // Use the string directly to preserve local time
        doctor:
          eventType === "appointment"
            ? provider.trim()
            : attachedProviderId
              ? appointments.find((a) => a.id === attachedProviderId)?.doctor ||
              "Lab"
              : "Lab",
        specialty:
          eventType === "appointment"
            ? category.trim() || "General"
            : undefined,
        reason: reason.trim(),
        notes: notes.trim() || "",
        status,
        diagnosis: [],
        instructions: [],
        medications: [],
        labType: eventType === "lab" ? labType.trim() : undefined,
        attachedProviderId:
          eventType === "lab" ? attachedProviderId || undefined : undefined,
        transcriptIds: [],
        documentIds: [],
      };

      if (isEditing && editingEventId) {
        updateEvent(editingEventId, appointmentData);
      } else {
        addEvent(appointmentData);
      }

    } else if (eventType === "medication") {
      if (!medForm.name.trim() || !medForm.dosage.trim()) {
        setFormError("Enter medication name and dosage.");
        return;
      }

      const medData = {
        ...medForm,
        type: "medication",
        active: true,
        times: medForm.times,
        endDate: medForm.endDate || undefined,
        prescribedDate: new Date().toISOString(),
        frequencyType: medForm.frequencyType,
        selectedDays: medForm.selectedDays,
      };

      if (isEditing && editingEventId) {
        updateEvent(editingEventId, medData);
      } else {
        addEvent(medData);
      }

    } else if (eventType === "activity") {
      if (!eventTitle.trim()) {
        setFormError("Please enter a title for the activity.");
        return;
      }
      if (!eventDate) {
        setFormError("Please select a date for the activity.");
        return;
      }

      const activityData = {
        title: eventTitle.trim(),
        description: eventDescription.trim(),
        date: eventDate,
        time: isAllDay ? undefined : eventTime,
        allDay: isAllDay,
        type: "activity" as const,
        completed: false,
        frequencyType,
        selectedDays,
        endDate: recurrenceEndDate || undefined,
      };

      if (isEditing && editingEventId) {
        updateEvent(editingEventId, activityData);
      } else {
        addEvent(activityData);
      }
    }

    resetEventForm();
    setShowAddEventModal(false);
  };

  // Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState<"single" | "recurring">("single");

  const handleDeleteEvent = () => {
    if (!editingEventId) return;

    // Check if recurring
    let isRecurring = false;
    if (eventType === "medication") {
      isRecurring = medForm.frequencyType !== "once";
    } else if (eventType === "activity") {
      isRecurring = frequencyType !== "once";
    }

    setDeleteModalType(isRecurring ? "recurring" : "single");
    setShowDeleteModal(true);
  };

  const confirmDelete = (deleteSeries: boolean) => {
    if (!editingEventId) return;

    if (deleteModalType === "recurring") {
      deleteEvent(editingEventId, eventType, deleteSeries, !deleteSeries ? selectedInstanceDate || undefined : undefined);
    } else {
      deleteEvent(editingEventId, eventType);
    }

    setShowDeleteModal(false);
    resetEventForm();
    setShowAddEventModal(false);
  };

  const resetEventForm = () => {
    setEventType("appointment");
    setIsEditing(false);
    setEditingEventId(null);
    setSelectedInstanceDate(null);
    setFormError(null);
    // ... reset other fields
    setProvider("");
    setCategory("");
    setReason("");
    setNotes("");
    setDateTime("");
    setLabType("");
    setAttachedProviderId("");

    setMedForm({
      name: "",
      dosage: "",
      frequency: "Once daily",
      times: [],
      startDate: "",
      endDate: "",
      prescribedBy: "",
      reason: "",
      frequencyType: "once",
      selectedDays: [],
    });
    setNewMedTime("");
  };

  // Sort visits for "Recent Visits" and lab attach dropdown
  const sortedAppointments = [...appointments].sort(
    (a, b) =>
      new Date(b.date ?? "").getTime() - new Date(a.date ?? "").getTime(),
  );

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-10 pb-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-2">
          <div>
            <p className="text-sm text-muted-foreground">{greeting}</p>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Hi, {profile.firstName || "there"}
            </h1>
          </div>
          <div className="flex items-center gap-4 relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-muted transition-colors"
            >
              <Bell className="w-5 h-5 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-background" />
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border flex justify-between items-center bg-muted/30">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <span className="text-xs text-muted-foreground">{notifications.length} new</span>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground text-sm">
                      No new notifications
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {notifications.map((notif) => (
                        <div key={notif.id} className="p-3 hover:bg-muted/50 transition-colors relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notif.id);
                            }}
                            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <p className="font-medium text-sm text-foreground pr-4">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground mt-1.5 opacity-70">
                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Record Button */}
        <Link href="/record">
          <a className="block group mb-12">
            <div className="bg-primary text-primary-foreground rounded-2xl p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">
                  Record an appointment
                </h2>
                <p className="text-sm opacity-90">
                  Capture every detail. We'll generate complete transcripts of your visits to keep a thorough record and personalize your experience.
                </p>
              </div>
              <div className="w-14 h-14 bg-primary-foreground/10 rounded-full flex justify-center items-center">
                <Mic className="w-6 h-6" />
              </div>
            </div>
          </a>
        </Link>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
          {/* Calendar */}
          <div className="lg:col-span-2 relative">
            <Calendar tasks={calendarTasks} onEventClick={handleEventClick} />
          </div>

          {/* Checklist + meds CTA */}
          <div className="flex flex-col gap-2">
            <div>
              <div className="flex justify-between mb-3">
                <h2 className="text-lg font-bold">Today's Checklist</h2>
                {todayTasks.length > 0 && (
                  <button
                    onClick={() => setShowAllTasks((prev) => !prev)}
                    className="text-xs text-primary"
                  >
                    {showAllTasks ? "Show Less" : "Show All"}
                  </button>
                )}
              </div>

              {/* Progress */}
              <div className="mb-4">
              </div>

              {todayTasks.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <img src={noTasksIllustration} className="w-80 mb-0" />
                  <p className="text-sm text-muted-foreground">
                    You're all caught up!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(showAllTasks ? todayTasks : todayTasks.slice(0, 4)).map(
                    (task) => (
                      <div
                        key={task.id}
                        onClick={() => toggleTaskCompletion(task.id, task.type, !task.completed)}
                        className="cursor-pointer"
                      >
                        <TaskCard task={task} />
                      </div>
                    ),
                  )}
                </div>
              )}
            </div>

            {/* Medication Card */}
            <div className="bg-card border p-6 rounded-lg text-center">
              <img
                src={manageMedicationIllustration}
                className="w-full h-30 object-contain mb-4"
              />
              <h3 className="font-bold text-lg">Stay on top of medications</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Log your prescriptions now. We'll ensure you never miss a dose by providing reliable reminders.
              </p>
              <Link href="/profile">
                <a className="px-5 py-2.5 bg-primary text-white rounded-lg">
                  Manage Medications
                </a>
              </Link>
            </div>
          </div>
        </div>

        {/* Recent Visits */}
        <div className="mb-12">
          <div className="flex justify-between mb-6">
            <h2 className="text-2xl font-bold">Recent Activity</h2>
            <Link href="/history">
              <a className="flex items-center text-primary text-sm">
                All <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedAppointments.slice(0, 4).map((apt) => (
              <AppointmentCard key={apt.id} appointment={apt} compact />
            ))}
          </div>


        </div>

        {/* Features */}
        <section className="pt-12 border-t">
          <h2 className="text-2xl font-bold mb-8">What CareScribe Does</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                img: recordingIllustration,
                title: "Capture every detail",
                desc: "Automatically record appointments and integrate all your documents to unlock valuable intelligence through AI summaries and insights.",
              },
              {
                img: tasksIllustration,
                title: "Know what's next",
                desc: "See the roadmap to your health. We clearly organize all future visits, labs, medications, and lifestyle data so you always know your next step.",
              },
              {
                img: medicationsIllustration,
                title: "Stay on top of medications",
                desc: "Get automatic dose reminders and access a full history, including who prescribed it and the original purpose, so you always have the necessary context.",
              },
              {
                img: historyIllustration,
                title: "Keep everything in one place",
                desc: "All your medical records, documents, and healthcare information—fully organized and in one location.",
              },
            ].map((feature, i) => (
              <div key={i} className="bg-card border p-8 rounded-lg">
                <div className="w-full h-56 flex items-center justify-center mb-6">
                  <img
                    src={feature.img}
                    className="w-full h-full object-contain"
                  />
                </div>
                <h3 className="font-bold text-lg">{feature.title}</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Add Event Modal */}
        {showAddEventModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-card border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6">
              <div className="flex justify-between mb-6">
                <h2 className="text-xl font-bold">Add New Event</h2>
                <button
                  onClick={() => {
                    setShowAddEventModal(false);
                    resetEventForm();
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Event type selection */}
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  onClick={() => {
                    setEventType("appointment");
                    setFormError(null);
                  }}
                  className={`px-4 py-3 border rounded-lg flex flex-col items-center ${eventType === "appointment"
                    ? "bg-primary/10 text-primary"
                    : ""
                    }`}
                >
                  <CalendarIcon className="w-5 h-5" /> Appointment
                </button>
                <button
                  onClick={() => {
                    setEventType("lab");
                    setFormError(null);
                  }}
                  className={`px-4 py-3 border rounded-lg flex flex-col items-center ${eventType === "lab"
                    ? "bg-blue-500/10 text-blue-600"
                    : ""
                    }`}
                >
                  <FlaskConical className="w-5 h-5" /> Lab Work
                </button>
                <button
                  onClick={() => {
                    setEventType("activity");
                    setFormError(null);
                  }}
                  className={`px-4 py-3 border rounded-lg flex flex-col items-center ${eventType === "activity"
                    ? "bg-green-500/10 text-green-600"
                    : ""
                    }`}
                >
                  <Activity className="w-5 h-5" /> Activity
                </button>
                <button
                  onClick={() => {
                    setEventType("medication");
                    setFormError(null);
                  }}
                  className={`px-4 py-3 border rounded-lg flex flex-col items-center ${eventType === "medication"
                    ? "bg-primary/10 text-primary"
                    : ""
                    }`}
                >
                  <Pill className="w-5 h-5" /> Medication
                </button>
              </div>

              {/* Form */}
              <div className="space-y-4">
                {/* Appointment form (same fields as History) */}
                {eventType === "appointment" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Provider or clinic name
                      </label>
                      <Input
                        placeholder="e.g., Dr. Patel, City Health Clinic"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Specialty (optional)
                      </label>
                      <Input
                        placeholder="e.g., Cardiology, Primary care"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Date and time of visit
                      </label>
                      <DateTimePicker
                        date={dateTime ? new Date(dateTime) : undefined}
                        setDate={(date) => setDateTime(date ? date.toISOString() : "")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Reason for visit
                      </label>
                      <Textarea
                        placeholder="e.g., Annual check-up, follow-up visit..."
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Notes (optional)
                      </label>
                      <Textarea
                        placeholder="Any extra details you want to remember."
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Lab form (same fields as History) */}
                {eventType === "lab" && (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Lab Type</label>
                      <Input
                        value={labType}
                        onChange={(e) => setLabType(e.target.value)}
                        placeholder="e.g. Blood Work, X-Ray"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground">Attached Visit (Optional)</label>
                      <select
                        value={attachedProviderId}
                        onChange={(e) => setAttachedProviderId(e.target.value)}
                        className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                      >
                        <option value="">None</option>
                        {sortedAppointments.map((apt) => (
                          <option key={apt.id} value={apt.id}>
                            {apt.doctor || "Provider"} • {apt.date ? new Date(apt.date).toLocaleDateString() : "No date"}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Date and time of lab
                      </label>
                      <DateTimePicker
                        date={dateTime ? new Date(dateTime) : undefined}
                        setDate={(date) => setDateTime(date ? date.toISOString() : "")}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Reason for lab
                      </label>
                      <Textarea
                        placeholder="e.g., Follow-up blood work, routine labs..."
                        rows={3}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Notes (optional)
                      </label>
                      <Textarea
                        placeholder="Any extra details you want to remember."
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                  </>
                )}

                {/* Activity form */}
                {eventType === "activity" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">
                        Activity title *
                      </label>
                      <Input
                        value={eventTitle}
                        onChange={(e) => setEventTitle(e.target.value)}
                        placeholder="e.g., Physical therapy, Walk, Stretching"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        value={eventDescription}
                        onChange={(e) =>
                          setEventDescription(e.target.value)
                        }
                        rows={3}
                        placeholder="Any details you want to remember about this activity."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isAllDay}
                        onChange={(e) => setIsAllDay(e.target.checked)}
                      />
                      <span>All day</span>
                    </div>
                    {!isAllDay && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">Time</label>
                        <Input
                          type="time"
                          value={eventTime}
                          onChange={(e) => setEventTime(e.target.value)}
                        />
                      </div>
                    )}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Date *</label>
                      <DatePicker
                        date={eventDate ? new Date(eventDate + "T00:00:00") : undefined}
                        setDate={(date) => setEventDate(date ? format(date, "yyyy-MM-dd") : "")}
                      />
                    </div>

                    {/* Recurrence */}
                    <div className="space-y-3 pt-2 border-t">
                      <label className="text-sm font-medium">Recurrence</label>
                      <div className="flex gap-2">
                        {(["once", "daily", "weekly"] as const).map(type => (
                          <button
                            key={type}
                            onClick={() => setFrequencyType(type)}
                            className={`px-3 py-1.5 rounded-md text-xs border ${frequencyType === type ? "bg-primary text-white border-primary" : "bg-background"}`}
                          >
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </button>
                        ))}
                      </div>

                      {frequencyType === "weekly" && (
                        <div className="flex gap-1 flex-wrap">
                          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                if (selectedDays.includes(i)) {
                                  setSelectedDays(prev => prev.filter(d => d !== i));
                                } else {
                                  setSelectedDays(prev => [...prev, i]);
                                }
                              }}
                              className={`w-8 h-8 rounded-full text-xs border flex items-center justify-center ${selectedDays.includes(i) ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted"}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      )}

                      {frequencyType !== "once" && (
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">End Date (Optional)</label>
                          <DatePicker
                            date={recurrenceEndDate ? new Date(recurrenceEndDate + "T00:00:00") : undefined}
                            setDate={(date) => setRecurrenceEndDate(date ? format(date, "yyyy-MM-dd") : "")}
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Medication form (aligned with Profile) */}
                {eventType === "medication" && (
                  <>
                    <div className="space-y-1.5 mb-4">
                      <label className="text-sm font-medium">Select Existing (Optional)</label>
                      <select
                        className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                        onChange={(e) => {
                          const medId = e.target.value;
                          if (!medId) {
                            resetEventForm();
                            setEventType("medication");
                            return;
                          }
                          const med = medications.find(m => m.id === medId);
                          if (med) {
                            setMedForm({
                              name: med.name,
                              dosage: med.dosage,
                              frequency: med.frequency,
                              times: med.times || [],
                              startDate: med.startDate || "",
                              endDate: med.endDate || "",
                              prescribedBy: med.prescribedBy || "",
                              reason: med.reason || "",
                              frequencyType: med.frequencyType || "once",
                              selectedDays: med.selectedDays || [],
                            });
                            setEditingEventId(med.id);
                            setIsEditing(true);
                          }
                        }}
                        value={isEditing && editingEventId ? editingEventId : ""}
                      >
                        <option value="">-- Create New --</option>
                        {medications.map(m => (
                          <option key={m.id} value={m.id}>{m.name} - {m.dosage}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Medication Name *
                        </label>
                        <Input
                          value={medForm.name}
                          onChange={(e) =>
                            setMedForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g. Lisinopril"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Dosage *
                        </label>
                        <Input
                          value={medForm.dosage}
                          onChange={(e) =>
                            setMedForm((prev) => ({
                              ...prev,
                              dosage: e.target.value,
                            }))
                          }
                          placeholder="e.g. 10mg"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Frequency
                        </label>
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            {(["once", "daily", "weekly"] as const).map(type => (
                              <button
                                key={type}
                                onClick={() => setMedForm(prev => ({
                                  ...prev,
                                  frequencyType: type,
                                  // Update string for consistency, though logic uses frequencyType
                                  frequency: type === "daily" ? "Daily" : type === "weekly" ? "Weekly" : "Once"
                                }))}
                                className={`px-3 py-1.5 rounded-md text-xs border ${medForm.frequencyType === type ? "bg-primary text-white border-primary" : "bg-background"}`}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </button>
                            ))}
                          </div>

                          {medForm.frequencyType === "weekly" && (
                            <div className="flex gap-1 flex-wrap">
                              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const current = medForm.selectedDays || [];
                                    const newDays = current.includes(i)
                                      ? current.filter(d => d !== i)
                                      : [...current, i];
                                    setMedForm(prev => ({ ...prev, selectedDays: newDays }));
                                  }}
                                  className={`w-8 h-8 rounded-full text-xs border flex items-center justify-center ${(medForm.selectedDays || []).includes(i) ? "bg-primary text-white border-primary" : "bg-background hover:bg-muted"}`}
                                >
                                  {d}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Prescribed By
                        </label>
                        <div className="space-y-2">
                          <select
                            value={providers.includes(medForm.prescribedBy) ? medForm.prescribedBy : (medForm.prescribedBy ? "other" : "")}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "other") {
                                setMedForm(prev => ({ ...prev, prescribedBy: "" }));
                              } else {
                                setMedForm(prev => ({ ...prev, prescribedBy: val }));
                              }
                            }}
                            className="w-full p-2 border border-border rounded-lg bg-background text-foreground"
                          >
                            <option value="">Select Provider</option>
                            {providers.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                            <option value="other">Other</option>
                          </select>
                          {(!providers.includes(medForm.prescribedBy) && (medForm.prescribedBy || !providers.length)) && (
                            <Input
                              value={medForm.prescribedBy}
                              onChange={(e) =>
                                setMedForm((prev) => ({
                                  ...prev,
                                  prescribedBy: e.target.value,
                                }))
                              }
                              placeholder="Doctor Name"
                            />
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          Start Date
                        </label>
                        <DatePicker
                          date={medForm.startDate ? new Date(medForm.startDate + "T00:00:00") : undefined}
                          setDate={(date) =>
                            setMedForm((prev) => ({
                              ...prev,
                              startDate: date ? format(date, "yyyy-MM-dd") : "",
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium">
                          End Date (optional)
                        </label>
                        <DatePicker
                          date={medForm.endDate ? new Date(medForm.endDate + "T00:00:00") : undefined}
                          setDate={(date) =>
                            setMedForm((prev) => ({
                              ...prev,
                              endDate: date ? format(date, "yyyy-MM-dd") : "",
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Reason</label>
                      <Input
                        value={medForm.reason}
                        onChange={(e) =>
                          setMedForm((prev) => ({
                            ...prev,
                            reason: e.target.value,
                          }))
                        }
                        placeholder="e.g. Blood pressure"
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-sm font-medium">
                        Times
                      </label>
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {medForm.times.map(t => (
                          <div key={t} className="bg-muted px-2 py-1 rounded-md text-sm flex items-center gap-1">
                            {t}
                            <button onClick={() => handleRemoveMedTime(t)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="time"
                          value={newMedTime}
                          onChange={(e) => setNewMedTime(e.target.value)}
                          onBlur={handleAddMedTime}
                          className="w-32"
                        />
                        <button onClick={handleAddMedTime} className="text-sm text-primary font-medium">Add Time</button>
                      </div>
                    </div>
                  </>
                )}

                {formError && (
                  <p className="text-xs text-red-500 mt-1">{formError}</p>
                )}
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => {
                    resetEventForm();
                    setShowAddEventModal(false);
                  }}
                  className="px-4 py-2 border border-border rounded-lg font-medium hover:bg-muted transition-colors"
                >
                  Cancel
                </button>

                <button
                  onClick={handleAddEvent}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  {isEditing ? "Update Event" : "Add Event"}
                </button>

                {isEditing && (
                  <button
                    onClick={handleDeleteEvent}
                    className="px-4 py-2 border border-red-200 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Deletion Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card p-6 rounded-xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
              <h3 className="text-lg font-bold mb-2">Delete Event</h3>
              <p className="text-muted-foreground mb-6">
                {deleteModalType === "recurring"
                  ? "This is a recurring event. Do you want to delete just this instance or the entire series?"
                  : "Are you sure you want to delete this event? This action cannot be undone."}
              </p>

              <div className="flex flex-col gap-3">
                {deleteModalType === "recurring" ? (
                  <>
                    <button
                      onClick={() => confirmDelete(false)}
                      className="w-full py-2.5 bg-secondary text-secondary-foreground hover:bg-green-900 rounded-lg font-medium"
                    >
                      Delete Just This Instance
                    </button>
                    <button
                      onClick={() => confirmDelete(true)}
                      className="w-full py-2.5 bg-red-500 text-secondary-foreground hover:bg-red-900 rounded-lg font-medium"
                    >
                      Delete Entire Series
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="w-full py-2.5 text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowDeleteModal(false)}
                      className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => confirmDelete(true)}
                      className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout >
  );
}
