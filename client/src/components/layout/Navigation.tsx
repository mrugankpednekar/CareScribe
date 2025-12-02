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
      <nav className="hidden md:flex flex-col w-64 border-r bg-gradient-to-b from-card to-primary/5 h-screen fixed left-0 top-0 z-20 p-4">
        <div className="mb-8 px-4">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent font-display flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg text-white">
              <Mic className="w-5 h-5" />
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
                  ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary shadow-md border border-primary/10" 
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary border border-transparent"
              )}>
                <div className="relative z-10">
                  <item.icon className={cn("w-5 h-5", location === item.href ? "stroke-[2.5px]" : "stroke-2")} />
                </div>
                <span className="relative z-10">{item.label}</span>
              </a>
            </Link>
          ))}
        </div>

        <div className="mt-auto space-y-3">
           <div className="p-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl border border-primary/20">
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">📅 Next Appointment</p>
              <p className="text-sm font-bold text-foreground">Dr. Emily White</p>
              <p className="text-xs text-muted-foreground mt-1">Jun 20 • 9:00 AM</p>
           </div>
           <button className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary w-full font-medium transition-all duration-200 border border-transparent hover:border-primary/20">
             <User className="w-5 h-5" />
             Profile
           </button>
        </div>
      </nav>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-card to-primary/5 border-t pb-safe z-50 px-4 py-2 flex justify-between items-end shadow-[0_-8px_32px_rgba(0,0,0,0.08)]">
        {navItems.map((item) => {
          if (item.isFab) {
            return (
              <Link key={item.href} href={item.href}>
                <a className="relative -top-6">
                  <div className={cn(
                    "w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/40 transition-all active:scale-95 hover:shadow-2xl hover:shadow-primary/50 border-4 border-background",
                    location === item.href ? "ring-4 ring-secondary/30" : ""
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
                location === item.href ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground hover:text-primary hover:bg-primary/5 border border-transparent"
              )}>
                <item.icon className={cn("w-6 h-6", location === item.href ? "stroke-[2.5px]" : "stroke-2")} />
                <span className="text-[10px] font-bold">{item.label}</span>
              </a>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
