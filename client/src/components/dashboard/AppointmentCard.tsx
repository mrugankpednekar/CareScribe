import { CalendarDays, Clock, Stethoscope } from "lucide-react";
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
    <div className="group relative bg-card hover:shadow-md transition-all duration-300 rounded-2xl border-2 border-border overflow-hidden hover:border-primary/40 hover:bg-gradient-to-r hover:from-card hover:to-primary/5 hover:-translate-x-1">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary to-secondary transition-all group-hover:w-2" />
      
      <div className="p-5 pl-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-4 h-4 text-primary flex-shrink-0" />
              <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors truncate">
                {appointment.doctor}
              </h3>
            </div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{appointment.specialty}</p>
          </div>
          <div className={cn(
            "px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border-2 flex-shrink-0",
            appointment.status === "completed" ? "bg-gray-100 text-gray-700 border-gray-300" :
            appointment.status === "upcoming" ? "bg-success/10 text-success border-success/30" :
            "bg-destructive/10 text-destructive border-destructive/30"
          )}>
            {appointment.status === "completed" && "✓"}
            {appointment.status === "upcoming" && "📅"}
            {appointment.status === "processing" && "⏳"}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-semibold text-muted-foreground">
          <div className="flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1.5 rounded-lg">
            <CalendarDays className="w-3.5 h-3.5" />
            <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/10 text-secondary px-2.5 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span>{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-xs font-bold text-foreground mb-1 uppercase tracking-wide">Reason</p>
            <p className="text-sm text-muted-foreground line-clamp-1">{appointment.reason}</p>
          </div>
        )}
      </div>
      
      {/* Action Area */}
      <Link href={`/history?id=${appointment.id}`}>
        <a className="absolute inset-0 z-10" />
      </Link>
    </div>
  );
}
