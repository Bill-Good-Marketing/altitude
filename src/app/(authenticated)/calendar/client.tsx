'use client';

import React, {useEffect, useRef, useState} from "react";
import {Edit, Loader2, Trash2, X} from "lucide-react";
import classNames from "classnames";
import './page.css'
import {useQuery, useQueryClient} from "@tanstack/react-query";
import {handleServerAction} from "~/util/api/client/APIClient";
import {fetchEvents, getTasks} from "~/app/(authenticated)/calendar/Actions";
import {
    ActivityPriority,
    ActivityStatus,
    ActivityType,
    TaskParents,
    TaskScheduleSubtypeToParent,
    TaskScheduleType,
    TaskScheduleTypeNameMapping
} from "~/common/enum/enumerations";
import {deleteActivity, getActivity} from "~/app/(authenticated)/activities/Actions";
import {ValidationProvider} from "~/components/data/ValidationProvider";
import {Card, CardContent, CardHeader} from "~/components/ui/card";
import {Skeleton} from "~/components/ui/skeleton";
import {format} from "date-fns";
import {Button} from "~/components/ui/button";
import {Input} from "~/components/ui/input";
import {Checkbox} from "~/components/ui/checkbox";
import {Label} from "~/components/ui/label";
import {useConfirmation} from "~/hooks/use-confirmation";
import {useMediaQuery} from "~/hooks/use-media-query";
import ActivityDialog from "~/app/(authenticated)/activities/ActivityForm";
import {areDatesEqual} from "~/util/time/date";
import {DayCalendar} from "~/app/(authenticated)/calendar/calendars/Day";
import {WeekCalendar} from "~/app/(authenticated)/calendar/calendars/Week";
import {CalendarHeader, GridItem, TimeSpan} from "~/app/(authenticated)/calendar/calendars/common";
import {Calendar} from "~/components/ui/calendar";
import {DayPickerDefaultProps} from "react-day-picker";

const CALENDAR_HOUR_START = 8;

const ColorMapping: Record<TaskParents, { parent: string, title: string, time: string }> = {
    [TaskScheduleType.TASK]: {
        parent: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900 dark:hover:bg-indigo-800',
        title: 'text-indigo-700 dark:text-indigo-300',
        time: 'text-indigo-500 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-400',
    },
    [TaskScheduleType.COMMUNICATION]: {
        //green
        parent: 'bg-green-50 hover:bg-green-100 dark:bg-green-900 dark:hover:bg-green-800',
        title: 'text-green-700 dark:text-green-300',
        time: 'text-green-500 dark:text-green-400 group-hover:text-green-700 dark:group-hover:text-green-400',
    },
    [TaskScheduleType.MEETING]: {
        // rose
        parent: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-900 dark:hover:bg-rose-800',
        title: 'text-rose-700 dark:text-rose-300',
        time: 'text-rose-500 dark:text-rose-400 group-hover:text-rose-700 dark:group-hover:text-rose-400',
    },
    [TaskScheduleType.FINANCIAL_PLANNING]: {
        parent: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900 dark:hover:bg-amber-800',
        title: 'text-amber-700 dark:text-amber-300',
        time: 'text-amber-500 dark:text-amber-400 group-hover:text-amber-700 dark:group-hover:text-amber-400',
    },
    [TaskScheduleType.HOLD]: {
        parent: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-900 dark:hover:bg-teal-800',
        title: 'text-teal-700 dark:text-teal-300',
        time: 'text-teal-500 dark:text-teal-400 group-hover:text-teal-700 dark:group-hover:text-teal-400',
    }
}

