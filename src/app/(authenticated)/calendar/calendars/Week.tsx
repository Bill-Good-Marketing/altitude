import {CalendarHeader, GridItem, HourItem, TimeSpan, WithHeaderProps, WithoutHeaderProps} from "~/app/(authenticated)/calendar/calendars/common";
import {areDatesEqual} from "~/util/time/date";
import React, {useEffect, useRef} from "react";
import classNames from "classnames";

type CustomWeekHeaderProps = {
    idx: number,
    bigScreen: boolean,
}

type WeekCalendarProps =
    {
        header?: boolean,
        children?: React.ReactNode,
        dateless?: boolean,
        month?: number,
        year?: number,
        isLoading?: boolean,
        days?: Date[],
        setDay?: (day: Date) => void,
        hourStart: number,
    }
    & ((WithHeaderProps & { changeWeek: (forward: boolean) => void }) | (WithoutHeaderProps & { changeWeek?: never }))
    & ({
    dateless: true,
    CustomWeekHeader: React.FC<CustomWeekHeaderProps>,
} | {
    dateless?: false,
    CustomWeekHeader?: React.FC<CustomWeekHeaderProps>,
})

export function WeekCalendar({
                                 header,
                                 dateless,
                                 setView,
                                 setActiveSchedule,
                                 children,
                                 hourStart,
                                 isLoading,
                                 setDay,
                                 month,
                                 year,
                                 days,
                                 changeWeek,
                                 CustomWeekHeader
                             }: WeekCalendarProps) {
    const [mounted, setMounted] = React.useState(false);
    const [row, setRow] = React.useState(-1);
    const [lastRow, setLastRow] = React.useState(-1)
    const [col, setCol] = React.useState(-1);
    const [clickTime, setClickTime] = React.useState(0)

    const today = new Date();
    let monthName = today.toLocaleDateString('default', {month: 'long'});

    if (month != null) {
        monthName = new Date(2000, month, 1).toLocaleDateString('default', {month: 'long'});
    }

    let dateChangerCaption = 'Loading...';

    if (days != null && days.length === 7) {
        if (days[0].getMonth() === days[6].getMonth()) {
            dateChangerCaption = `${monthName} ${days[0].getDate()}-${days[6].getDate()}`;
        } else {
            const monthNameBegin = new Date(2000, days[0].getMonth(), 1).toLocaleDateString('default', {month: 'short'});
            const monthNameEnd = new Date(2000, days[6].getMonth(), 1).toLocaleDateString('default', {month: 'short'});
            dateChangerCaption = `${monthNameBegin} ${days[0].getDate()}-${monthNameEnd} ${days[6].getDate()}`;
        }
    }

    const container = useRef<HTMLDivElement>(null)
    const containerNav = useRef<HTMLDivElement>(null)
    const containerOffset = useRef<HTMLDivElement>(null)
    const calendar = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (container.current && containerNav.current && containerOffset.current) {
            const currentMinute = new Date().getHours() * 60
            container.current.scrollTop =
                ((container.current.scrollHeight - containerNav.current.offsetHeight - containerOffset.current.offsetHeight) *
                    currentMinute) /
                1440
        }

        setMounted(true);
    }, [])

    const shouldRender = dateless || (mounted && days?.length === 7);

    return <>
        {header && <CalendarHeader setView={setView} title={`${monthName} ${year}`} headerTime={`${year}-${month}`}
                                   view={'week'}
                                   changeTime={changeWeek} dateChangerCaption={dateChangerCaption}/>}
        <div ref={container} className={`isolate flex flex-auto flex-col overflow-auto bg-white dark:bg-black`}
             draggable={false}>
            <div style={{width: '165%'}}
                 className="flex max-w-full flex-none flex-col sm:max-w-none md:max-w-full">
                <div ref={containerNav}
                     className="sticky top-0 z-30 flex-none bg-white dark:bg-black shadow ring-1 ring-black/5 dark:ring-white/5 sm:pr-8">
                    <div className="grid grid-cols-7 text-sm/6 text-gray-500 dark:text-gray-300 sm:hidden">
                        {CustomWeekHeader ? Array.from({length: 7}, (_, index) => (
                            <CustomWeekHeader key={index} idx={index} bigScreen={false}/>
                        )) : <>
                            {(shouldRender && days) && days.map((date, index) => (
                                <WeekHeader key={index} date={date} active={areDatesEqual(date, today)}
                                            bigScreen={false} setDay={setDay}/>
                            ))}
                            {!shouldRender && Array.from({length: 7}, (_, index) => (
                                <WeekHeader key={index} date={new Date()} active={false} bigScreen={false}
                                            setDay={() => {
                                            }}/>
                            ))}
                        </>}
                    </div>

                    <div
                        className="-mr-px hidden grid-cols-7 divide-x divide-gray-100 dark:divide-neutral-900 border-r border-gray-100 dark:border-neutral-900 text-sm/6 text-gray-500 dark:text-gray-300 sm:grid">
                        <div className="col-end-1 w-14"/>
                        {CustomWeekHeader ? Array.from({length: 7}, (_, index) => (
                            <CustomWeekHeader key={index} idx={index} bigScreen={true}/>
                        )) : <>
                            {(shouldRender && days) && days.map((date, index) => (
                                <WeekHeader key={index} date={date} active={areDatesEqual(date, today)}
                                            bigScreen={true} setDay={setDay}/>
                            ))}
                            {!shouldRender && Array.from({length: 7}, (_, index) => (
                                <WeekHeader key={index} date={new Date()} active={false} bigScreen={true}
                                            setDay={() => {
                                            }}/>
                            ))}
                        </>}
                    </div>
                </div>
                <div className={`flex flex-auto${isLoading ? ' opacity-50 animate-shimmer' : ''}`}
                     onClick={(event) => {
                         setActiveSchedule && setActiveSchedule(null)
                         event.stopPropagation()
                     }}
                >
                    <div
                        className="sticky left-0 z-10 w-14 flex-none bg-white ring-1 ring-gray-100 dark:bg-black dark:ring-neutral-900"/>
                    <div ref={calendar} className="grid flex-auto grid-cols-1 grid-rows-1" onMouseLeave={() => {
                        const cols = document.getElementById('week-calendar-vertical-lines')
                        if (cols) cols.classList.remove('pointer-events-none');
                        setRow(-1);
                        setCol(-1);
                    }}
                         onDragStart={(event) => event.preventDefault()}
                         onDragEnd={() => {
                             setClickTime(0)
                             setRow(-1);
                             setCol(-1);
                             setLastRow(-1);

                             const cols = document.getElementById('week-calendar-vertical-lines')
                             if (cols) cols.classList.remove('pointer-events-none');
                         }}>
                        {/* Horizontal lines */}
                        <div
                            className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100 dark:divide-neutral-900"
                            style={{gridTemplateRows: `repeat(${48 - hourStart * 2}, minmax(3.5rem, 1fr))`}}
                        >
                            <div ref={containerOffset} className="row-end-1 h-7"/>
                            {Array.from({length: 24 - hourStart}, (_, index) => (
                                <HourItem
                                    key={index} hour={index + hourStart}
                                    onMouseUpCapture={(_, hour, part) => {
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        const row = hour * 2 + (part === 'second-half' ? 1 : 0)

                                        const cols = document.getElementById('week-calendar-vertical-lines')
                                        if (cols) cols.classList.remove('pointer-events-none');

                                        setRow(-1)
                                        setCol(-1)
                                    }}
                                    onMouseOverCapture={
                                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                        (_, hour, part) => {
                                            const _row = hour * 2 + (part === 'second-half' ? 1 : 0)
                                            setLastRow(Math.max(row, _row))
                                            setClickTime(0)
                                        }}/>
                            ))}
                            <div/>
                        </div>

                        {/* Vertical lines */}
                        <div id={'week-calendar-vertical-lines'}
                             className="col-start-1 col-end-2 row-start-1 hidden grid-cols-7 grid-rows-1 divide-x divide-gray-100 dark:divide-neutral-900 sm:grid sm:grid-cols-7">
                            {Array.from({length: 7}, (_, index) => (
                                <div key={index} className={`col-start-${index + 1} row-span-full`}
                                     onMouseDownCapture={(event) => {
                                         setClickTime(Date.now())
                                         setCol(index + 1);

                                         const cols = document.getElementById('week-calendar-vertical-lines')
                                         if (cols) cols.classList.add('pointer-events-none');

                                         const rows = document.querySelectorAll('[data-hour]')

                                         if (calendar.current) {
                                             for (const row of rows) {
                                                 if (event.clientY > row.getBoundingClientRect().top && event.clientY < row.getBoundingClientRect().bottom) {
                                                     const hour = parseInt(row.getAttribute('data-hour')!);
                                                     const hourPart = row.getAttribute('data-hour-part')!;
                                                     const _row = 2 * hour + (hourPart === 'second-half' ? 1 : 0);
                                                     setRow(_row); // Cells are 1/2 hour tall
                                                     setLastRow(_row)
                                                     break;
                                                 }
                                             }
                                         }
                                     }}/>
                            ))}

                            <div className="col-start-8 row-span-full w-8"/>
                        </div>

                        {/* Events */}
                        <ol
                            className="col-start-1 col-end-2 row-start-1 grid grid-cols-1 sm:grid-cols-7 sm:pr-8 pointer-events-none"
                            style={{gridTemplateRows: `1.75rem repeat(${(24 - hourStart) * 12}, minmax(0, 1fr)) auto`}}
                        >
                            {(row != -1 && lastRow != -1 && col != -1 && Date.now() - clickTime > 1000) &&
                                <NewItem col={col} row={row} lastRow={lastRow} hourStart={hourStart}/>}
                            {shouldRender ? children : <></>}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    </>
}

