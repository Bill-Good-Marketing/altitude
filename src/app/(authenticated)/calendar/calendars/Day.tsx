import {format} from "date-fns";
import React, {useRef} from "react";
import {areDatesEqual} from "~/util/time/date";
import classNames from "classnames";
import {
    CalendarHeader,
    HourItem,
    WithHeaderProps,
    WithoutHeaderProps
} from "~/app/(authenticated)/calendar/calendars/common";

type DayCalendarProps = {
    header?: boolean
    dayStart?: Date | null,
    showDate?: boolean,
    day?: Date | null,
    setDay?: (day: Date) => void,
    isLoading?: boolean,
    hourStart: number,
    children?: React.ReactNode,
} & ((WithHeaderProps & { changeDay: (forward: boolean) => void }) | (WithoutHeaderProps & {changeDay?: never}))

export function DayCalendar({
                                header,
                                dayStart,
                                showDate,
                                isLoading,
                                hourStart,
                                setView,
                                changeDay,
                                day,
                                setDay,
                                setActiveSchedule,
                                children,
                            }: DayCalendarProps) {
    const container = useRef<HTMLDivElement>(null)
    const containerNav = useRef<HTMLDivElement>(null)
    const containerOffset = useRef<HTMLDivElement>(null)

    return <div className="flex h-full flex-col">
        {header && <CalendarHeader view={'day'} setView={setView} title={day ? <>
            <span className={'hidden lg:block'}>{format(day, 'PPPP')}</span>
            <span className={'lg:hidden'}>{format(day, 'P')}</span>
        </> : null} headerTime={day ? day.toISOString().split('T')[0] : null}
                                   changeTime={changeDay} dateChangerCaption={day ? format(day, 'PP') : null}/>}

        <div className="isolate flex flex-auto overflow-hidden bg-white dark:bg-black">
            <div ref={container} className="flex flex-auto flex-col overflow-auto">
                <div
                    ref={containerNav}
                    className="sticky top-0 z-10 grid flex-none grid-cols-7 bg-white dark:bg-black text-xs text-gray-500 dark:text-gray-300 shadow ring-1 ring-black/5 dark:ring-white/5 md:hidden"
                >
                    {Array.from({length: 7}, (_, index) => {
                        let date: Date | null = null;
                        if (dayStart != null) {
                            date = new Date(dayStart.getTime());
                            date.setDate(date.getDate() + index - 4);
                        } else if (!showDate) {
                            // Ignoring the date so we're just going to show the day names in order
                            date = new Date();
                            date.setDate(date.getDate() - date.getDay() + index + 1)
                        }
                        return <MobileDayViewHeader key={index} day={date} setDay={setDay} showDate={showDate}
                                                    active={date == null ? false : areDatesEqual(date, dayStart!)}/>
                    })}
                </div>
                <div className={`flex w-full flex-auto${isLoading ? ' opacity-50 animate-shimmer' : ''}`}
                     onClick={(event) => {
                         setActiveSchedule && setActiveSchedule(null)
                         event.stopPropagation()
                     }}>
                    <div
                        className="w-14 flex-none bg-white ring-1 ring-gray-100 dark:bg-black dark:ring-neutral-900"/>
                    <div className="grid flex-auto grid-cols-1 grid-rows-1">
                        {/* Horizontal lines */}
                        <div
                            className="col-start-1 col-end-2 row-start-1 grid divide-y divide-gray-100 dark:divide-neutral-900"
                            style={{gridTemplateRows: `repeat(${48 - hourStart * 2}, minmax(3.5rem, 1fr))`}}
                        >
                            <div ref={containerOffset} className="row-end-1 h-7"></div>
                            {Array.from({length: 24 - hourStart}, (_, index) => (
                                <HourItem key={index} hour={index + hourStart}/>
                            ))}
                        </div>

                        {/* Events */}
                        <ol
                            className="col-start-1 col-end-2 row-start-1 grid grid-cols-1"
                            style={{gridTemplateRows: `1.75rem repeat(${(24 - hourStart) * 12}, minmax(0, 1fr)) auto`}}
                        >
                            {children}
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    </div>
}

function MobileDayViewHeader({day, setDay, active, showDate}: {
    day: Date | null,
    setDay?: (day: Date) => void,
    active: boolean,
    showDate?: boolean // Show date number
}) {
    let dayCaption = day ? day.toLocaleDateString('default', {weekday: 'narrow'}) : null;

    if (day?.getDay() === 4) {
        dayCaption = 'Th';
    }

    return <button type="button"
                   className="flex flex-col items-center pb-1.5 pt-3 hover:bg-gray-100 dark:hover:bg-neutral-900"
                   onClick={() => {
                       if (day == null) return;
                       setDay && setDay(day)
                   }}>
        {dayCaption && <span>{dayCaption}</span>}
        {showDate && <span
            className={classNames("mt-3 flex size-8 items-center justify-center rounded-full text-base font-semibold", {
                'bg-gray-900 text-white dark:bg-gray-100 dark:text-black': active,
                'text-gray-900 dark:text-gray-100': !active
            })}>
                {day ? day.getDate() : '...'}
      </span>}
    </button>
}