export default function CalendarView() {
    const [view, setView] = React.useState<'day' | 'week' | 'month'>('week');

    const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(undefined); // For day view
    const [month, setMonth] = React.useState<number | undefined>(undefined); // For month AND week views
    const [week, setWeek] = React.useState<number | undefined>(undefined); // Start and end dates of the week
    const [year, setYear] = React.useState<number | undefined>(undefined);

    const [sidePanelOpen, setSidePanelOpen] = React.useState(true);
    const [activeSchedule, setActiveSchedule] = React.useState<string | null>(null);
    const [editingSchedule, setEditingSchedule] = React.useState<string | null>(null);
    const queryClient = useQueryClient();

    const isTablet = useMediaQuery('(max-width: 768px)');

    useEffect(() => {
        const today = new Date();
        setMonth(today.getMonth());

        const weekStartOffset = today.getDay();

        const weekStart = today.getDate() - weekStartOffset; // Monday of that week
        setWeek(weekStart);
        setYear(today.getFullYear());
        setSelectedDate(today);
    }, [])

    useEffect(() => {
        setActiveSchedule(null);
    }, [view])

    const changeWeek = (prev: number | undefined, forward: boolean) => {
        if (prev == null || year == null || month == null) {
            const today = new Date();
            setMonth(today.getMonth());

            const weekStartOffset = today.getDay();

            const weekStart = today.getDate() - weekStartOffset; // Monday of that week
            setWeek(weekStart);
            setYear(today.getFullYear());
            setSelectedDate(today);
            return;
        }

        if (forward) {
            const date = new Date(year, month, prev + 7);

            setMonth(date.getMonth());
            setYear(date.getFullYear());
            setWeek(date.getDate());
            setSelectedDate(date);
        } else {
            const date = new Date(year, month, prev - 7);
            setMonth(date.getMonth());
            setYear(date.getFullYear());
            setWeek(date.getDate());
            setSelectedDate(date);
        }
    }

    const changeDay = (forward: boolean) => {
        if (selectedDate == null) {
            setSelectedDate(new Date());
            return;
        }
        const date = new Date(selectedDate);
        if (forward) {
            date.setDate(date.getDate() + 1);
        } else {
            date.setDate(date.getDate() - 1);
        }
        const weekStartOffset = date.getDay();
        setWeek(date.getDate() - weekStartOffset);
        setYear(date.getFullYear());
        setMonth(date.getMonth());
        setSelectedDate(date);
    }

    const {
        data: scheduleData,
        isLoading: isScheduleLoading,
        error: scheduleError
    } = useQuery({
        queryKey: ['calendar-schedule', activeSchedule],
        queryFn: async () => {
            if (activeSchedule == null) {
                throw new Error('No schedule item selected');
            }

            const result = handleServerAction(await getActivity(activeSchedule, true));
            if (!result.success) {
                throw new Error(`Error reading task: ${result.message}`);
            }

            const activity = result.result

            if (activity == null) {
                if (result.message != null) {
                    throw new Error(`Error reading schedule item: ${result.message}`);
                } else {
                    throw new Error(`Error reading schedule item`);
                }
            }

            return activity;
        },
        enabled: activeSchedule != null
    })

    const {confirm, confirmation} = useConfirmation();

    useEffect(() => {
        if (activeSchedule != null) {
            setSidePanelOpen(true);
        }
    }, [activeSchedule])

    const changeMonth = (forward: boolean) => {
        if (month == null) {
            return;
        }

        const date = new Date(year!, month + (forward ? 1 : -1), 1);
        setSelectedDate(date);

        const weekStartOffset = date.getDay();
        setWeek(date.getDate() - weekStartOffset);

        setMonth(date.getMonth());
        setYear(date.getFullYear());
    }

    const setDay = (day: Date) => {
        setSelectedDate(day);
        const weekStartOffset = day.getDay();
        setWeek(day.getDate() - weekStartOffset)
        setMonth(day.getMonth());
        setYear(day.getFullYear());
        setView('day');
    }

    const BaseCalendarProps: DayPickerDefaultProps = {
        onDayClick: (day) => {
            switch (view) {
                case 'day':
                    setDay(day);
                    break;

                case 'week':
                    setSelectedDate(day);
                    setWeek(day.getDate() - day.getDay());
                    setMonth(day.getMonth());
                    setYear(day.getFullYear());
                    break;

                case 'month':
                    setSelectedDate(day);
                    setWeek(day.getDate() - day.getDay());
                    setMonth(day.getMonth());
                    setYear(day.getFullYear());
                    break;
            }
        },
        onMonthChange: (month) => {
            if (view === 'month') {
                setMonth(month.getMonth());
            }
        },
        today: selectedDate ?? new Date(),
    }

    return <div className={'flex w-full'}>
        {confirmation}
        <div
            className={`w-[100vw] lg:w-[25vw] 3xl:w-[15vw] border-r bg-gray-50 dark:bg-neutral-900 transition-all duration-300 ${sidePanelOpen != null ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="p-4">
                {sidePanelOpen && <Card className="mb-4 overflow-hidden">
                    <CardHeader className="p-4">
                        <div className={'lg:hidden flex items-center justify-end'}>
                            <Button variant={'ghost'} onClick={() => setSidePanelOpen(false)}>
                                <X className="h-5 w-5"/>
                            </Button>
                        </div>
                        {/*<CardTitle className="hidden lg:block text-lg break-words">{scheduleData.title}</CardTitle>*/}
                    </CardHeader>
                    <CardContent className="p-4">
                        <div className={'flex justify-center items-center'}>
                            {view === 'day' &&
                                <Calendar
                                    {...BaseCalendarProps}
                                    mode={'single'}
                                    selected={selectedDate}
                                />}
                            {(view === 'week' && week != null && month != null && year != null) &&
                                <Calendar
                                    {...BaseCalendarProps}
                                    mode={'range'}
                                    selected={{
                                        from: new Date(year, month, week),
                                        to: new Date(year, month, week + 6)
                                    }}
                                />}

                            {(view === 'month') && <Calendar
                                {...BaseCalendarProps}
                            />}
                        </div>

                        {scheduleData != null && (<>
                            <h3 className={'text-lg break-words max-w-4/5'}>{scheduleData.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                                {format(scheduleData.startDate!, "PPPPpp")} - {format(scheduleData.endDate!, 'pp')}
                            </p>
                            <p className="text-sm mb-2"><span
                                className="font-medium">Type:</span>
                                {TaskScheduleTypeNameMapping[scheduleData.subType!]}
                            </p>
                            <div className="text-sm mb-2">
                                <span className="font-medium">Contacts:</span>
                                <ul className="list-disc pl-5">
                                    {scheduleData.contacts.map(member => (
                                        <li key={member.guid}>
                                            <a href={`/contacts/${member.guid}`}
                                               className={'font-medium text-gray-900 dark:text-gray-100 underline hover:no-underline hover:text-link-blue'}>{member.fullName}</a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="text-sm mb-2">
                                <span className="font-medium">Team Members:</span>
                                <ul className="list-disc pl-5">
                                    {scheduleData.users.map(member => (
                                        <li key={member.guid}>
                                            {member.fullName}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <p className="text-sm mb-2"><span
                                className="font-medium">Description:</span>
                                {scheduleData.description}</p>
                            <p className="text-sm">
                                <span className="font-medium">Notes:</span>
                            </p>
                            <div className="text-sm mb-2">
                                {scheduleData.notes!.length > 0 && <ul className="list-disc pl-5">
                                    {scheduleData.notes!.map(note => (
                                        <li key={note.guid} className={'whitespace-pre-line'}>
                                            <span
                                                className="font-medium">{note.author} ({format(note.createdAt, 'PPpp')})</span>
                                            : {note.content}
                                        </li>
                                    ))}
                                </ul>}
                                {scheduleData.notes!.length === 0 && <span className="font-medium">No notes</span>}
                            </div>
                            <div className="flex justify-end mt-4">
                                <ValidationProvider>
                                    <ActivityDialog trigger={
                                        <Button variant="linkHover2" size="sm" className="force-border mr-2">
                                            <Edit className="mr-2 h-4 w-4"/> Edit
                                        </Button>
                                    } activity={scheduleData} onSuccess={async (activity) => {
                                        await queryClient.invalidateQueries({
                                            queryKey: ['calendar-schedule', activity.guid],
                                        })
                                    }} type={ActivityType.SCHEDULED} canChangeType={false}/>
                                </ValidationProvider>
                                <Button variant="destructive" size="sm"
                                        onClick={() => {
                                            confirm(`Are you sure you want to delete this schedule item?`, async () => {
                                                const result = handleServerAction(await deleteActivity(scheduleData.guid!));
                                                if (result.success) {
                                                    setActiveSchedule(null);
                                                    await queryClient.invalidateQueries({
                                                        queryKey: ['calendar'],
                                                    })
                                                }
                                            })
                                        }}>
                                    <Trash2 className="mr-2 h-4 w-4"/> Delete
                                </Button>
                            </div>
                        </>)}
                    </CardContent>
                </Card>}
                {isScheduleLoading && <Card>
                    <CardHeader className="p-4">
                        <Skeleton className={'h-4 w-full'}/>
                    </CardHeader>
                    <CardContent className="p-4">
                        <Skeleton className={'h-4 w-full'}/>
                        <Skeleton className={'h-4 w-1/2'}/>

                        <span className="font-medium">Type:</span>
                        <Skeleton className={'h-4 w-full'}/>
                        <br/>
                        <span className="font-medium">Status:</span>
                        <Skeleton className={'h-4 w-full'}/>
                        <div className="text-sm mb-2">
                            <span className="font-medium">Contacts:</span>
                            <ul className="list-disc pl-5">
                                <li>
                                    <Skeleton className={'h-4 w-full'}/>
                                </li>
                                <li>
                                    <Skeleton className={'h-4 w-full'}/>
                                </li>
                            </ul>
                        </div>
                        <div className="text-sm mb-2">
                            <span className="font-medium">Team Members:</span>
                            <ul className="list-disc pl-5">
                                <li><Skeleton className={'h-4 w-full'}/></li>
                                <li><Skeleton className={'h-4 w-full'}/></li>
                            </ul>
                        </div>
                        <div className="text-sm mb-2"><span
                            className="font-medium">Description:</span>
                            <Skeleton className={'h-4 w-full'}/>
                        </div>
                        <div className="text-sm">
                            <span className="font-medium">Notes:</span>
                            <br/>
                            <Skeleton className={'h-16 w-full'}/>
                        </div>
                    </CardContent>
                </Card>}
                {scheduleError &&
                    <div className="text-red-500">Error loading schedule: {(scheduleError as Error).message}</div>}
            </div>
        </div>

        {(view === 'day' || (view === 'week' && isTablet)) &&
            <CalendarDayView
                sidePanelOpen={sidePanelOpen}
                setView={setView} changeDay={changeDay}
                setEditingSchedule={setEditingSchedule}
                day={selectedDate ?? null} setDay={setDay}
                setActiveSchedule={setActiveSchedule}/>}

        {(view === 'week' && !isTablet) &&
            <CalendarWeekView week={week ?? 0} month={month ?? 0} year={year ?? 0} setView={setView}
                              changeWeek={(forward) => {
                                  changeWeek(week, forward);
                              }}
                              setEditingSchedule={setEditingSchedule}
                              sidePanelOpen={sidePanelOpen}
                              setActiveSchedule={setActiveSchedule}
                              setDay={setDay}
            />}

        {view === 'month' &&
            <CalendarMonthView setView={setView} changeMonth={changeMonth}
                               sidePanelOpen={sidePanelOpen}
                               month={month == null || year == null ? null : new Date(year, month, 1)}
                               setDay={setDay}/>}

        {editingSchedule != null && <ValidationProvider>
            <ActivityDialog trigger={null} open={true} setOpen={(open) => {
                if (!open) {
                    setEditingSchedule(null);
                }
            }} toLoad={editingSchedule} type={ActivityType.SCHEDULED} canChangeType={false}/>
        </ValidationProvider>}
    </div>
}

function CalendarDayView({setView, changeDay, day, setDay, setActiveSchedule, setEditingSchedule, sidePanelOpen}: {
    setView: (view: 'day' | 'week' | 'month') => void,
    changeDay: (forward: boolean) => void,
    day: Date | null,
    setActiveSchedule: (scheduleId: string | null) => void,
    setEditingSchedule: (scheduleId: string | null) => void
    setDay: (day: Date) => void,
    sidePanelOpen: boolean,
}) {
    const container = useRef<HTMLDivElement>(null)
    const containerNav = useRef<HTMLDivElement>(null)
    const containerOffset = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Set the container scroll position based on the current time.
        if (container.current && containerNav.current && containerOffset.current) {
            const currentMinute = new Date().getHours() * 60
            container.current.scrollTop =
                ((container.current.scrollHeight - containerNav.current.offsetHeight - containerOffset.current.offsetHeight) *
                    currentMinute) /
                1440
        }
    }, [])

    let dayStart: Date | null = null;
    let dayEnd: Date | null = null;

    if (day != null) {
        dayStart = new Date(day);
        dayStart.setHours(0, 0, 0, 0);

        dayEnd = new Date(day);
        dayEnd.setHours(23, 59, 59, 999);
    }

    const {data, isLoading, isError} = useQuery({
        queryKey: ['calendar', 'calendar-daily', day?.getFullYear(), day?.getMonth(), day?.getDate()],
        queryFn: async () => {
            if (day == null) {
                return [];
            }

            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);

            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const result = handleServerAction(await fetchEvents(dayStart, dayEnd));
            if (!result.success) {
                throw new Error(`Error fetching events: ${result.message}`);
            }

            return result.result as Event[];
        },
        enabled: day != null
    })

    return (
        <>
            <CalendarWrapper sidePanelOpen={sidePanelOpen}>
                <DayCalendar
                    header
                    dayStart={dayStart}
                    showDate={true}
                    hourStart={CALENDAR_HOUR_START}
                    setView={setView}
                    changeDay={changeDay}
                    day={day}
                    setDay={setDay}
                    setActiveSchedule={setActiveSchedule}
                    isLoading={isLoading}
                >
                    {(day != null && data != null && !isError) &&
                        data.map((event, idx) => {
                            const parentType = TaskScheduleSubtypeToParent[event.type];
                            const color = ColorMapping[parentType];

                            const gridStart = 2 + Math.round(12 * ((event.start.getHours() + event.start.getMinutes() / 60) - CALENDAR_HOUR_START));
                            let span = 2 + Math.round(12 * ((event.end.getHours() + event.end.getMinutes() / 60) - CALENDAR_HOUR_START)) - gridStart;

                            if (event.end.getHours() == 0) {
                                span = 2 + 12 * 24 - gridStart;
                            }
                            if (span < 1) {
                                span = 1;
                            }

                            return <GridItem key={idx}
                                             className={`relative mt-px flex`}
                                             style={{gridRow: `${gridStart} / span ${span}`}}
                                             onClick={(_event) => {
                                                 setActiveSchedule(event.guid)
                                                 _event.stopPropagation()
                                             }}
                                             onDoubleClick={(_event) => {
                                                 setEditingSchedule(event.guid)
                                                 setActiveSchedule(event.guid)
                                                 _event.stopPropagation()
                                             }}
                            >
                                            <span
                                                className={`cursor-pointer group absolute inset-1 flex flex-col overflow-y-auto rounded-lg p-2 text-xs/5 ${color.parent}`}
                                            >
                                                <p className={`order-1 font-semibold ${color.title}`}>{event.title}</p>
                                                <p className={`${color.time}`}>
                                                    <time
                                                        dateTime={event.start.toISOString()}>
                                                        <TimeSpan start={event.start} end={event.end}/>
                                                    </time>
                                                </p>
                                            </span>
                            </GridItem>
                        })
                    }
                </DayCalendar>
            </CalendarWrapper>
            {(dayStart != null && dayEnd != null) && <TaskList start={dayStart} end={dayEnd}/>}
        </>
    )
}

type Event = {
    guid: string,
    title: string,
    start: Date,
    end: Date,
    type: TaskScheduleType,
    baseType: ActivityType,
}

// changeWeek: true to go forward, false to go backward
function CalendarWeekView({
                              week,
                              month,
                              year,
                              setView,
                              changeWeek,
                              setActiveSchedule,
                              sidePanelOpen,
                              setDay,
                              setEditingSchedule
                          }: {
    week?: number,
    month?: number,
    year?: number,
    setView: (view: 'day' | 'week' | 'month') => void,
    changeWeek: (forward: boolean) => void,
    setActiveSchedule: (scheduleId: string | null) => void,
    setDay: (day: Date) => void,
    setEditingSchedule: (scheduleId: string | null) => void,
    sidePanelOpen: boolean
}) {
    const [days, setDays] = React.useState<Date[]>([]);

    useEffect(() => {
        if (week == null || month == null || year == null) {
            return;
        }

        const days: Date[] = [];

        for (let i = week; i < week + 7; i++) {
            days.push(new Date(year, month, i));
        }

        setDays(days);
    }, [week, month, year])

    const {data, isLoading, isError} = useQuery({
        queryKey: ['calendar', 'calendar-weekly', days[0]?.getFullYear(), days[0]?.getMonth(), days[0]?.getDate()],
        queryFn: async () => {
            // Fetch events for the week
            const start = days[0];
            start.setHours(0, 0, 0, 0);
            const end = days[6];
            end.setHours(23, 59, 59, 999);
            end.setMonth(end.getMonth() + 1);

            const eventsResult = handleServerAction(await fetchEvents(start, end));
            if (!eventsResult.success) {
                throw new Error(`Error fetching events: ${eventsResult.message}`);
            }

            return eventsResult.result as Event[];
        },
        enabled: days != null && days.length === 7 && days[0].getFullYear() > 2020
    })

    return (
        <>
            <CalendarWrapper sidePanelOpen={sidePanelOpen}>
                <WeekCalendar
                    header
                    month={month}
                    year={year}
                    days={days}
                    isLoading={isLoading}
                    setView={setView}
                    changeWeek={changeWeek}
                    setActiveSchedule={setActiveSchedule}
                    hourStart={CALENDAR_HOUR_START}
                    setDay={setDay}
                >
                    {(data != null && !isError) ? data.map((event, idx) => {
                        const parentType = TaskScheduleSubtypeToParent[event.type];
                        const color = ColorMapping[parentType];
                        const colStart = event.start.getDay() + 1;

                        const gridStart = 2 + Math.round(12 * ((event.start.getHours() + event.start.getMinutes() / 60) - CALENDAR_HOUR_START));
                        let span = 2 + Math.round(12 * ((event.end.getHours() + event.end.getMinutes() / 60) - CALENDAR_HOUR_START)) - gridStart;

                        if (event.end.getHours() == 0) {
                            span = 2 + 12 * 24 - gridStart;
                        }
                        if (span < 1) {
                            span = 1;
                        }

                        return <GridItem key={idx} className={`relative mt-px flex col-start-${colStart}`}
                                         style={{gridRow: `${gridStart} / span ${span}`}}
                                         onClick={(_event) => {
                                             setActiveSchedule(event.guid)
                                             _event.stopPropagation()
                                         }}
                                         onDoubleClick={(_event) => {
                                             setEditingSchedule(event.guid)
                                             setActiveSchedule(event.guid)
                                             _event.stopPropagation()
                                         }}
                        >
                                            <span
                                                className={`cursor-pointer group absolute inset-1 flex flex-col overflow-y-auto rounded-lg p-2 text-xs/5 ${color.parent}`}
                                            >
                                                <p className={`order-1 font-semibold ${color.title}`}>{event.title}</p>
                                                <p className={`${color.time}`}>
                                                    <time
                                                        dateTime={event.start.toISOString()}>
                                                        <TimeSpan start={event.start} end={event.end}/>
                                                    </time>
                                                </p>
                                            </span>
                        </GridItem>
                    }) : <></>}
                </WeekCalendar>
            </CalendarWrapper>
            {(days != null && days.length === 7) && <TaskList start={days[0]} end={days[6]}/>}
        </>
    )
}

function CalendarWrapper({children, sidePanelOpen}: { children: React.ReactNode, sidePanelOpen: boolean }) {
    return <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${sidePanelOpen ? '' : 'ml-[-100vw] lg:ml-[-25vw] 3xl:ml-[-15vw]'}`}>
        <div className="flex h-[calc(100vh-4rem)] flex-col">
            {children}
        </div>
    </div>
}