function NewItem({col, row, lastRow, hourStart}: {
    col: number,
    row: number,
    lastRow: number,
    hourStart: number
}) {
    const color = {
        parent: 'bg-neutral-50',
        title: 'text-neutral-700',
    }

    const gridStart = 2 + 6 * (row - hourStart * 2);
    const span = 2 + 6 * (lastRow + 1 - hourStart * 2) - gridStart

    const timeStart = new Date()
    timeStart.setHours(row / 2, row % 2 * 30, 0, 0)
    const timeEnd = new Date()
    timeEnd.setHours(lastRow / 2, lastRow % 2 * 30, 0, 0)

    return <GridItem
        draggable={false}
        className={`relative mt-px flex col-start-${col} pointer-events-none`}
        style={{gridRow: `${gridStart} / span ${span}`}}
    >
        <span
            className={`cursor-pointer group absolute inset-1 flex flex-col overflow-y-auto rounded-lg p-2 text-xs/5 ${color.parent}`}
        >
            <p className={`order-1 font-semibold ${color.title}`}>New Event</p>
            <p className={`${color.title}`}>
                <time
                    dateTime={timeStart.toISOString()}>
                    <TimeSpan start={timeStart} end={timeEnd}/>
                </time>
            </p>
        </span>
    </GridItem>
}


