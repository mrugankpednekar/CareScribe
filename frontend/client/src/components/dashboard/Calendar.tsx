import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Pill,
  Calendar as CalendarIcon,
  Activity,
  TestTube,
  Dot,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarTask, EventType } from "@/lib/types";

interface CalendarProps {
  tasks: CalendarTask[];
  onEventClick?: (task: CalendarTask) => void;
}

export function Calendar({ tasks, onEventClick }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const getTasksForDate = (date: Date) => {
    return tasks.filter((task) => {
      const taskDate = new Date(task.date);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  };

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  const getFirstDayOfMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const days = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const previousMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );

  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );

  // --- ICON MAP ---
  const getTaskIcon = (type: EventType) => {
    switch (type) {
      case "medication":
        return Pill;
      case "appointment":
        return CalendarIcon;
      case "lab":
        return TestTube;
      case "activity":
        return Activity;
      case "other":
        return Dot;
      default:
        return Dot;
    }
  };

  // --- COLOR MAP ---
  const typeColors: Record<
    EventType,
    { dot: string; badgeBg: string; text: string; label: string }
  > = {
    medication: {
      dot: "bg-primary/20 text-primary",
      badgeBg: "bg-primary/10",
      text: "text-primary",
      label: "Medication",
    },
    appointment: {
      dot: "bg-secondary/20 text-secondary",
      badgeBg: "bg-secondary/10",
      text: "text-secondary",
      label: "Appointment",
    },
    lab: {
      dot: "bg-blue-500/20 text-blue-600",
      badgeBg: "bg-blue-500/10",
      text: "text-blue-600",
      label: "Lab Work",
    },
    activity: {
      dot: "bg-green-500/20 text-green-600",
      badgeBg: "bg-green-500/10",
      text: "text-green-600",
      label: "Activity",
    },
    other: {
      dot: "bg-purple-500/20 text-purple-600",
      badgeBg: "bg-purple-500/10",
      text: "text-purple-600",
      label: "Other",
    },
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        {/* Left side: < > month navigation */}
        <div className="flex items-center gap-2">
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

          <h2 className="text-xl font-bold text-foreground ml-2">
            {monthName}
          </h2>
        </div>

        {/* Right side: PLUS button */}
        <button
          onClick={() => {
            // You handle opening modal in Dashboard
            const evt = new CustomEvent("calendar-add-event");
            window.dispatchEvent(evt);
          }}
          className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 shadow"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>


      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="aspect-square" />;

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
              <span
                className={cn(
                  "text-xs font-semibold",
                  isToday ? "text-primary" : "text-foreground"
                )}
              >
                {day}
              </span>

              {dayTasks.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {dayTasks.slice(0, 3).map((task) => {
                    const IconComponent = getTaskIcon(task.type);
                    const color = typeColors[task.type].dot;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center",
                          color
                        )}
                        title={task.title}
                      >
                        <IconComponent className="w-2.5 h-2.5" />
                      </div>
                    );
                  })}

                  {dayTasks.length > 3 && (
                    <span className="text-xs text-muted-foreground font-semibold">
                      +{dayTasks.length - 3}
                    </span>
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
              {getTasksForDate(new Date(expandedDate + "T00:00:00")).map(
                (task) => {
                  const IconComponent = getTaskIcon(task.type);
                  const style = typeColors[task.type];

                  return (
                    <div
                      key={task.id}
                      onClick={() => onEventClick?.(task)}
                      className={cn(
                        "flex gap-3 p-4 rounded-lg border border-border hover:border-muted transition-all cursor-pointer",
                        style.badgeBg
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                          style.badgeBg,
                          style.text
                        )}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs font-semibold uppercase mb-1",
                            style.text
                          )}
                        >
                          {style.label}
                        </p>

                        <p className="text-sm font-medium text-foreground truncate">
                          {task.title}
                        </p>

                        {task.time && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {task.time}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                }
              )}

              {getTasksForDate(new Date(expandedDate + "T00:00:00")).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No tasks scheduled
                </p>
              )}
            </div>
          </div>
        </div>
      )
      }
    </div >
  );
}