type TaskListEntry = {
    guid: string,
    title: string,
    status: ActivityStatus,
    endDate: Date,
    priority: ActivityPriority,
}

function TaskList({start, end}: { start: Date, end: Date }) {
    const [taskSearch, setTaskSearch] = useState('');
    const [showCompletedTasks, setShowCompletedTasks] = useState(false);

    const isBigScreen = useMediaQuery('(min-width: 1025px)');

    const {data, isLoading, isError, error} = useQuery({
        queryKey: ['calendar-tasks', start, end],
        queryFn: async () => {
            if (start == null || end == null) {
                return []
            }

            const result = handleServerAction(await getTasks(start, end));
            if (!result.success) {
                throw new Error(`Error fetching tasks: ${result.message}`);
            }

            return result.result as TaskListEntry[];
        },
        enabled: start != null && end != null && isBigScreen
    })

    if (!isBigScreen) {
        return <></>
    }

    let content: React.JSX.Element

    if (isLoading) {
        content = <div className="flex items-center justify-center">
            <Loader2 className="my-4 h-8 w-8 animate-spin"/>;
        </div>
    } else if (isError || data == null) {
        content = <div className="text-red-500">Error loading tasks: {(error as Error).message}</div>;
    } else if (data.length === 0) {
        content = <div className="text-gray-500">No tasks found</div>;
    } else {
        let filteredTasks = data.filter(task => {
            if (taskSearch.trim() === '') {
                return true;
            }
            return task.title.toLowerCase().includes(taskSearch.toLowerCase());
        })

        if (!showCompletedTasks) {
            filteredTasks = filteredTasks.filter(task => task.status !== ActivityStatus.COMPLETED);
        }

        const highPriority = filteredTasks.filter(task => task.priority === ActivityPriority.HIGH);
        const mediumPriority = filteredTasks.filter(task => task.priority === ActivityPriority.MEDIUM);
        const lowPriority = filteredTasks.filter(task => task.priority === ActivityPriority.LOW);

        content = <div className="space-y-4">
            <h3 className="text-lg font-semibold mb-2">High Priority</h3>
            {highPriority.length === 0
                ? <div className="text-center text-gray-500 dark:text-gray-400">No high priority tasks</div>
                : <div className="space-y-2">
                    {highPriority.map(task => <TaskListItem key={task.guid} task={task}/>)}
                </div>}
            <h3 className="text-lg font-semibold mb-2">Medium Priority</h3>
            {mediumPriority.length === 0
                ? <div className="text-center text-gray-500 dark:text-gray-400">No medium priority tasks</div>
                : <div className="space-y-2">
                    {mediumPriority.map(task => <TaskListItem key={task.guid} task={task}/>)}
                </div>}
            <h3 className="text-lg font-semibold mb-2">Low Priority</h3>
            {lowPriority.length === 0
                ? <div className="text-center text-gray-500 dark:text-gray-400">No low priority tasks</div>
                : <div className="space-y-2">
                    {lowPriority.map(task => <TaskListItem key={task.guid} task={task}/>)}
                </div>}
        </div>
    }

    return <>
        <div
            className={`max-w-[25vw] xl:max-w-[20vw] 2xl:max-w-[15vw] 3xl:max-w-[12vw] border-l bg-gray-50 dark:bg-neutral-900 overflow-x-hidden overflow-y-auto max-h-[calc(100vh-4rem)] pr-2`}>
            <div className="p-4">
                <h2 className="text-lg font-semibold mb-4">Tasks</h2>
                <div className="space-y-2 mb-4">
                    <Input
                        placeholder="Search activities..."
                        value={taskSearch}
                        onChange={(e) => setTaskSearch(e.target.value)}
                    />
                    <div className="flex items-center">
                        <Checkbox
                            id="show-completed"
                            checked={showCompletedTasks}
                            onCheckedChange={(checked) => {
                                if (checked === true) {
                                    setShowCompletedTasks(checked)
                                } else {
                                    setShowCompletedTasks(false);
                                }
                            }}
                        />
                        <Label htmlFor="show-completed" className="ml-2">Show completed tasks</Label>
                    </div>
                </div>
                <div className="space-y-2">
                    {content}
                </div>
            </div>
        </div>
    </>
}

