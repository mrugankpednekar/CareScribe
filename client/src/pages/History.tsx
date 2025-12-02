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
            <AppointmentCard appointment={apt} />
          </div>
        ))}
      </div>
    </Layout>
  );
}
