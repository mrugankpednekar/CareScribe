import { Layout } from "@/components/layout/Layout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { mockAppointments, mockTasks } from "@/lib/mockData";
import { Mic, Plus, ChevronRight, Sparkles } from "lucide-react";
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
        <p className="text-muted-foreground font-medium mb-1 text-sm uppercase tracking-wide">{greeting}, Alex</p>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Your Health Overview</h1>
      </header>

      {/* Quick Action - Record */}
      <Link href="/record">
        <a className="block mb-10 group">
          <div className="relative overflow-hidden rounded-2xl shadow-xl transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-success/40 to-primary/60" />
            <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
            <div className="relative z-10 p-6 md:p-8 text-foreground">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-5 h-5 text-success" />
                    <span className="text-xs font-bold uppercase tracking-widest text-foreground/80">AI Recording</span>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold mb-2">Have an appointment?</h2>
                  <p className="text-foreground/80 max-w-md leading-relaxed">
                    Tap here to start recording. CareScribe will listen, transcribe, and organize your doctor's instructions automatically.
                  </p>
                </div>
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center self-start md:self-center group-hover:bg-white/30 transition-all group-hover:scale-110 shadow-lg">
                  <Mic className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </a>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Today's Plan</h2>
            <span className="text-sm font-bold text-foreground bg-gradient-to-r from-success/30 to-success/20 px-3 py-1 rounded-full border border-success/20">
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
            <h2 className="text-2xl font-bold text-foreground">Recent Visits</h2>
            <Link href="/history">
              <a className="text-sm font-bold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
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
             <button className="w-full py-3 border-2 border-dashed border-success/50 rounded-xl flex items-center justify-center gap-2 text-foreground hover:border-success hover:text-success hover:bg-success/5 transition-all duration-200 font-bold group">
               <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
               Add Past Record
             </button>
          </div>
        </div>
      </div>

      {/* Features Section with Images */}
      <section className="mt-16 pt-12 border-t border-border">
        <h2 className="text-3xl font-bold text-foreground mb-8">How CareScribe Helps</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Lab Test Reminders */}
          <div className="group bg-card rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-success/30 hover:-translate-y-2 cursor-pointer">
            <div className="mb-4 transition-transform group-hover:scale-110">
              <img src={labTestImage} alt="Lab Test Reminders" className="w-full h-40 object-contain" />
            </div>
            <h3 className="font-bold text-foreground text-lg">Lab Test Reminders</h3>
            <p className="text-sm text-muted-foreground mt-2">Never miss an important test or follow-up.</p>
          </div>

          {/* Daily To-Dos */}
          <div className="group bg-card rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-success/30 hover:-translate-y-2 cursor-pointer">
            <div className="mb-4 transition-transform group-hover:scale-110">
              <img src={todosImage} alt="Daily To-Dos" className="w-full h-40 object-contain" />
            </div>
            <h3 className="font-bold text-foreground text-lg">Daily To-Dos & Reminders</h3>
            <p className="text-sm text-muted-foreground mt-2">Smart reminders for your medications and care.</p>
          </div>

          {/* AI Follow-ups */}
          <div className="group bg-card rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-success/30 hover:-translate-y-2 cursor-pointer">
            <div className="mb-4 transition-transform group-hover:scale-110">
              <img src={aiFollowupsImage} alt="AI Follow-ups" className="w-full h-40 object-contain" />
            </div>
            <h3 className="font-bold text-foreground text-lg">AI Follow-ups & Answers</h3>
            <p className="text-sm text-muted-foreground mt-2">Get instant answers about your health data.</p>
          </div>

          {/* Download Summary */}
          <div className="group bg-card rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300 border border-border/50 hover:border-success/30 hover:-translate-y-2 cursor-pointer">
            <div className="mb-4 transition-transform group-hover:scale-110">
              <img src={downloadImage} alt="Download Summary" className="w-full h-40 object-contain" />
            </div>
            <h3 className="font-bold text-foreground text-lg">Download Your Summary</h3>
            <p className="text-sm text-muted-foreground mt-2">Export your health data anytime.</p>
          </div>
        </div>
      </section>
    </Layout>
  );
}
