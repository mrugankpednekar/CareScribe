import { Layout } from "@/components/layout/Layout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { mockAppointments, mockTasks } from "@/lib/mockData";
import { Mic, Plus, ChevronRight } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";

  return (
    <Layout>
      {/* Header */}
      <header className="mb-8">
        <p className="text-muted-foreground font-medium mb-1">{greeting}, Alex</p>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Your Health Overview</h1>
      </header>

      {/* Quick Action - Record */}
      <Link href="/record">
        <a className="block mb-10 group">
          <div className="bg-gradient-to-br from-primary to-teal-600 rounded-2xl p-6 md:p-8 text-primary-foreground shadow-lg shadow-primary/20 transition-transform transform group-hover:scale-[1.01] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Have an appointment?</h2>
                <p className="text-primary-foreground/80 max-w-md">
                  Tap here to start recording. CareScribe will listen, transcribe, and organize your doctor's instructions automatically.
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center self-start md:self-center group-hover:bg-white/30 transition-colors">
                <Mic className="w-8 h-8" />
              </div>
            </div>
          </div>
        </a>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Today's Plan</h2>
            <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">
              {mockTasks.filter(t => !t.completed).length} Remaining
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Recent Visits</h2>
            <Link href="/history">
              <a className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          </div>

          <div className="space-y-4">
            {mockAppointments.slice(0, 2).map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} compact />
            ))}
          </div>

          {/* Quick Add */}
          <div className="pt-4">
             <button className="w-full py-3 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors font-medium">
               <Plus className="w-5 h-5" />
               Add Past Record
             </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}
