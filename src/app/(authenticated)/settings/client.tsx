'use client';

import React from "react";
import {usePathname} from "next/navigation";

export function SidebarItem({icon, href, name}: { icon?: React.ReactNode, href: string, name: string }) {
    const url = usePathname();
    const active = url === href;

    return <a href={href}>
        <div className={'w-full mb-2'}>
            <div
                className={`flex items-center space-x-3 p-4 rounded-lg cursor-pointer ${
                    active ? 'bg-primary text-white dark:bg-zinc-900' :
                        'hover:bg-gray-200 dark:hover:bg-zinc-900'
                }`}
            >
                {icon}
                <p className="font-medium dark:text-gray-100">{name}</p>
            </div>
        </div>
    </a>
}