import { Navigation } from "./Navigation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      <Navigation />
      <main className="pb-24 md:pl-64 md:pb-0 min-h-screen transition-all duration-300 ease-in-out">
        <div className="max-w-5xl mx-auto p-4 md:p-8 pt-6 md:pt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
}
