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
      "flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 group cursor-pointer hover:shadow-md",
      checked 
        ? "bg-gradient-to-r from-success/20 to-success/10 border-success/30" 
        : "bg-card border-border/50 hover:border-success/40 hover:bg-gradient-to-r hover:from-card hover:to-success/5"
    )}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        <Checkbox 
          checked={checked} 
          onCheckedChange={(c) => setChecked(!!c)}
          className="w-6 h-6 rounded-full border-2 transition-all data-[state=checked]:bg-gradient-to-br data-[state=checked]:from-primary data-[state=checked]:to-success data-[state=checked]:border-success"
        />
      </div>
      
      <div className="flex-1 min-w-0">
        <p className={cn(
          "font-bold text-sm truncate transition-all",
          checked ? "text-muted-foreground line-through" : "text-foreground group-hover:text-primary"
        )}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <Icon className="w-3 h-3 text-success" />
          <span>{task.due}</span>
        </div>
      </div>
    </div>
  );
}
