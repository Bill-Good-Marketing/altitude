"use client"

import * as React from "react"

import { useMediaQuery } from "~/hooks/use-media-query"
import { Button } from "~/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "~/components/ui/command"
import {
    Drawer,
    DrawerContent,
    DrawerTrigger,
} from "~/components/ui/drawer"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "~/components/ui/popover"
import {useEffect} from "react";
import {cn} from "~/lib/utils";

type Option = {
    value: string
    label: string
}

type ComboBoxProps = Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onValueChange'> & {
    options: Option[]
    value?: Option | null
    onValueChange?: (value: Option | null) => void
    open?: boolean
    setOpen?: (open: boolean) => void
    placeholder?: string
    searchPlaceholder?: string
}

export function ComboBox({options, value, onValueChange, open, setOpen, placeholder, className, ...props}: ComboBoxProps) {
    const [internalOpen, setInternalOpen] = React.useState(open)
    const isDesktop = useMediaQuery("(min-width: 768px)")
    const [selectedStatus, setSelectedStatus] = React.useState<Option | null>(
        value ?? null
    )

    const handleOpenChange = (open: boolean) => {
        setInternalOpen(open)
        setOpen && setOpen(open)
    }

    const handleValueChange = (value: Option | null) => {
        setSelectedStatus(value)
        onValueChange && onValueChange(value)
    }

    useEffect(() => {
        setInternalOpen(open)
    }, [open])

    useEffect(() => {
        if (value === undefined) {
            console.warn('Should not switch from controlled to uncontrolled mode! Make sure that you are using `null` instead of `undefined` for the value prop.')
        }
        setSelectedStatus(value ?? null)
    }, [value])

    if (isDesktop) {
        return (
            <Popover open={internalOpen} onOpenChange={handleOpenChange}>
                <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start block", className)} {...props}>
                        {selectedStatus ? <>{selectedStatus.label}</> : <>{placeholder}</>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                    <ComboBoxList options={options} onValueChange={handleValueChange} searchPlaceholder={placeholder} setOpen={setOpen} />
                </PopoverContent>
            </Popover>
        )
    }

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button variant="outline" className="w-[150px] justify-start">
                    {selectedStatus ? <>{selectedStatus.label}</> : <>{placeholder}</>}
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <div className="mt-4 border-t">
                    <ComboBoxList options={options} onValueChange={handleValueChange} searchPlaceholder={placeholder} setOpen={setOpen} />
                </div>
            </DrawerContent>
        </Drawer>
    )
}

function ComboBoxList({options, onValueChange, searchPlaceholder, setOpen}: Pick<ComboBoxProps, "options" | "onValueChange" | 'searchPlaceholder' | 'setOpen'>) {
    return (
        <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                    {options.map((option) => (
                        <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(value) => {
                                onValueChange && onValueChange(options.find((option) => option.value === value) ?? null);
                                setOpen && setOpen(false)
                            }}
                        >
                            {option.label}
                        </CommandItem>
                    ))}
                </CommandGroup>
            </CommandList>
        </Command>
    )
}
