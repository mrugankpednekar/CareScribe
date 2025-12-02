import { Layout } from "@/components/layout/Layout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { mockAppointments, mockTasks } from "@/lib/mockData";
import { Mic, Plus, ChevronRight } from "lucide-react";
import { Link } from "wouter";

// Import the mascot images
const labTestImage = new URL('@assets/PHOTO-2025-12-01-19-51-30_1764636869315.jpg', import.meta.url).href;
const todosImage = new URL('@assets/PHOTO-2025-12-01-19-51-32_1764636869316.jpg', import.meta.url).href;
const aiFollowupsImage = new URL('@assets/PHOTO-2025-12-01-19-51-31 2_1764636869316.jpg', import.meta.url).href;
const downloadImage = new URL('@assets/PHOTO-2025-12-01-19-51-31_1764636869316.jpg', import.meta.url).href;

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
          <div className="bg-primary rounded-2xl p-6 md:p-8 text-foreground shadow-lg shadow-primary/30 transition-transform transform group-hover:scale-[1.01] relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-black/5 rounded-full -mr-16 -mt-16 blur-3xl" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Have an appointment?</h2>
                <p className="text-foreground/80 max-w-md">
                  Tap here to start recording. CareScribe will listen, transcribe, and organize your doctor's instructions automatically.
                </p>
              </div>
              <div className="w-16 h-16 bg-black/10 backdrop-blur-sm rounded-full flex items-center justify-center self-start md:self-center group-hover:bg-black/20 transition-colors">
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
            <span className="text-sm font-medium text-foreground bg-success/30 px-3 py-1 rounded-full">
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
             <button className="w-full py-3 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-foreground hover:border-success hover:text-success transition-colors font-medium hover:bg-success/5">
               <Plus className="w-5 h-5" />
               Add Past Record
             </button>
          </div>
        </div>
      </div>

      {/* Features Section with Images */}
      <section className="mt-16 pt-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-8">How CareScribe Helps</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Lab Test Reminders */}
          <div className="bg-card rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-border/50 hover:border-success/30">
            <img src={labTestImage} alt="Lab Test Reminders" className="w-full h-40 object-contain mb-4" />
            <h3 className="font-bold text-foreground">Lab Test Reminders</h3>
            <p className="text-sm text-muted-foreground mt-2">Never miss an important test or follow-up.</p>
          </div>

          {/* Daily To-Dos */}
          <div className="bg-card rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-border/50 hover:border-success/30">
            <img src={todosImage} alt="Daily To-Dos" className="w-full h-40 object-contain mb-4" />
            <h3 className="font-bold text-foreground">Daily To-Dos & Reminders</h3>
            <p className="text-sm text-muted-foreground mt-2">Smart reminders for your medications and care.</p>
          </div>

          {/* AI Follow-ups */}
          <div className="bg-card rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-border/50 hover:border-success/30">
            <img src={aiFollowupsImage} alt="AI Follow-ups" className="w-full h-40 object-contain mb-4" />
            <h3 className="font-bold text-foreground">AI Follow-ups & Answers</h3>
            <p className="text-sm text-muted-foreground mt-2">Get instant answers about your health data.</p>
          </div>

          {/* Download Summary */}
          <div className="bg-card rounded-2xl p-6 text-center hover:shadow-md transition-shadow border border-border/50 hover:border-success/30">
            <img src={downloadImage} alt="Download Summary" className="w-full h-40 object-contain mb-4" />
            <h3 className="font-bold text-foreground">Download Your Summary</h3>
            <p className="text-sm text-muted-foreground mt-2">Export your health data anytime.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
