import { useState } from "react";
import { Check, Pill, Calendar, Activity, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";
import { Task } from "@/lib/mockData";
import { Checkbox } from "@/components/ui/checkbox";

interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps) {
  const [checked, setChecked] = useState(task.completed);

  const getIcon = () => {
    switch (task.type) {
      case "medication": return Pill;
      case "appointment": return Calendar;
      case "lab": return TestTube;
      case "exercise": return Activity;
      default: return Activity;
    }
  };

  const Icon = getIcon();
  const typeLabel = {
    medication: "Medication",
    appointment: "Appointment",
    lab: "Lab",
    exercise: "Exercise"
  }[task.type];

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-300 group cursor-pointer hover:shadow-md",
      checked 
        ? "bg-gradient-to-r from-success/20 to-success/10 border-success/40" 
        : "bg-card border-border hover:border-primary/40 hover:bg-gradient-to-r hover:from-card hover:to-primary/5"
    )}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <Checkbox 
          checked={checked} 
          onCheckedChange={(c) => setChecked(!!c)}
          className="w-6 h-6 rounded-lg border-2 transition-all data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-success data-[state=checked]:to-success data-[state=checked]:border-success text-background"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-bold text-sm truncate transition-all",
            checked ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary"
          )}>
            {task.title}
          </p>
          <span className={cn(
            "text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full flex-shrink-0",
            task.type === "medication" ? "bg-primary/10 text-primary" :
            task.type === "appointment" ? "bg-secondary/10 text-secondary" :
            task.type === "lab" ? "bg-success/10 text-success" :
            "bg-destructive/10 text-destructive"
          )}>
            {typeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <Icon className="w-3.5 h-3.5" />
          <span className="font-medium">{task.due}</span>
        </div>
      </div>
    </div>
  );
}