function WeekHeader({date, active, bigScreen, setDay}: {
    date: Date,
    active: boolean,
    bigScreen: boolean,
    setDay?: (day: Date) => void,
}) {
    const [mounted, setMounted] = React.useState(false);

    useEffect(() => {
        setMounted(true);
    }, [])

    if (!mounted) {
        return <div className="flex items-center justify-center py-3">
        <span>
            Loading...
        </span>
        </div>
    }

    const dateNum = date.getDate();
    const dayName = date.toLocaleDateString('default', {weekday: 'short'});

    if (bigScreen) {
        return <div
            className="flex items-center justify-center py-3 hover:bg-gray-100 dark:hover:bg-neutral-900 cursor-pointer"
            onClick={() => setDay && setDay(date)}>
            <span className={active ? 'flex items-baseline' : ''}>
              {dayName}{' '}
                <span className={classNames({
                    "items-center justify-center font-semibold text-gray-900 dark:text-gray-100": !active,
                    'ml-1.5 flex size-8 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white': active
                })}>{dateNum}</span>
            </span>
        </div>
    }

    let shortDayName = dayName[0];
    if (date.getDay() === 4) {
        shortDayName = 'Th';
    }

    return <button type="button"
                   className="flex flex-col items-center pb-3 pt-2 hover:bg-gray-100 dark:hover:bg-neutral-900"
                   onClick={() => setDay && setDay(date)}>
        {shortDayName}
        <span
            className={classNames({
                "mt-1 flex size-8 items-center justify-center font-semibold text-gray-900 dark:text-gray-100": !active,
                'mt-1 flex size-8 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white': active
            })}>{dateNum}</span>
    </button>
}