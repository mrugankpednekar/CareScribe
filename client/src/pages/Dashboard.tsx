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
  const completedCount = mockTasks.filter(t => t.completed).length;
  const totalCount = mockTasks.length;

  return (
    <Layout>
      {/* Header */}
      <header className="mb-12">
        <p className="text-muted-foreground text-sm font-medium mb-2">{greeting}, Alex</p>
        <h1 className="text-4xl md:text-5xl font-bold text-foreground">Your Health</h1>
      </header>

      {/* Quick Action - Record */}
      <Link href="/record">
        <a className="block mb-12 group">
          <div className="bg-primary text-primary-foreground rounded-2xl p-8 md:p-10 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold mb-3">Have an appointment?</h2>
                <p className="text-primary-foreground/90 max-w-md text-lg leading-relaxed">
                  Start recording. We'll transcribe and organize everything for you.
                </p>
              </div>
              <div className="flex-shrink-0 w-16 h-16 bg-primary-foreground/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mic className="w-8 h-8" />
              </div>
            </div>
          </div>
        </a>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Today's Tasks */}
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Today's Tasks</h2>
            <p className="text-muted-foreground text-sm">{completedCount} of {totalCount} completed</p>
          </div>
          
          <div className="space-y-3">
            {mockTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>

        {/* Recent Visits */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Recent Visits</h2>
            <Link href="/history">
              <a className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                All <ChevronRight className="w-4 h-4" />
              </a>
            </Link>
          </div>

          <div className="space-y-3">
            {mockAppointments.slice(0, 2).map(apt => (
              <AppointmentCard key={apt.id} appointment={apt} compact />
            ))}
          </div>

          <button className="w-full py-3 border-2 border-dashed border-muted rounded-lg flex items-center justify-center gap-2 text-foreground hover:border-primary hover:bg-primary/5 transition-all font-semibold">
            <Plus className="w-5 h-5" />
            Add Record
          </button>
        </div>
      </div>

      {/* Features Section */}
      <section className="mt-16 pt-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-8">What CareScribe Does</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { img: labTestImage, title: "Lab Reminders", desc: "Never miss a test" },
            { img: todosImage, title: "Daily Tasks", desc: "Medication & care reminders" },
            { img: aiFollowupsImage, title: "Ask Questions", desc: "Get instant answers" },
            { img: downloadImage, title: "Export Data", desc: "Share your records" },
          ].map((feature, i) => (
            <div key={i} className="bg-card rounded-lg p-6 text-center border border-border hover:border-muted transition-colors">
              <img src={feature.img} alt={feature.title} className="w-full h-32 object-contain mb-4" />
              <h3 className="font-bold text-foreground text-base">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
