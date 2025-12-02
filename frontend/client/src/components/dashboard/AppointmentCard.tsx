import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/types";
import { Link } from "wouter";

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
}

export function AppointmentCard({
  appointment,
  compact = false,
}: AppointmentCardProps) {
  const hasDate = !!appointment.date;
  const date = hasDate ? new Date(appointment.date as string) : null;

  return (
    <div className="group relative bg-card rounded-lg border border-border hover:border-muted transition-all cursor-pointer">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />

      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-sm text-foreground">
              {appointment.doctor || "Provider"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {appointment.specialty || "General"}
            </p>
          </div>
          <span
            className={cn(
              "text-xs font-semibold px-2 py-1 rounded capitalize",
              appointment.status === "completed"
                ? "bg-muted text-muted-foreground"
                : appointment.status === "upcoming"
                ? "bg-primary/10 text-primary"
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
              Reason
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
