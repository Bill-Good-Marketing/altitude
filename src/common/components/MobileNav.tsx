'use client';

import React from "react";
import {Sheet, SheetContent, SheetTrigger} from "~/components/ui/sheet";
import {MenuIcon} from "lucide-react";
import Link from "next/link";

type MobileNavProps = {
    definition: Array<{
        link: string,
        label: string,
    } | {divider: true}>
}

export function MobileNav({definition}: MobileNavProps) {
    const [open, setOpen] = React.useState(false);

    return <Sheet onOpenChange={setOpen} open={open}>
        <SheetTrigger>
            <span className="sr-only">Open main menu</span>
            <MenuIcon aria-hidden="true" className="block h-6 w-6"/>
        </SheetTrigger>
        <SheetContent side={'top'} className={'color'}>
            {definition.map((item, index) => {
                if ('divider' in item) {
                    return <div key={index} className="border-t border-muted/10"/>
                }
                return <Link key={index} href={item.link} className="block px-4 py-2 text-lg text-gray-700 data-[focus]:bg-gray-100">
                    {item.label}
                </Link>
            })}
        </SheetContent>
    </Sheet>
}