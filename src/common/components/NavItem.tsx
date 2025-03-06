'use client';

import { usePathname } from "next/navigation";
import React from "react";

export function NavItem({path, title}: {path: string, title: string}) {
    const currentPath = usePathname();
    const current = currentPath === path || currentPath.startsWith(path + '/');
    const classes = current ? "inline-flex items-center border-b-2 border-indigo-500 px-1 pt-1 text-sm font-medium text-gray-900 dark:text-gray-100 dark:text-white" : "inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 dark:text-white hover:border-gray-300 hover:text-gray-700"

    return (
        <a
            href={path}
            className={classes}
        >
            {title}
        </a>
    )
}