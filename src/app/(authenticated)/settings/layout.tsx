import {ScrollArea} from "~/components/ui/scroll-area";
import React from "react";
import {Calendar, Cog, TableProperties, Workflow} from "lucide-react";
import {SidebarItem} from "~/app/(authenticated)/settings/client";

const SettingsNav = [
    {
        icon: <Cog className="h-5 w-5"/>,
        href: '/settings',
        name: 'General'
    },
    {
        icon: <Calendar className="h-5 w-5"/>,
        href: '/settings/work-week',
        name: 'Work Week'
    },
    {
        icon: <TableProperties className="h-5 w-5"/>,
        href: '/settings/products',
        name: 'Products'
    },
    {
        icon: <Workflow className="h-5 w-5"/>,
        href: '/settings/org-structure',
        name: 'Org Chart'
    }
]

export default function SettingsLayout({children}: { children: React.ReactNode }) {
    return <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        <aside className="w-64 mr-4 bg-background border-r border-gray-200 p-4 h-full">
            <div className="mb-6">
                <ScrollArea>
                    {SettingsNav.map(item => <SidebarItem key={item.name} {...item}/>)}
                </ScrollArea>
            </div>
        </aside>
        <div className={'w-full px-4'}>
            {children}
        </div>
    </div>
}
