'use client';

import {Button} from "~/components/ui/button";
import React, {useRef, useState} from "react";
import {Checkbox} from "~/components/ui/checkbox";
import {TimePicker} from "~/components/ui/datetime-picker";

const dateFromHours = (hours: number) => {
    'use no memo';
    const date = new Date();
    const minutes = Math.floor((hours * 60) % 60);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

export function WorkWeekConfiguration() {
    const CALENDAR_HOUR_START = 4;

    const [days, setDays] = useState<[boolean, number, number][]>([[false, -1, -1], [false, -1, -1], [false, -1, -1], [false, -1, -1], [false, -1, -1], [false, -1, -1], [false, -1, -1]]);

    const container = useRef<HTMLDivElement>(null);
    const containerNav = useRef<HTMLDivElement>(null);
    const containerOffset = useRef<HTMLDivElement>(null);

    // const [shouldRender, setShouldRender] = useState(false);

    // useEffect(() => {
    //     setShouldRender(true);
    // }, []);

    const _days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return <div>
        <div className={'flex justify-between align-middle'}>
            <h1 className="text-2xl font-bold">Configure Work Week</h1>

            <Button
                variant={'linkHover2'} className={'force-border'}>
                Save
            </Button>
        </div>
        <div className="flex h-[calc(100vh-8rem)] overflow-hidden mt-4">
            <div className={'overflow-auto w-full'}>
                <div ref={container} className={`isolate flex flex-auto flex-col bg-white dark:bg-black`}>
                    <div style={{width: '165%'}}
                         className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
                        <div ref={containerNav}
                             className="sticky top-0 z-30 flex-none bg-white dark:bg-black shadow ring-1 ring-black/5 dark:ring-white/5">
                            <div
                                className="-mr-px hidden grid-cols-7 divide-x divide-gray-100 dark:divide-neutral-900 border-r border-gray-100 dark:border-neutral-900 text-sm/6 text-gray-500 dark:text-gray-300 sm:grid">
                                <div className="col-end-1 w-14"/>
                                {_days.map((day, index) => (
                                    <WeekHeader
                                        key={index}
                                        name={day}
                                        active={days[index][0]}
                                        setActive={(active: boolean) => {
                                            setDays(prev => {
                                                const newDays = [...prev];
                                                newDays[index][0] = active;
                                                newDays[index][1] = 9;
                                                newDays[index][2] = 17;
                                                return newDays;
                                            })
                                        }}
                                        start={days[index][1]}
                                        end={days[index][2]}
                                        setStart={(start: number) => {
                                            setDays(prev => {
                                                const newDays = [...prev];
                                                newDays[index][1] = start;
                                                return newDays;
                                            })
                                        }}
                                        setEnd={(end: number) => {
                                            setDays(prev => {
                                                const newDays = [...prev];
                                                newDays[index][2] = end;
                                                return newDays;
                                            })
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className={`flex flex-auto`}>
                            <div
                                className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100 dark:bg-black dark:ring-neutral-900"/>
                            <div className="grid flex-auto grid-cols-1 grid-rows-1">
                                {/* Horizontal lines */}
                                <div
                                    className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100 dark:divide-neutral-900"
                                    style={{gridTemplateRows: `repeat(${48 - CALENDAR_HOUR_START * 2}, minmax(3.5rem, 1fr))`}}
                                >
                                    <div ref={containerOffset} className="row-end-1 h-7"/>
                                    {Array.from({length: 24 - CALENDAR_HOUR_START}, (_, index) => (
                                        <HourItem key={index} hour={index + CALENDAR_HOUR_START}/>
                                    ))}
                                    <div/>
                                </div>

                                {/* Vertical lines */}
                                <div
                                    className="col-start-1 col-end-2 row-start-1 hidden grid-cols-7 grid-rows-1 divide-x divide-gray-100 dark:divide-neutral-900 sm:grid sm:grid-cols-7">
                                    {Array.from({length: 7}, (_, index) => (
                                        <div key={index}
                                             className={`col-start-${index + 1} row-span-full ${!days[index][0] ? 'bg-gray-100 dark:bg-neutral-900 grid grid-rows-6 grid-cols-1 justify-items-center font-bold text-2xl' : ''}`}>
                                            {!days[index][0] ? <>
                                                <span></span>
                                                <span>Closed</span>
                                                <span>Closed</span>
                                                <span>Closed</span>
                                                <span>Closed</span>
                                                <span>Closed</span>
                                            </> : undefined}
                                        </div>
                                    ))}
                                </div>

                                {/* Events */}
                                <ol
                                    className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7"
                                    style={{gridTemplateRows: `1.75rem repeat(${(24 - CALENDAR_HOUR_START) * 12}, minmax(0, 1fr)) auto`}}
                                >
                                    {days.map((day, idx) => {
                                        if (!day[0]) return;

                                        const colStart = idx + 1;

                                        const start = dateFromHours(day[1]);
                                        const end = dateFromHours(day[2]);

                                        const gridStart = 2 + Math.round(12 * ((start.getHours() + start.getMinutes() / 60) - CALENDAR_HOUR_START));
                                        let span = 2 + Math.round(12 * ((end.getHours() + end.getMinutes() / 60) - CALENDAR_HOUR_START)) - gridStart;

                                        if (end.getHours() == 0) {
                                            span = 2 + 12 * 24 - gridStart;
                                        }
                                        if (span < 1) {
                                            span = 1;
                                        }

                                        return <li
                                            key={idx} className={`relative mt-px flex col-start-${colStart}`}
                                            style={{gridRow: `${gridStart} / span ${span}`}}
                                        >
                                            <span
                                                className={`group absolute inset-1 flex flex-col overflow-y-auto rounded-lg p-2 text-xs/5 bg-foreground text-primary-foreground`}
                                            >
                                                <p className={`order-1 font-semibold`}>{fullDayNames[idx]}{"'"}s Work Schedule</p>
                                                <p>
                                                    <time
                                                        dateTime={start.toISOString()}>
                                                        <TimeSpan start={start} end={end}/>
                                                    </time>
                                                </p>
                                            </span>
                                        </li>
                                    })}
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

function WeekHeader({name, active, setActive, start, end, setStart, setEnd}: {
    name: string,
    active: boolean,
    setActive: (active: boolean) => void,
    start: number,
    end: number,
    setStart: (start: number) => void,
    setEnd: (end: number) => void
}) {
    return <div>
        <div
            className="flex items-center space-x-3 justify-center py-3"
        >
        <span>
          {name}
        </span>
            <Checkbox checked={active} onCheckedChange={(checked) => setActive(checked === true)}/>
        </div>
        {active && <div className={'flex flex-col items-center justify-center space-y-4'}>
            <div className={'w-min'}>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Day{"'"}s Start
                </label>
                <TimePicker
                    date={dateFromHours(start)}
                    onChange={(date) => {
                        if (!date) return;
                        const hoursAndMinutes = date.getHours() + date.getMinutes() / 60;
                        setStart(hoursAndMinutes);
                    }}
                    granularity={'minute'}
                    hourCycle={12}
                />
            </div>
            <div className={'w-min'}>
                <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Day{"'"}s End
                </label>
                <TimePicker
                    date={dateFromHours(end)}
                    onChange={(date) => {
                        if (!date) return;
                        const hoursAndMinutes = date.getHours() + date.getMinutes() / 60;
                        setEnd(hoursAndMinutes);
                    }}
                    granularity={'minute'}
                    hourCycle={12}
                />
            </div>
        </div>}
    </div>
}

function HourItem({hour}: { hour: number }) {
    const am = hour < 12 ? 'AM' : 'PM';
    let hourNum = hour % 12;

    if (hourNum === 0) {
        hourNum = 12;
    }

    return <>
        <div>
            <div
                className="sticky left-0 z-20 -ml-14 -mt-2.5 w-14 pr-2 text-right text-xs/5 text-gray-400 dark:text-gray-500">
                {hourNum}{am}
            </div>
        </div>
        <div/>
    </>
}

function TimeSpan({start, end}: { start: Date, end: Date }) {
    return `${start.toLocaleString('default', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })} - ${end.toLocaleString('default', {hour: '2-digit', minute: '2-digit', hour12: true})}`
}