const TaskListItem = ({task}: { task: TaskListEntry }) => {
    const isOverdue = task.endDate.getTime() < new Date().getTime() && !areDatesEqual(task.endDate, new Date());
    const completed = task.status === ActivityStatus.COMPLETED;

    return (
        <div key={task.guid} className="flex items-center">
            <ValidationProvider>
                <ActivityDialog
                    type={ActivityType.TASK}
                    trigger={(
                        <Button variant={'ghost'} size={'icon'}>
                            <Edit className="h-4 w-4"/>
                        </Button>
                    )} toLoad={task.guid}/>
            </ValidationProvider>

            <label
                htmlFor={task.guid}
                className={`ml-2 text-sm ${completed ? 'line-through text-gray-500' : ''} ${isOverdue && !completed ? 'text-red-500' : ''}`}
            >
                {task.title}
            </label>
        </div>
    );
}

const MAX_ITEMS = 5;

function CalendarMonthView({setDay, setView, changeMonth, month, sidePanelOpen}: {
    setDay: (day: Date) => void,
    setView: (view: 'day' | 'week' | 'month') => void,
    changeMonth: (forward: boolean) => void,
    month: Date | null,
    sidePanelOpen: boolean
}) {
    const [days, setDays] = useState<Date[]>([]);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, [])

    useEffect(() => {
        if (month == null || month.getFullYear() < 2000) {
            return;
        }

        const dates: Date[] = [];
        const calendarStart = new Date(month.getFullYear(), month.getMonth(), 1);
        const weekStartOffset = calendarStart.getDay();
        calendarStart.setDate(calendarStart.getDate() - weekStartOffset); // Monday of that week
        calendarStart.setHours(0, 0, 0, 0);

        for (let i = 0; i < 42; i++) {
            const date = new Date(calendarStart.getTime());

            date.setDate(date.getDate() + i);

            if (i === 35 && date.getMonth() !== month.getMonth()) {
                break;
            }

            dates.push(date);
        }

        setDays(dates);
    }, [month])

    const {data, isLoading, isError} = useQuery({
        queryKey: ['calendar', 'calendar-monthly', month?.getMonth(), month?.getFullYear()],
        queryFn: async () => {
            if (month == null) {
                return {}
            }

            const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
            monthStart.setHours(0, 0, 0, 0);

            const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
            monthEnd.setHours(0, 0, 0, 0);

            const result = handleServerAction(await fetchEvents(monthStart, monthEnd));
            if (!result.success || result.result == null) {
                throw new Error(`Error fetching events: ${result.message}`);
            }

            // Key is just date
            const events: { [key: number]: Event[] } = {};

            for (const event of result.result) {
                const date = event.start;

                if (events[date.getDate()] == null) {
                    events[date.getDate()] = [];
                }

                events[date.getDate()].push(event);
            }

            return events;
        },
        enabled: month != null
    })

    let monthStart: Date | null = null;
    let monthEnd: Date | null = null;
    if (month != null) {
        monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);

        monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
        monthEnd.setHours(0, 0, 0, 0);
    }
    const today = new Date();

    const shouldRender = mounted && month != null && days.length > 0;

    return (
        <>
            <CalendarWrapper sidePanelOpen={sidePanelOpen}>
                <div className="lg:flex lg:h-[95vh] lg:flex-col">
                    <CalendarHeader view={'month'} setView={setView} title={month ? <>
                        <span className={'hidden lg:block'}>{month.toLocaleString('default', {month: 'long'})}</span>
                        <span className={'lg:hidden'}>{month.toLocaleString('default', {month: 'short'})}</span>
                    </> : null} headerTime={month ? `${month.getFullYear()}-${month.getMonth() + 1}` : null}
                                    changeTime={changeMonth}
                                    dateChangerCaption={month ? month.toLocaleString('default', {month: 'long'}) : null}/>
                    <div className="shadow ring-1 ring-black/5 lg:flex lg:flex-auto lg:flex-col">
                        <div
                            className="grid grid-cols-7 gap-px border-b border-gray-300 bg-gray-200 dark:border-neutral-700 dark:bg-neutral-800 text-center text-xs/6 font-semibold text-gray-700 dark:text-gray-300 lg:flex-none">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                <CalendarMonthHeader key={day}
                                                     day={day as 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun'}/>
                            ))}
                        </div>
                        <div
                            className={`flex bg-gray-200 dark:bg-neutral-800 text-xs/6 text-gray-700 dark:text-gray-300 lg:flex-auto${isLoading ? ' opacity-50 animate-shimmer' : ''}`}>
                            {/* Grid of days for large screens */}
                            <div
                                className={`hidden w-full lg:grid lg:grid-cols-7 lg:grid-rows-${Math.ceil(days.length / 7)} lg:gap-px`}>
                                {shouldRender && days.map((day) => {
                                    let events: Event[] = [];

                                    if (data != null && !isError && day.getMonth() === month?.getMonth()) {
                                        events = data[day.getDate()] ?? [];
                                    }

                                    return <div
                                        onClick={() => {
                                            setDay(day);
                                        }}
                                        key={day.toISOString().split('T')[0]}
                                        className={classNames(
                                            day.getMonth() === month?.getMonth() ? 'bg-white dark:bg-black' : 'bg-gray-50 text-gray-500 dark:bg-neutral-800 dark:text-gray-300',
                                            'relative px-3 py-2 hover:bg-gray-100 dark:hover:bg-neutral-900 cursor-pointer',
                                            {
                                                'weekend-striped dark:weekend-striped': (day.getDay() === 0 || day.getDay() === 6) && day.getMonth() === month?.getMonth()
                                            }
                                        )}
                                    >
                                        <time
                                            dateTime={day.toISOString().split('T')[0]}
                                            className={
                                                areDatesEqual(day, today)
                                                    ? 'flex size-6 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white'
                                                    : undefined
                                            }
                                        >
                                            {day.getDate()}
                                        </time>
                                        {events.length > 0 && (
                                            <ol className="mt-2">
                                                {events.slice(0, MAX_ITEMS).map((event) => (
                                                    <li key={event.guid}>
                                                        <a className="group flex">
                                                            <p className="flex-auto truncate font-medium text-gray-900 dark:text-gray-100">
                                                                {event.title}
                                                            </p>
                                                            <time
                                                                dateTime={event.start.toISOString()}
                                                                className="ml-3 hidden flex-none text-gray-500 dark:text-gray-300 xl:block"
                                                            >
                                                                <TimeSpan start={event.start} end={event.end}/>
                                                            </time>
                                                        </a>
                                                    </li>
                                                ))}
                                                {events.length > MAX_ITEMS &&
                                                    <li className="text-gray-500">+ {events.length - 2} more</li>}
                                            </ol>
                                        )}
                                    </div>
                                })}
                            </div>
                            {/* Grid of days for small screens */}
                            <div
                                className={`isolate grid w-full grid-cols-7 grid-rows-${Math.ceil(days.length / 7)} gap-px lg:hidden`}>
                                {shouldRender && days.map((day) => {
                                    const isMonth = day.getMonth() === month?.getMonth();
                                    const isToday = areDatesEqual(day, today);

                                    let events: Event[] = [];

                                    if (data != null && !isError) {
                                        events = data[day.getDate()] ?? [];
                                    }

                                    return <button
                                        key={day.toISOString().split('T')[0]}
                                        type="button"
                                        className={classNames('flex h-24 flex-col px-3 py-2 hover:bg-gray-100 focus:z-10', {
                                            'bg-white dark:bg-black': isMonth,
                                            'font-semibold text-indigo-600': isToday,
                                            'text-gray-900 dark:text-gray-100': isMonth && !isToday,
                                            'text-gray-500 dark:text-gray-300': !isMonth && !isToday,
                                        })}
                                    >
                                        <time
                                            dateTime={day.toISOString().split('T')[0]}
                                            className={classNames('ml-auto rounded-full', {
                                                'bg-indigo-600 text-white px-1': isToday,
                                            })}
                                        >
                                            {day.getDate()}
                                        </time>
                                        <span className="sr-only">{events.length} events</span>
                                        {events.length > 0 && (
                                            <span className="-mx-0.5 mt-auto flex flex-wrap-reverse">
                    {events.map((event) => (
                        <span key={event.guid}
                              className="mx-0.5 mb-1 size-1.5 rounded-full bg-gray-400 dark:bg-gray-500"/>
                    ))}
                  </span>
                                        )}
                                    </button>
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </CalendarWrapper>
            {monthStart != null && monthEnd != null && <TaskList start={monthStart} end={monthEnd}/>}
        </>
    )
}

function CalendarMonthHeader({day}: { day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun' }) {
    let dayCaptionShort = day[0];
    let rest = day.substring(1);
    if (day === 'Thu') {
        dayCaptionShort = 'Th';
        rest = 'u'
    }

    return <div className="bg-white py-2 dark:bg-black">
        {dayCaptionShort}
        <span className="sr-only sm:not-sr-only">{rest}</span>
    </div>
}