import { CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Appointment } from "@/lib/mockData";
import { Link } from "wouter";

interface AppointmentCardProps {
  appointment: Appointment;
  compact?: boolean;
}

export function AppointmentCard({ appointment, compact = false }: AppointmentCardProps) {
  const date = new Date(appointment.date);
  
  return (
    <div className="group relative bg-card rounded-lg border border-border hover:border-muted transition-all cursor-pointer">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary rounded-l-lg" />
      
      <div className="p-4 pl-5">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-foreground">
              {appointment.doctor}
            </h3>
            <p className="text-xs text-muted-foreground">{appointment.specialty}</p>
          </div>
          <span className={cn(
            "text-xs font-semibold px-2 py-1 rounded",
            appointment.status === "completed" ? "bg-secondary text-muted-foreground" :
            appointment.status === "upcoming" ? "bg-primary/10 text-primary" :
            "bg-secondary text-muted-foreground"
          )}>
            {appointment.status}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </div>
        </div>

        {!compact && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs font-semibold text-foreground mb-1">Reason</p>
            <p className="text-xs text-muted-foreground">{appointment.reason}</p>
          </div>
        )}
      </div>
      
      <Link href={`/history?id=${appointment.id}`}>
        <a className="absolute inset-0 z-10 rounded-lg" />
      </Link>
    </div>
  );
}
