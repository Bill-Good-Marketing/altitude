import React, {HTMLAttributes, useEffect} from "react";
import {ChevronLeftIcon, ChevronRightIcon, Clock, EllipsisVertical, Plus} from "lucide-react";
import {format} from "date-fns";
import {Button} from "~/components/ui/button";
import classNames from "classnames";
import {ValidationProvider} from "~/components/data/ValidationProvider";
import ActivityDialog from "~/app/(authenticated)/activities/ActivityForm";
import {ActivityType} from "~/common/enum/enumerations";
import {
    DropdownMenu,
    DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "~/components/ui/dropdown-menu";
import {cn} from "~/lib/utils";

export function CalendarHeader({view, setView, title, headerTime, changeTime, dateChangerCaption}: {
    view: 'day' | 'week' | 'month'
    setView: (view: 'day' | 'week' | 'month') => void,
    title: React.ReactNode | null,
    headerTime: string | null,
    changeTime: (forward: boolean) => void,
    dateChangerCaption: string | null
}) {
    const [time, setTime] = React.useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date());
        // Updates every minute
        const intervalId = setInterval(() => {
            setTime(new Date());
        }, 60000);
        return () => clearInterval(intervalId);
    }, [])

    return <header
        className="flex flex-none items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {time != null && title != null && headerTime != null ? <div className="items-center space-y-2">
                <div className="hidden lg:flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-gray-500 dark:text-gray-400"/>
                    <time aria-label={'current time'}
                          dateTime={time.toISOString()}>{format(time, 'PPp')}</time>
                </div>
                <time dateTime={headerTime}>{title}</time>
            </div> : 'Loading...'}
        </h1>
        <div className="flex items-center">
            <div
                className="relative flex items-center rounded-md bg-white dark:bg-black shadow-sm md:items-stretch">
                <button
                    onClick={() => changeTime(false)}
                    type="button"
                    className="flex h-9 w-12 items-center justify-center rounded-l-md border-y border-l border-gray-300 pr-1 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:pr-0 md:hover:bg-gray-50 md:dark:hover:bg-gray-950 dark:border-gray-700 dark:text-gray-600 dark:hover:text-gray-400"
                >
                    <span className="sr-only">Previous week</span>
                    <ChevronLeftIcon className="size-5" aria-hidden="true"/>
                </button>
                <button
                    type="button"
                    className="hidden border-y border-gray-300 px-3.5 text-sm font-semibold text-gray-900 hover:bg-gray-50 focus:relative lg:block dark:border-gray-700 dark:text-gray-100  dark:hover:bg-gray-950"
                >
                    {dateChangerCaption ? dateChangerCaption : 'Loading...'}
                </button>
                <span className="relative -mx-px h-5 w-px bg-gray-300 dark:bg-gray-700 md:hidden"/>
                <button
                    onClick={() => changeTime(true)}
                    type="button"
                    className="flex h-9 w-12 items-center justify-center rounded-r-md border-y border-r border-gray-300 pl-1 text-gray-400 hover:text-gray-500 focus:relative md:w-9 md:pl-0 md:hover:bg-gray-50 md:dark:hover:bg-gray-950 dark:border-gray-700 dark:text-gray-600 dark:hover:text-gray-400"
                >
                    <span className="sr-only">Next week</span>
                    <ChevronRightIcon className="size-5" aria-hidden="true"/>
                </button>
            </div>
            <div className="hidden lg:block ml-6 h-6 w-px bg-gray-300 dark:bg-gray-700"/>
            <div className="hidden xl:ml-4 xl:flex xl:items-center">
                <Button variant={'ghost'} className={classNames("mr-2", {
                    'text-blue-300 font-bold': view === 'day'
                })} onClick={() => setView('day')}>
                    Day View
                </Button>
                <Button variant={'ghost'} className={classNames("mr-2", {
                    'text-blue-300 font-bold': view === 'week'
                })} onClick={() => setView('week')}>
                    Week View
                </Button>
                <Button variant={'ghost'} className={view === 'month' ? 'text-blue-300 font-bold' : undefined}
                        onClick={() => setView('month')}>
                    Month View
                </Button>
                <div className="hidden lg:block ml-6 h-6 w-px bg-gray-300 dark:bg-gray-700"/>
            </div>

            <div>
                <ValidationProvider>
                    <ActivityDialog
                        canChangeType={false}
                        type={ActivityType.SCHEDULED}
                        trigger={<button
                            type="button"
                            className="hidden lg:inline lg:ml-6 rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                        >
                            Schedule
                        </button>}/>
                </ValidationProvider>
                <ValidationProvider>
                    <ActivityDialog
                        canChangeType={false}
                        type={ActivityType.SCHEDULED}
                        trigger={<Button
                            variant={'ghost'}
                            size={'icon'}
                            className="mx-2 lg:hidden"
                        >
                            <Plus className="h-4 w-4"/>
                        </Button>}/>
                </ValidationProvider>
            </div>

            <div className="hidden lg:block ml-6 h-6 w-px bg-gray-300 dark:bg-gray-700"/>

            <div className={'inline xl:hidden'}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant={'ghost'} size={'icon'}>
                            <span className="sr-only">Open menu</span>
                            <EllipsisVertical className="h-5 w-5"/>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel>Calendar Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator/>
                        <DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => setView('day')}>
                                Day View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView('week')} className={'hidden md:block'}>
                                Week View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setView('month')}>
                                Month View
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    </header>
}

export function HourItem({hour, onMouseUpCapture, onMouseOverCapture}: {
    hour: number,
    onMouseUpCapture?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, hour: number, part: 'first-half' | 'second-half') => void,
    onMouseOverCapture?: (event: React.MouseEvent<HTMLDivElement, MouseEvent>, hour: number, part: 'first-half' | 'second-half') => void,
}) {
    const am = hour < 12 ? 'AM' : 'PM';
    let hourNum = hour % 12;

    if (hourNum === 0) {
        hourNum = 12;
    }

    return <>
        <div
        draggable={false}
            data-hour={hour} data-hour-part="first-half" onMouseUpCapture={(event) => {
            onMouseUpCapture && onMouseUpCapture(event, hour, 'first-half')
        }} onMouseOverCapture={(event) => {
            onMouseOverCapture && onMouseOverCapture(event, hour, 'first-half')
        }}>
            <div
                className="sticky left-0 z-20 -ml-14 -mt-2.5 w-14 pr-2 text-right text-xs/5 text-gray-400 dark:text-gray-500 select-none">
                {hourNum}{am}
            </div>
        </div>
        <div draggable={false} onMouseUpCapture={(event) => {
            onMouseUpCapture && onMouseUpCapture(event, hour, 'second-half')
        }} onMouseOverCapture={(event) => {
            onMouseOverCapture && onMouseOverCapture(event, hour, 'second-half')
        }} data-hour={hour} data-hour-part="second-half"/>
    </>
}

export function TimeSpan({start, end}: { start: Date, end: Date }) {
    return `${start.toLocaleString('default', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })} - ${end.toLocaleString('default', {hour: '2-digit', minute: '2-digit', hour12: true})}`
}

export declare type WithHeaderProps = {
    header: true,
    setView: (view: 'day' | 'week' | 'month') => void,
    setActiveSchedule: (scheduleId: string | null) => void,
}

export declare type WithoutHeaderProps = {
    header?: false,
    setView?: never,
    setActiveSchedule?: never,
}

export function GridItem({className, ...props}: HTMLAttributes<HTMLLIElement>) {
    return <li className={cn('pointer-events-auto', className)} {...props}/>
}