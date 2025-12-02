import { CalendarDays, Clock, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
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
    <div className="group relative bg-card hover:shadow-md transition-all duration-300 rounded-2xl border border-border/50 overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/80 group-hover:bg-primary transition-colors" />
      
      <div className="p-5 pl-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
              {appointment.doctor}
            </h3>
            <p className="text-sm font-medium text-muted-foreground">{appointment.specialty}</p>
          </div>
          <div className={cn(
            "px-2.5 py-1 rounded-full text-xs font-semibold capitalize border",
            appointment.status === "completed" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
            appointment.status === "upcoming" ? "bg-primary/20 text-primary border-primary/20" :
            "bg-yellow-50 text-yellow-700 border-yellow-100"
          )}>
            {appointment.status}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
            <Clock className="w-4 h-4 text-primary" />
            <span>{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>

        {!compact && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="text-sm text-foreground font-medium mb-1">Reason for visit</p>
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
