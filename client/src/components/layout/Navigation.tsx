import { Link, useLocation } from "wouter";
import { Home, Calendar, Mic, MessageSquare, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

const logoUrl = new URL('@assets/Screenshot 2025-12-01 at 9.20.09 PM_1764642013978.png', import.meta.url).href;

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/history", icon: Calendar, label: "History" },
    { href: "/record", icon: Mic, label: "Record", isFab: true },
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/documents", icon: FileText, label: "Docs" },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex flex-col w-64 border-r bg-card h-screen fixed left-0 top-0 z-20 p-6">
        <div className="mb-10">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-3">
            <img src={logoUrl} alt="CareScribe" className="w-10 h-10 flex-shrink-0" />
            CareScribe
          </h1>
        </div>
        
        <div className="flex flex-col gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium",
                location === item.href 
                  ? "bg-primary/10 text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}>
                <item.icon className="w-5 h-5" />
                {item.label}
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-3">
           <div className="p-4 bg-muted rounded-lg">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Next Appointment</p>
              <p className="text-sm font-bold text-foreground">Dr. Emily White</p>
              <p className="text-xs text-muted-foreground mt-1">Jun 20 • 9:00 AM</p>
           </div>
           <Link href="/profile">
             <a className={cn(
               "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
               location === "/profile"
                 ? "bg-primary/10 text-primary"
                 : "text-muted-foreground hover:text-foreground"
             )}>
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
              <a className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[4rem] transition-colors rounded-lg",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )}>
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
