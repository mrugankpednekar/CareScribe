import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { Search, Filter, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppointments } from "@/context/AppointmentsContext";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { Appointment } from "@/lib/types";

export default function History() {
  const { appointments, addAppointment } = useAppointments();

  const sortedAppointments = [...appointments].sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  // NEW: search + filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [isAdding, setIsAdding] = useState(false);
  const [provider, setProvider] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isFuture, setIsFuture] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const resetForm = () => {
    setProvider("");
    setDateTime("");
    setCategory("");
    setReason("");
    setNotes("");
    setIsFuture(true);
    setFormError(null);
  };

  const handleCreateAppointment = () => {
    setFormError(null);

    if (isFuture && !dateTime) {
      setFormError("Please add a date and time for future appointments.");
      return;
    }

    const dateIso = dateTime ? new Date(dateTime).toISOString() : new Date().toISOString();
    const status: Appointment["status"] = isFuture ? "upcoming" : "completed";

    addAppointment({
      doctor: provider.trim() || "",
      date: dateIso,
      specialty: category || "",
      reason: reason || "",
      diagnosis: [],
      notes: notes || "",
      status,
      instructions: [],
      medications: [],
      transcriptIds: [],
      documentIds: [],
    });

    resetForm();
    setIsAdding(false);
  };

  // --- Filtering logic ---

  const normalize = (value: string | undefined | null) =>
    (value ?? "").toLowerCase().trim();

  const matchesSearch = (apt: Appointment) => {
    const q = normalize(searchQuery);
    if (!q) return true;

    const dateStr = apt.date
      ? new Date(apt.date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "";

    const haystack = normalize(
      [
        apt.doctor,
        apt.specialty,
        apt.reason,
        apt.notes,
        dateStr,
      ].join(" "),
    );

    // simple multi-word "similarity" search: all tokens must appear somewhere
    const tokens = q.split(/\s+/).filter(Boolean);
    return tokens.every((token) => haystack.includes(token));
  };

  const matchesSpecialty = (apt: Appointment) => {
    if (!filterSpecialty) return true;
    if (filterSpecialty === "__none") {
      // filter appointments with no specialty
      return !apt.specialty;
    }
    return normalize(apt.specialty) === normalize(filterSpecialty);
  };

  const matchesDateRange = (apt: Appointment) => {
    if (!filterDateFrom && !filterDateTo) return true;
    if (!apt.date) return false;

    const d = new Date(apt.date);

    if (filterDateFrom) {
      const from = new Date(filterDateFrom);
      if (d < from) return false;
    }

    if (filterDateTo) {
      // include entire "to" day by going to end of that day
      const to = new Date(filterDateTo);
      to.setHours(23, 59, 59, 999);
      if (d > to) return false;
    }

    return true;
  };

  const filteredAppointments = sortedAppointments.filter(
    (apt) => matchesSearch(apt) && matchesSpecialty(apt) && matchesDateRange(apt),
  );

  const clearFilters = () => {
    setSearchQuery("");
    setFilterSpecialty("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  // collect unique specialties for the filter dropdown
  const allSpecialties = Array.from(
    new Set(
      appointments
        .map((a) => a.specialty)
        .filter((s): s is string => !!s && s.trim().length > 0),
    ),
  ).sort();

  return (
    <Layout>
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Medical History</h1>
          <p className="text-muted-foreground">A complete timeline of your care journey.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold shadow-sm hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add appointment
        </button>
      </header>

      {/* Search + filter controls */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by doctor, condition, notes, or date..."
              className="pl-10 bg-card border-border/50 h-12 text-base rounded-xl"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="px-4 py-2 bg-card border border-border/50 rounded-xl flex items-center gap-2 text-foreground hover:bg-secondary transition-colors font-medium"
          >
            <Filter className="w-5 h-5" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-card border border-border/50 rounded-xl p-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                From date
              </label>
              <Input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="h-9 text-sm bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                To date
              </label>
              <Input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="h-9 text-sm bg-background"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Specialty
              </label>
              <select
                value={filterSpecialty}
                onChange={(e) => setFilterSpecialty(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
              >
                <option value="">All specialties</option>
                <option value="__none">No specialty</option>
                {allSpecialties.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={clearFilters}
                className="w-full h-9 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted"
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
              <div className="absolute -left-[41px] md:-left-[43px] top-6 w-5 h-5 rounded-full bg-background border-4 border-primary" />
              <div className="mb-2 text-sm text-muted-foreground font-medium pl-2">
                {apt.date
                  ? new Date(apt.date).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : "No date"}
              </div>
              <HistoryAppointmentCard appointment={apt} />
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-card w-full max-w-lg rounded-2xl border border-border shadow-xl p-6 md:p-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Add appointment</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Add a past visit or a future appointment. Most fields are optional.
            </p>

            <div className="space-y-4 mb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Provider name</label>
                <Input
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  placeholder="e.g. Dr. Emily White"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Is this a past or future appointment?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFuture(false)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium",
                      !isFuture
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border",
                    )}
                  >
                    Past
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFuture(true)}
                    className={cn(
                      "flex-1 rounded-lg border px-3 py-2 text-sm font-medium",
                      isFuture
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-background border-border",
                    )}
                  >
                    Future
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Date is optional for past visits, but required for future appointments.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Date &amp; time</label>
                <Input
                  type="datetime-local"
                  value={dateTime}
                  onChange={(e) => setDateTime(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Category (optional)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <option value="">No category</option>
                  <option value="General">General</option>
                  <option value="Dermatology">Dermatology</option>
                  <option value="ENT">ENT</option>
                  <option value="Cardiology">Cardiology</option>
                  <option value="Orthopedics">Orthopedics</option>
                  <option value="Psychiatry">Psychiatry</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Reason (optional)
                </label>
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why was this visit for?"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Additional notes (optional)
                </label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Any details you want to remember from this appointment."
                  className="bg-background"
                />
              </div>
            </div>

            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  resetForm();
                  setIsAdding(false);
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAppointment}
                className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Save appointment
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function HistoryAppointmentCard({ appointment }: { appointment: Appointment }) {
  const dateObj = appointment.date ? new Date(appointment.date) : null;

  return (
    <div className="group relative bg-card hover:shadow-md transition-all duration-300 rounded-2xl border border-border/50 overflow-hidden cursor-pointer">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/80 group-hover:bg-primary transition-colors" />

      <div className="p-5 pl-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {appointment.doctor || "New Provider"}
            </h3>
            <p className="text-sm font-medium text-muted-foreground">
              {appointment.specialty || "General"}
            </p>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
              appointment.status === "completed"
                ? "bg-gray-100 text-gray-700 border-gray-200"
                : appointment.status === "upcoming"
                ? "bg-primary/20 text-primary border-primary/20"
                : "bg-yellow-50 text-yellow-700 border-yellow-100"
            }`}
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
            <span className="text-xs text-muted-foreground">No date recorded</span>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-foreground font-medium mb-1">Reason for visit</p>
          <p className="text-sm text-muted-foreground line-clamp-1">
            {appointment.reason || "No reason provided"}
          </p>
        </div>
      </div>

      <Link href={`/appointment/${appointment.id}`}>
        <a className="absolute inset-0 z-10 rounded-2xl" />
      </Link>
    </div>
  );
}
