'use client';
import {Button} from "~/components/ui/button";
import {MoonIcon, SunIcon} from "lucide-react";
import React from "react";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "~/components/ui/tooltip";

export function DarkModeButton({darkMode: initialDarkMode}: { darkMode: boolean }) {
    const [darkMode, setDarkMode] = React.useState(initialDarkMode);

    return <TooltipProvider delayDuration={0}>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant={'ghost'} size={'icon'} className="mr-2" onClick={() => {
                    if (darkMode) {
                        document.body.classList.remove('dark');
                    } else {
                        document.body.classList.add('dark');
                    }
                    document.cookie = `theme=${!darkMode ? 'dark' : 'light'};max-age=${60 * 60 * 24 * 365 * 15};samesite=strict`;
                    setDarkMode(!darkMode);
                }}>
                    {darkMode ? <SunIcon className="h-5 w-5"/> : <MoonIcon className="h-5 w-5"/>}
                </Button>
            </TooltipTrigger>
            <TooltipContent side={'bottom'}>
                <p>{darkMode ? 'Toggle Light Mode' : 'Toggle Dark Mode'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
}