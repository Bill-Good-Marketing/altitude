import React from "react";
import {Label} from "~/components/ui/label";
import {cn} from "~/lib/utils";

export function FormField({label, children, htmlFor, required, prefix, cols = 4, grid = true, className}: {
    label: string,
    children: React.ReactNode,
    htmlFor: string,
    required?: boolean,
    prefix?: React.ReactNode,
    cols?: number,
    grid?: boolean,
    className?: string
}) {
    return <div className={cn(className, grid ? `grid grid-cols-${cols} items-center gap-4` : undefined)}>
        <Label htmlFor={htmlFor} className="text-right pt-0" aria-required={required}>
            {label}
        </Label>
        <div className={grid != null || prefix != null ? cn(grid ? `col-span-${cols - 1}` : undefined, {
            'flex items-center space-x-2': prefix != null
        }) : undefined}>
            {prefix}
            {children}
        </div>
    </div>
}
