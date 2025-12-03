import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/types";
import { Link } from "wouter";
import { useAppointments } from "@/context/AppointmentsContext";

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
}

export function AppointmentCard({
  appointment,
  compact = false,
}: AppointmentCardProps) {
  const { appointments } = useAppointments();
  const hasDate = !!appointment.date;
  const date = hasDate ? new Date(appointment.date as string) : null;
  const isLab = appointment.type === "lab";
  const attachedProvider = appointment.attachedProviderId
    ? appointments.find((a) => a.id === appointment.attachedProviderId)
    : null;

  return (
    <div className="group relative bg-card rounded-lg border border-border hover:border-muted transition-all cursor-pointer">
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full rounded-l-lg",
        isLab ? "bg-blue-500" : "bg-primary"
      )} />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {isLab ? (appointment.labType || appointment.doctor || "Lab Work") : (appointment.doctor || "Provider")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isLab 
                ? (attachedProvider ? `Attached to ${attachedProvider.doctor}` : "Lab Work")
                : (appointment.specialty || "General")}
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded capitalize",
              appointment.status === "completed"
                ? "bg-muted text-muted-foreground"
                : appointment.status === "upcoming"
                ? isLab
                  ? "bg-blue-500/10 text-blue-600"
                  : "bg-primary/10 text-primary"
                : "bg-amber-100 text-amber-700", // cancelled / other
            )}
          >
            {appointment.status}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {hasDate && date
              ? date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "No date"}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {hasDate && date
              ? date.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "--:--"}
          </div>
        </div>

        {!compact && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">
              {isLab ? "Reason for lab" : "Reason"}
            </p>
            <p className="text-xs text-muted-foreground">
              {appointment.reason || "No reason provided"}
            </p>
          </div>
        )}
      </div>

      {/* Link to the appointment details route */}
      <Link href={`/appointment/${appointment.id}`}>
        <a className="absolute inset-0 z-10 rounded-lg" />
      </Link>
    </div>
  );
}
