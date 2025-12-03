"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

export function DatePicker({
    date,
    setDate,
    className,
    placeholder = "Pick a date"
}: {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    className?: string
    placeholder?: string
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal h-11 px-4",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                />
            </PopoverContent>
        </Popover>
    )
}

export function DateTimePicker({
    date,
    setDate,
    className,
    placeholder = "Pick a date and time"
}: {
    date: Date | undefined
    setDate: (date: Date | undefined) => void
    className?: string
    placeholder?: string
}) {
    const [isOpen, setIsOpen] = React.useState(false);

    const handleDateSelect = (newDate: Date | undefined) => {
        if (newDate) {
            const current = date || new Date();
            newDate.setHours(current.getHours());
            newDate.setMinutes(current.getMinutes());
            setDate(newDate);
        } else {
            setDate(undefined);
        }
    }

    const handleTimeChange = (type: "hour" | "minute" | "ampm", value: string) => {
        const newDate = date ? new Date(date) : new Date();
        let hours = newDate.getHours();
        let minutes = newDate.getMinutes();

        if (type === "hour") {
            const val = parseInt(value);
            const isPM = hours >= 12;
            if (isPM && val < 12) hours = val + 12;
            else if (!isPM && val === 12) hours = 0;
            else if (!isPM) hours = val;
            else if (isPM && val === 12) hours = 12;
        } else if (type === "minute") {
            minutes = parseInt(value);
        } else if (type === "ampm") {
            if (value === "AM" && hours >= 12) hours -= 12;
            else if (value === "PM" && hours < 12) hours += 12;
        }

        newDate.setHours(hours);
        newDate.setMinutes(minutes);
        setDate(newDate);
    }

    const hours = Array.from({ length: 12 }, (_, i) => i + 1);
    const minutes = Array.from({ length: 60 }, (_, i) => i);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal h-11 px-4",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP p") : <span>{placeholder}</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex flex-col sm:flex-row h-[300px]">
                    <div className="p-3">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={handleDateSelect}
                            initialFocus
                        />
                    </div>
                    <div className="border-t sm:border-t-0 sm:border-l border-border w-full sm:w-[200px] flex flex-col">
                        <div className="flex items-center justify-center h-10 border-b border-border bg-muted/30 shrink-0">
                            <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                            <span className="text-sm font-medium">Time</span>
                        </div>
                        <div className="flex flex-1 h-full overflow-hidden">
                            <ScrollArea className="flex-1 h-full border-r border-border">
                                <div className="flex flex-col p-2 gap-1">
                                    {hours.map((h) => {
                                        const currentHour = date ? date.getHours() : 0;
                                        const displayHour = currentHour % 12 || 12;
                                        const isSelected = displayHour === h;

                                        return (
                                            <Button
                                                key={h}
                                                variant={isSelected ? "default" : "ghost"}
                                                size="sm"
                                                className={cn("w-full shrink-0", isSelected && "bg-primary text-primary-foreground")}
                                                onClick={() => handleTimeChange("hour", h.toString())}
                                            >
                                                {h}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <ScrollArea className="flex-1 h-full border-r border-border">
                                <div className="flex flex-col p-2 gap-1">
                                    {minutes.map((m) => {
                                        const currentMinute = date ? date.getMinutes() : 0;
                                        const isSelected = currentMinute === m;

                                        return (
                                            <Button
                                                key={m}
                                                variant={isSelected ? "default" : "ghost"}
                                                size="sm"
                                                className={cn("w-full shrink-0", isSelected && "bg-primary text-primary-foreground")}
                                                onClick={() => handleTimeChange("minute", m.toString())}
                                            >
                                                {m.toString().padStart(2, '0')}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                            <ScrollArea className="flex-1 h-full">
                                <div className="flex flex-col p-2 gap-1">
                                    {["AM", "PM"].map((ampm) => {
                                        const currentHour = date ? date.getHours() : 0;
                                        const isPM = currentHour >= 12;
                                        const isSelected = (ampm === "PM" && isPM) || (ampm === "AM" && !isPM);

                                        return (
                                            <Button
                                                key={ampm}
                                                variant={isSelected ? "default" : "ghost"}
                                                size="sm"
                                                className={cn("w-full shrink-0", isSelected && "bg-primary text-primary-foreground")}
                                                onClick={() => handleTimeChange("ampm", ampm)}
                                            >
                                                {ampm}
                                            </Button>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
