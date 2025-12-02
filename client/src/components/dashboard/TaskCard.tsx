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

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300",
      checked 
        ? "bg-success/20 border-success/20 opacity-70" 
        : "bg-card border-border/50 hover:border-success/30 hover:shadow-sm"
    )}>
      <div className="relative flex items-center justify-center">
        <Checkbox 
          checked={checked} 
          onCheckedChange={(c) => setChecked(!!c)}
          className="w-6 h-6 rounded-full border-2 data-[state=checked]:bg-success data-[state=checked]:border-success"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-medium text-sm truncate transition-all",
          checked ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Icon className="w-3 h-3" />
          <span>{task.due}</span>
        </div>
      </div>
    </div>
  );
}
