import { useState } from "react";
import { Layout } from "@/components/layout/Layout";
import { AppointmentCard } from "@/components/dashboard/AppointmentCard";
import { TaskCard } from "@/components/dashboard/TaskCard";
import { Calendar } from "@/components/dashboard/Calendar";
import { mockTasks } from "@/lib/mockData";
import { Mic, Plus, ChevronRight } from "lucide-react";
import { Link } from "wouter";
import { useAppointments } from "@/context/AppointmentsContext";

// Import illustrations (transparent PNG versions)
const recordingIllustration = new URL('@assets/image_1764639118210.png', import.meta.url).href;
const tasksIllustration = new URL('@assets/image_1764639012729.png', import.meta.url).href;
const medicationsIllustration = new URL('@assets/image_1764639028767.png', import.meta.url).href;
const historyIllustration = new URL('@assets/image_1764639172491.png', import.meta.url).href;

export default function Dashboard() {
  const { appointments } = useAppointments();
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const completedCount = mockTasks.filter(t => t.completed).length;
  const totalCount = mockTasks.length;

  // Create calendar tasks from appointments and today's tasks
  const sortedAppointments = [...appointments].sort(
    (a, b) =>
      new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()
  );

  const calendarTasks = [
    ...appointments.filter(apt => apt.date).map(apt => ({
      id: `apt-${apt.id}`,
      date: new Date(apt.date!),
      title: `${apt.doctor} - ${apt.specialty}`,
      type: "appointment" as const,
      time: new Date(apt.date!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    })),
    // Add today's tasks to today's date
    ...mockTasks.slice(0, 3).map((task, idx) => ({
      id: `task-${idx}`,
      date: today,
      title: task.title,
      type: task.type,
      time: task.due,
    })),
  ];

  return (
    <Layout>
      {/* Header */}
      <header className="mb-16">
        <p className="text-foreground text-3xl font-semibold leading-tight">{greeting}, Alex</p>
      </header>

      {/* Record CTA spans full width */}
      <Link href="/record">
        <a className="block group mb-12">
          <div className="bg-primary text-primary-foreground rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Record an appointment</h2>
                <p className="text-primary-foreground/90 text-base leading-relaxed">
                  Capture the conversation in real time and we’ll transcribe and organize everything.
                </p>
              </div>
              <div className="shrink-0 w-14 h-14 bg-primary-foreground/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
            </div>
          </div>
        </a>
      </Link>

      {/* Calendar + Daily Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Calendar tasks={calendarTasks} />
        </div>

        {/* Daily Checklist */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">Daily Checklist</h2>
            <p className="text-muted-foreground text-sm">{completedCount} of {totalCount} completed</p>
          </div>
          
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {mockTasks.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Visits */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Recent Visits</h2>
          <Link href="/history">
            <a className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
              All <ChevronRight className="w-4 h-4" />
            </a>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedAppointments.slice(0, 4).map(apt => (
            <AppointmentCard key={apt.id} appointment={apt} compact />
          ))}
        </div>

        <button className="w-full mt-4 py-3 border-2 border-dashed border-muted rounded-lg flex items-center justify-center gap-2 text-foreground hover:border-primary hover:bg-primary/5 transition-all font-semibold">
          <Plus className="w-5 h-5" />
          Add Record
        </button>
      </div>

      {/* Features Section */}
      <section className="pt-12 border-t border-border">
        <h2 className="text-2xl font-bold text-foreground mb-8">What CareScribe Does</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {[
            { img: recordingIllustration, title: "Record & Transcribe", desc: "Capture your appointments with AI. We'll transcribe everything and organize diagnoses, medications, and instructions automatically." },
            { img: tasksIllustration, title: "Daily Tasks & Reminders", desc: "Never miss a medication, appointment, or follow-up. Get organized reminders for everything from your health plan." },
            { img: medicationsIllustration, title: "Medication Tracking", desc: "Keep all your prescriptions in one place. Track doses, refills, and side effects with gentle reminders." },
            { img: historyIllustration, title: "Track Medical History", desc: "Build your complete health story in one place. Search past visits, symptoms, and treatments anytime you need them." },
          ].map((feature, i) => (
            <div key={i} className="bg-card rounded-lg p-8 border border-border hover:border-muted transition-colors flex flex-col items-center md:items-start text-center md:text-left">
              <div className="w-full h-56 mb-6 flex items-center justify-center">
                <img 
                  src={feature.img} 
                  alt={feature.title} 
                  className="w-full h-full object-contain"
                />
              </div>
              <h3 className="font-bold text-foreground text-lg">{feature.title}</h3>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}
