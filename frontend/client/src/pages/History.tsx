import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Search, Filter, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DateTimePicker } from "@/components/ui/date-picker";
import { useAppointments } from "@/context/AppointmentsContext";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { Appointment } from "@/lib/types";

type FilterType = "all" | "appointment" | "lab";
type FilterStatus = "all" | "upcoming" | "completed";
type FilterTimeframe = "all" | "last30" | "last90" | "year";

export default function History() {
  const { appointments, addAppointment } = useAppointments();

  const sortedAppointments = [...appointments].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterTimeframe, setFilterTimeframe] = useState<FilterTimeframe>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  // Form state for adding events (appointments + lab work)
  const [eventType, setEventType] = useState<"appointment" | "lab">(
    "appointment",
  );
  const [provider, setProvider] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [category, setCategory] = useState(""); // specialty or lab-type filter
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Lab-specific
  const [labType, setLabType] = useState("");
  const [attachedProviderId, setAttachedProviderId] = useState("");

  const resetForm = () => {
    setEventType("appointment");
    setProvider("");
    setDateTime("");
    setCategory("");
    setReason("");
    setNotes("");
    setFormError(null);
    setLabType("");
    setAttachedProviderId("");
  };

  const handleCreateAppointment = () => {
    setFormError(null);

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

    // infer status purely from date/time
    const status: Appointment["status"] =
      selectedDate.getTime() > now.getTime() ? "upcoming" : "completed";

    // Build the new appointment/lab
    // AppointmentsContext will normalize default values
    addAppointment({
      type: eventType,
      date: dateTime,
      doctor:
        eventType === "appointment"
          ? provider.trim()
          : attachedProviderId
            ? appointments.find((a) => a.id === attachedProviderId)?.doctor ||
            "Lab"
            : "Lab",
      specialty: eventType === "appointment" ? category.trim() || "General" : undefined,
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
    });

    resetForm();
    setIsAdding(false);
  };

  // --- Filtering logic ---
  const matchesSearch = (apt: Appointment) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();

    const dateStr = apt.date
      ? new Date(apt.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      : "";

    const attachedDoctor =
      apt.attachedProviderId &&
      appointments.find((a) => a.id === apt.attachedProviderId)?.doctor;

    const haystack = (
      [
        apt.doctor,
        apt.specialty,
        apt.reason,
        apt.status,
        apt.notes,
        apt.labType,
        attachedDoctor || "",
        dateStr,
      ].join(" ")
    ).toLowerCase();

    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  };

  const matchesCategory = (apt: Appointment) => {
    if (!category.trim()) return true;
    const c = category.toLowerCase();
    return (
      apt.specialty?.toLowerCase().includes(c) ||
      apt.labType?.toLowerCase().includes(c)
    );
  };

  const matchesType = (apt: Appointment) => {
    if (filterType === "all") return true;
    const t = apt.type ?? "appointment";
    return t === filterType;
  };

  const matchesStatus = (apt: Appointment) => {
    if (filterStatus === "all") return true;
    return apt.status === filterStatus;
  };

  const matchesTimeframe = (apt: Appointment) => {
    if (filterTimeframe === "all") return true;
    if (!apt.date) return false;

    const d = new Date(apt.date);
    const now = new Date();

    switch (filterTimeframe) {
      case "last30": {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 30);
        return d >= cutoff && d <= now;
      }
      case "last90": {
        const cutoff = new Date();
        cutoff.setDate(now.getDate() - 90);
        return d >= cutoff && d <= now;
      }
      case "year": {
        return d.getFullYear() === now.getFullYear();
      }
      default:
        return true;
    }
  };

  const filteredAppointments = sortedAppointments.filter(
    (apt) =>
      matchesSearch(apt) &&
      matchesCategory(apt) &&
      matchesType(apt) &&
      matchesStatus(apt) &&
      matchesTimeframe(apt),
  );

  const clearFilters = () => {
    setFilterType("all");
    setFilterStatus("all");
    setFilterTimeframe("all");
    setCategory("");
    setSearch("");
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Health history
            </h1>
            <p className="text-sm text-muted-foreground">
              Browse your past and upcoming visits, tests, and lab work.
            </p>
          </div>

          <button
            onClick={() => {
              setIsAdding(true);
              setFormError(null);
            }}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add visit or lab
          </button>
        </div>

        {/* Search & filters */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
              <Input
                placeholder="Search by doctor, lab type, reason, or date..."
                className="pl-9 h-9 rounded-xl text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className={cn(
                "inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium",
                showFilters
                  ? "bg-secondary border-border"
                  : "bg-background hover:bg-secondary/40 border-border/70",
              )}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="space-y-3 pt-1 border-t border-border/60 mt-2">
              {/* Filter pills */}
              <div className="flex flex-wrap gap-2">
                {/* Type */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Type
                  </span>
                  <div className="flex rounded-full bg-muted/60 p-0.5">
                    {[
                      { label: "All", value: "all" },
                      { label: "Visits", value: "appointment" },
                      { label: "Lab work", value: "lab" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFilterType(opt.value as FilterType)
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                          filterType === opt.value
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    Status
                  </span>
                  <div className="flex rounded-full bg-muted/60 p-0.5">
                    {[
                      { label: "All", value: "all" },
                      { label: "Upcoming", value: "upcoming" },
                      { label: "Completed", value: "completed" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFilterStatus(opt.value as FilterStatus)
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                          filterStatus === opt.value
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timeframe */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    When
                  </span>
                  <div className="flex rounded-full bg-muted/60 p-0.5">
                    {[
                      { label: "All time", value: "all" },
                      { label: "Last 30 days", value: "last30" },
                      { label: "Last 90 days", value: "last90" },
                      { label: "This year", value: "year" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() =>
                          setFilterTimeframe(opt.value as FilterTimeframe)
                        }
                        className={cn(
                          "px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors",
                          filterTimeframe === opt.value
                            ? "bg-background shadow-sm"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Specialty / lab type input + clear */}
              <div className="flex flex-col md:flex-row md:items-center gap-2">
                <Input
                  placeholder="Filter by specialty or lab type (e.g., cardiology, blood work)"
                  className="h-9 rounded-xl text-xs"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
                <button
                  onClick={clearFilters}
                  className="w-full h-9 rounded-lg border border-border/80 text-xs font-semibold text-muted-foreground hover:bg-muted"
                >
                  Clear filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        <div className="space-y-6 relative pl-8 border-l-2 border-border/50 ml-4 md:ml-8">
          {filteredAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground pl-2">
              No appointments match your search and filters.
            </p>
          ) : (
            filteredAppointments.map((apt) => (
              <div key={apt.id} className="relative">
                <div
                  className={cn(
                    "absolute -left-[41px] md:-left-[43px] top-6 w-5 h-5 rounded-full bg-background border-4",
                    (apt.type ?? "appointment") === "lab"
                      ? "border-blue-500"
                      : "border-primary",
                  )}
                />
                <div className="mb-2 text-sm text-muted-foreground font-medium pl-2">
                  {apt.date
                    ? new Date(apt.date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                    : "No date"}
                </div>
                <HistoryAppointmentCard
                  appointment={apt}
                  appointments={appointments}
                />
              </div>
            ))
          )}
        </div>

        {/* Add visit/lab modal */}
        {isAdding && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
            <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">
                    Add visit or lab work
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    This helps keep your health history complete and accurate.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    resetForm();
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>

              {/* Event type toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => setEventType("appointment")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-xl border text-xs font-medium",
                    eventType === "appointment"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-foreground border-border",
                  )}
                >
                  Regular visit
                </button>
                <button
                  type="button"
                  onClick={() => setEventType("lab")}
                  className={cn(
                    "flex-1 px-3 py-2 rounded-xl border text-xs font-medium",
                    eventType === "lab"
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-muted text-foreground border-border",
                  )}
                >
                  Lab work / test
                </button>
              </div>

              <div className="space-y-3">
                {/* Appointment / provider details */}
                {eventType === "appointment" ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Provider or clinic name
                      </label>
                      <Input
                        placeholder="e.g., Dr. Patel, City Health Clinic"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="h-9 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Specialty (optional)
                      </label>
                      <Input
                        placeholder="e.g., Cardiology, Primary care"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="h-9 rounded-xl text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Type of lab work
                      </label>
                      <Input
                        placeholder="e.g., Blood test, X-ray, MRI"
                        value={labType}
                        onChange={(e) => setLabType(e.target.value)}
                        className="h-9 rounded-xl text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium">
                        Attach to a previous visit (optional)
                      </label>
                      <select
                        className="w-full h-9 rounded-xl border border-border bg-background text-xs px-2"
                        value={attachedProviderId}
                        onChange={(e) => setAttachedProviderId(e.target.value)}
                      >
                        <option value="">No specific visit</option>
                        {sortedAppointments
                          .filter((a) => (a.type ?? "appointment") === "appointment")
                          .map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.date
                                ? new Date(a.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                                : "No date"}{" "}
                              - {a.doctor || "Provider"}
                            </option>
                          ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Date and time of {eventType === "lab" ? "lab" : "visit"}
                  </label>
                  <DateTimePicker
                    date={dateTime ? new Date(dateTime) : undefined}
                    setDate={(date) => setDateTime(date ? date.toISOString() : "")}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    {eventType === "lab" ? "Reason for lab" : "Reason for visit"}
                  </label>
                  <Textarea
                    placeholder={
                      eventType === "lab"
                        ? "e.g., Follow-up blood work for medication, routine labs..."
                        : "e.g., Annual check-up, chest pain, follow-up visit..."
                    }
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="rounded-xl text-sm min-h-[80px]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder={
                      eventType === "lab"
                        ? "Any extra details you want to remember about this lab work."
                        : "Any extra details you want to remember about this visit."
                    }
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="rounded-xl text-sm min-h-[80px]"
                  />
                </div>

                {formError && (
                  <p className="text-xs text-red-500">{formError}</p>
                )}

                <div className="flex justify-end gap-2 pt-3">
                  <button
                    onClick={() => {
                      setIsAdding(false);
                      resetForm();
                    }}
                    className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted/60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateAppointment}
                    className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function HistoryAppointmentCard({
  appointment,
  appointments,
}: {
  appointment: Appointment;
  appointments: Appointment[];
}) {
  let dateObj = appointment.date ? new Date(appointment.date) : null;
  if (appointment.date && appointment.date.length === 10 && appointment.date.includes("-")) {
    const [y, m, d] = appointment.date.split("-").map(Number);
    dateObj = new Date(y, m - 1, d);
  }
  const isLab = (appointment.type ?? "appointment") === "lab";

  return (
    <div className="group relative bg-card hover:shadow-md transition-all duration-300 rounded-2xl border border-border/50 overflow-hidden cursor-pointer">
      <div
        className={cn(
          "absolute top-0 left-0 w-1 h-full transition-colors",
          isLab
            ? "bg-blue-500/80 group-hover:bg-blue-500"
            : "bg-primary/80 group-hover:bg-primary",
        )}
      />

      <div className="p-5 pl-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3
              className={cn(
                "font-bold text-lg transition-colors",
                isLab
                  ? "text-foreground group-hover:text-blue-600"
                  : "text-foreground group-hover:text-primary",
              )}
            >
              {isLab
                ? appointment.labType || appointment.doctor || "Lab Work"
                : appointment.doctor || "New Provider"}
            </h3>
            <p className="text-sm font-medium text-muted-foreground">
              {isLab
                ? appointment.attachedProviderId
                  ? `Attached to ${appointments.find(
                    (a) => a.id === appointment.attachedProviderId,
                  )?.doctor || "Unknown"
                  }`
                  : "Lab Work"
                : appointment.specialty || "General"}
            </p>
          </div>
          <div
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-semibold capitalize border",
              appointment.status === "completed"
                ? "bg-gray-100 text-gray-700 border-gray-200"
                : appointment.status === "upcoming"
                  ? isLab
                    ? "bg-blue-500/20 text-blue-600 border-blue-500/20"
                    : "bg-primary/20 text-primary border-primary/20"
                  : "bg-yellow-50 text-yellow-700 border-yellow-100",
            )}
          >
            {appointment.status}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          {dateObj ? (
            <>
              <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                <span>
                  {dateObj.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
                <span>
                  {dateObj.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              No date recorded
            </span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-foreground font-medium mb-1">
            {isLab ? "Reason for lab" : "Reason for visit"}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {appointment.reason || "No reason provided"}
          </p>
        </div>
      </div>

      {/* Click-through to details page (lab or visit) */}
      <Link href={`/appointment/${appointment.id}`}>
        <a className="absolute inset-0 z-10 rounded-2xl" />
      </Link>
    </div>
  );
}
