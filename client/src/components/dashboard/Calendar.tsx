import { useState } from "react";
import { ChevronLeft, ChevronRight, Pill, Calendar as CalendarIcon, Activity, TestTube } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarTask {
  id: string;
  date: Date;
  title: string;
  type: "medication" | "appointment" | "lab" | "exercise";
  time?: string;
}

interface CalendarProps {
  tasks: CalendarTask[];
}

export function Calendar({ tasks }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.date);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case "medication": return Pill;
      case "appointment": return CalendarIcon;
      case "lab": return TestTube;
      case "exercise": return Activity;
      default: return Activity;
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">{monthName}</h2>
        <div className="flex gap-2">
          <button
            onClick={previousMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div key={day} className="text-center text-xs font-semibold text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map((day, idx) => {
          if (!day) {
            return <div key={`empty-${idx}`} className="aspect-square" />;
          }

          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateStr = date.toISOString().split("T")[0];
          const dayTasks = getTasksForDate(date);
          const isExpanded = expandedDate === dateStr;
          const isToday =
            day === new Date().getDate() &&
            currentDate.getMonth() === new Date().getMonth() &&
            currentDate.getFullYear() === new Date().getFullYear();

          return (
            <div
              key={day}
              className={cn(
                "aspect-square rounded-lg border-2 transition-all cursor-pointer flex flex-col items-start justify-start p-2",
                isExpanded ? "border-primary bg-primary/5" : "border-border hover:border-muted",
                isToday && "ring-2 ring-primary/30"
              )}
              onClick={() => setExpandedDate(isExpanded ? null : dateStr)}
            >
              <span className={cn("text-xs font-semibold", isToday ? "text-primary" : "text-foreground")}>
                {day}
              </span>
              {dayTasks.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {dayTasks.slice(0, 2).map(task => {
                    const IconComponent = getTaskIcon(task.type);
                    return (
                      <div key={task.id} className="w-3 h-3 rounded-full bg-secondary flex items-center justify-center" title={task.title}>
                        {/* Dot indicator */}
                      </div>
                    );
                  })}
                  {dayTasks.length > 2 && (
                    <span className="text-xs text-muted-foreground">+{dayTasks.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Expanded Day View */}
      {expandedDate && (
        <div className="border-t border-border pt-4">
          <div className="mb-4">
            <h3 className="font-bold text-foreground mb-3">
              {new Date(expandedDate + "T00:00:00").toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
              })}
            </h3>

            <div className="space-y-2">
              {getTasksForDate(new Date(expandedDate + "T00:00:00")).map(task => {
                const IconComponent = getTaskIcon(task.type);
                return (
                  <div
                    key={task.id}
                    className="flex gap-3 p-3 rounded-lg bg-muted hover:bg-muted/70 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center flex-shrink-0">
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                      {task.time && (
                        <p className="text-xs text-muted-foreground">{task.time}</p>
                      )}
                    </div>
                  </div>
                );
              })}
              {getTasksForDate(new Date(expandedDate + "T00:00:00")).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No tasks scheduled</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
