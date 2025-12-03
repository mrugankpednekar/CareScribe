"use client"

import * as React from "react"
import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"

interface TimePickerProps {
    value: string
    onChange: (value: string) => void
    className?: string
}

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false)

    // Parse current value (HH:mm 24h format)
    const { hours, minutes, ampm } = React.useMemo(() => {
        if (!value) return { hours: 12, minutes: 0, ampm: "AM" }
        const [h, m] = value.split(":").map(Number)
        const isPM = h >= 12
        const displayHour = h % 12 || 12
        return {
            hours: displayHour,
            minutes: m,
            ampm: isPM ? "PM" : "AM"
        }
    }, [value])

    const handleTimeChange = (type: "hour" | "minute" | "ampm", val: string) => {
        let newHour = hours
        let newMinute = minutes
        let newAmpm = ampm

        if (type === "hour") newHour = parseInt(val)
        else if (type === "minute") newMinute = parseInt(val)
        else if (type === "ampm") newAmpm = val

        // Convert back to 24h format for output
        let outputHour = newHour
        if (newAmpm === "PM" && newHour < 12) outputHour += 12
        else if (newAmpm === "AM" && newHour === 12) outputHour = 0

        const output = `${outputHour.toString().padStart(2, "0")}:${newMinute.toString().padStart(2, "0")}`
        onChange(output)
    }

    const hourOptions = Array.from({ length: 12 }, (_, i) => i + 1)
    const minuteOptions = Array.from({ length: 60 }, (_, i) => i)

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className={cn(
                        "w-full justify-start text-left font-normal h-11 px-4",
                        !value && "text-muted-foreground",
                        className
                    )}
                >
                    <Clock className="mr-2 h-4 w-4" />
                    {value ? (
                        <span>
                            {hours}:{minutes.toString().padStart(2, "0")} {ampm}
                        </span>
                    ) : (
                        <span>Pick a time</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex h-[300px] w-[300px]">
                    <div className="flex-1 flex flex-col border-r border-border">
                        <div className="flex items-center justify-center h-10 border-b border-border bg-muted/30 shrink-0">
                            <span className="text-sm font-medium">Hour</span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="flex flex-col p-2 gap-1">
                                {hourOptions.map((h) => (
                                    <Button
                                        key={h}
                                        variant={hours === h ? "default" : "ghost"}
                                        size="sm"
                                        className={cn("w-full shrink-0", hours === h && "bg-primary text-primary-foreground")}
                                        onClick={() => handleTimeChange("hour", h.toString())}
                                    >
                                        {h}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="flex-1 flex flex-col border-r border-border">
                        <div className="flex items-center justify-center h-10 border-b border-border bg-muted/30 shrink-0">
                            <span className="text-sm font-medium">Minute</span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="flex flex-col p-2 gap-1">
                                {minuteOptions.map((m) => (
                                    <Button
                                        key={m}
                                        variant={minutes === m ? "default" : "ghost"}
                                        size="sm"
                                        className={cn("w-full shrink-0", minutes === m && "bg-primary text-primary-foreground")}
                                        onClick={() => handleTimeChange("minute", m.toString())}
                                    >
                                        {m.toString().padStart(2, "0")}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-center h-10 border-b border-border bg-muted/30 shrink-0">
                            <span className="text-sm font-medium">AM/PM</span>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="flex flex-col p-2 gap-1">
                                {["AM", "PM"].map((ap) => (
                                    <Button
                                        key={ap}
                                        variant={ampm === ap ? "default" : "ghost"}
                                        size="sm"
                                        className={cn("w-full shrink-0", ampm === ap && "bg-primary text-primary-foreground")}
                                        onClick={() => handleTimeChange("ampm", ap)}
                                    >
                                        {ap}
                                    </Button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
