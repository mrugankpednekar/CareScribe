import { Link, useLocation } from "wouter";
import { Home, Calendar, Mic, MessageSquare, FileText, User } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <nav className="hidden md:flex flex-col w-64 border-r bg-card h-screen fixed left-0 top-0 z-20 p-4">
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-bold text-primary font-display flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Mic className="text-foreground w-5 h-5" />
            </div>
            CareScribe
          </h1>
        </div>
        
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium",
                location === item.href 
                  ? "bg-primary/20 text-primary shadow-sm" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}>
                <item.icon className={cn("w-5 h-5", location === item.href ? "stroke-[2.5px]" : "stroke-2")} />
                {item.label}
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-auto">
           <div className="p-4 bg-secondary/50 rounded-xl mb-4">
              <p className="text-xs font-medium text-muted-foreground mb-1">Next Appointment</p>
              <p className="text-sm font-semibold text-foreground">Dr. Emily White</p>
              <p className="text-xs text-primary font-medium">Jun 20 • 9:00 AM</p>
           </div>
           <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground w-full font-medium">
             <User className="w-5 h-5" />
             Profile
           </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t pb-safe z-50 px-4 py-2 flex justify-between items-end shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <Link key={item.href} href={item.href}>
                <a className="relative -top-6">
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-primary text-foreground flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95",
                    location === item.href ? "ring-4 ring-primary/20" : ""
                  )}>
                    <Mic className="w-7 h-7" />
                  </div>
                </a>
              </Link>
            );
          }
          return (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex flex-col items-center gap-1 p-2 min-w-[4rem] transition-colors",
                location === item.href ? "text-primary" : "text-muted-foreground"
              )}>
                <item.icon className={cn("w-6 h-6", location === item.href ? "stroke-[2.5px]" : "stroke-2")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
