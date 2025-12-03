import { Link, useLocation } from "wouter";
import { Home, Calendar, Mic, MessageSquare, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppointments } from "@/context/AppointmentsContext";

const logoUrl = new URL('@assets/WhatsApp Image 2025-12-01 at 21.35.04_1764643461369.jpeg', import.meta.url).href;

export function Navigation() {
  const [location] = useLocation();
  const { appointments } = useAppointments();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/history", icon: Calendar, label: "Appointments" },
    { href: "/record", icon: Mic, label: "Record", isFab: true },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/documents", icon: FileText, label: "Docs" },
  ];

  const now = new Date();

  const upcoming = appointments
    .filter((apt) => apt.date && new Date(apt.date) >= now)
    .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());

  const past = appointments
    .filter((apt) => apt.date && new Date(apt.date) < now)
    .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());

  const nextApt = upcoming[0] || null;
  const recentApt = past[0] || null;

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 border-r bg-card h-screen fixed left-0 top-0 z-20 p-6">
        
        {/* Logo */}
        <div
          className="mb-12 cursor-pointer"
          onClick={() => (window.location.href = "/")}
        >
          <img src={logoUrl} alt="CareScribe" className="h-32 w-full object-contain" />
        </div>

        {/* Nav Items */}
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                  location === item.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            </Link>
          ))}
        </div>

        {/* Appointment Card */}
        <div className="mt-auto space-y-3">

          {/* Case 1: Next upcoming appointment */}
          {nextApt && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                Next appointment
              </p>
              <p className="text-sm font-bold text-foreground">{nextApt.doctor}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {nextApt.date
                  ? new Date(nextApt.date).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : "Date not available"}
              </p>
            </div>
          )}

          {/* Case 2: No upcoming, but a recent appointment exists */}
          {!nextApt && recentApt && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                No upcoming appointments
              </p>
              <p className="text-sm font-bold text-foreground">
                Most recent: {recentApt.doctor}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {recentApt.date && new Date(recentApt.date).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {/* Case 3: No appointments at all */}
          {!nextApt && !recentApt && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                No appointments yet
              </p>
              <p className="text-sm text-muted-foreground">
                Start by recording or adding an appointment.
              </p>
            </div>
          )}

          {/* Profile Link */}
          <Link href="/profile">
            <a
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                location === "/profile"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <User className="w-5 h-5" />
              Profile
            </a>
          </Link>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t pb-safe z-50 px-4 py-3 flex justify-between items-end shadow-sm">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <Link key={item.href} href={item.href}>
                <a className="relative -top-6">
                  <div className="w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg transition-all active:scale-95">
                    <Mic className="w-7 h-7" />
                  </div>
                </a>
              </Link>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <a
                className={cn(
                  "flex flex-col items-center gap-1 p-2 min-w-[4rem] transition-colors rounded-lg",
                  location === item.href ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
