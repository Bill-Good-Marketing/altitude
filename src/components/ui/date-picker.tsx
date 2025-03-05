"use client";

import * as React from "react"
import {format} from "date-fns"
import {Calendar as CalendarIcon} from "lucide-react"

import {cn} from "~/lib/utils"
import {Button} from "~/components/ui/button"
import {Calendar} from "~/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger,} from "~/components/ui/popover"

export function DatePicker({date, setDate, id, className}: {date: Date | undefined, setDate: (date: Date | undefined) => void, id?: string, className?: string}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    variant={"outline"}
                    className={cn(
                        "w-full justify-start text-left font-normal disabled:cursor-not-allowed bg-background",
                        !date && "text-muted-foreground",
                        className
                    )}
                    role={'combobox'}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-auto flex-col space-y-2 p-2" index={100}>
                <div className="rounded-md border">
                    <Calendar mode="single" selected={date} onSelect={date => {
                        // Time should be set to 12 PM rather than midnight
                        if (date) {
                            date.setHours(12, 0, 0, 0)
                        }
                        setDate(date)
                    }} />
                </div>
            </PopoverContent>
        </Popover>
    )
}
