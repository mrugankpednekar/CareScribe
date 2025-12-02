import { Layout } from "@/components/layout/Layout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { mockAppointments } from "@/lib/mockData";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function History() {
  return (
    <Layout>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Medical History</h1>
        <p className="text-muted-foreground">A complete timeline of your care journey.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input 
            placeholder="Search by doctor, condition, or date..." 
            className="pl-10 bg-card border-border/50 h-12 text-base rounded-xl"
          />
        </div>
        <button className="px-4 py-2 bg-card border border-border/50 rounded-xl flex items-center gap-2 text-foreground hover:bg-secondary transition-colors font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </button>
      </div>

      <div className="space-y-6 relative pl-8 border-l-2 border-border/50 ml-4 md:ml-8">
        {mockAppointments.map((apt) => (
          <div key={apt.id} className="relative">
             {/* Timeline Dot */}
            <div className="absolute -left-[41px] md:-left-[43px] top-6 w-5 h-5 rounded-full bg-background border-4 border-primary" />
            
            <div className="mb-2 text-sm text-muted-foreground font-medium pl-2">
              {new Date(apt.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <HistoryAppointmentCard appointment={apt} />
          </div>
        ))}
      </div>
    </Layout>
  );
}

function HistoryAppointmentCard({ appointment }: { appointment: any }) {
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
          <div className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize border ${
            appointment.status === "completed" ? "bg-gray-100 text-gray-700 border-gray-200" :
            appointment.status === "upcoming" ? "bg-primary/20 text-primary border-primary/20" :
            "bg-yellow-50 text-yellow-700 border-yellow-100"
          }`}>
            {appointment.status}
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
            <span>{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-md">
            <span>{date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border/50">
          <p className="text-sm text-foreground font-medium mb-1">Reason for visit</p>
          <p className="text-sm text-muted-foreground line-clamp-1">{appointment.reason}</p>
        </div>
      </div>
    </div>
  );
}
