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
      <nav className="hidden md:flex flex-col w-64 border-r bg-gradient-to-b from-card to-secondary/20 h-screen fixed left-0 top-0 z-20 p-4">
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent font-display flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-success rounded-lg flex items-center justify-center shadow-lg">
              <Mic className="text-foreground w-5 h-5" />
            </div>
            CareScribe
          </h1>
        </div>
        
        <div className="flex flex-col gap-2">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <a className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-medium relative overflow-hidden group",
                location === item.href 
                  ? "bg-gradient-to-r from-primary/20 to-success/20 text-primary shadow-md" 
                  : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
              )}>
                <div className="relative z-10">
                  <item.icon className={cn("w-5 h-5", location === item.href ? "stroke-[2.5px]" : "stroke-2")} />
                </div>
                <span className="relative z-10">{item.label}</span>
                {location === item.href && (
                  <div className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity" />
                )}
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-auto">
           <div className="p-4 bg-gradient-to-br from-primary to-success/60 rounded-xl mb-4 text-foreground shadow-lg shadow-primary/20">
              <p className="text-xs font-medium text-foreground/80 mb-1 uppercase tracking-wide">Next Appointment</p>
              <p className="text-sm font-bold text-foreground">Dr. Emily White</p>
              <p className="text-xs text-foreground/90 font-medium mt-1">Jun 20 • 9:00 AM</p>
           </div>
           <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-success/10 hover:text-foreground w-full font-medium transition-all duration-200">
             <User className="w-5 h-5" />
             Profile
           </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-card to-secondary/10 border-t pb-safe z-50 px-4 py-2 flex justify-between items-end shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <Link key={item.href} href={item.href}>
                <a className="relative -top-6">
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br from-primary to-success text-foreground flex items-center justify-center shadow-xl shadow-primary/40 transition-all active:scale-95 hover:shadow-2xl hover:shadow-primary/50",
                    location === item.href ? "ring-4 ring-success/20" : ""
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
                "flex flex-col items-center gap-1 p-2 min-w-[4rem] transition-all rounded-lg",
                location === item.href ? "text-primary bg-primary/5" : "text-muted-foreground hover:text-primary hover:bg-primary/5"
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
