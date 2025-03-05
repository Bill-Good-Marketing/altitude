'use client';
import {Button} from "~/components/ui/button"
import {Calendar} from "~/components/ui/calendar"
import {Popover, PopoverContent, PopoverTrigger} from "~/components/ui/popover"
import {format} from "date-fns"
import {ArrowRightFromLine, BadgeX, Ban, Calendar1, CalendarIcon, CalendarSync, DollarSign, Handshake, Search, Signature} from "lucide-react"
import React, {useState} from "react"
import {OpportunityFilters, TimePeriod} from "~/app/(authenticated)/opportunities/client/opportunity-filters";
import {ContactReadResult} from "~/components/data/pickers/ContactPicker";
import {UserReadResult} from "~/components/data/pickers/UserPicker";
import {handleServerAction} from "~/util/api/client/APIClient";
import {useQuery} from "@tanstack/react-query";
import {ContactType, OpportunityStatus, OpportunityStatusNameMapping} from "~/common/enum/enumerations";
import {getOpportunities, updateOpportunityCloseDate} from "~/app/(authenticated)/opportunities/client/Actions";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";
import {DataTable, ErroredDataTable, Sort} from "~/components/data/DataTable";
import {Badge} from "~/components/ui/badge";
import {DateRenderer} from "~/components/util/Date";
import {englishList} from "~/util/strings";
import {EnglishList} from "~/components/util/EnglishList";
import {ContactHoverCard} from "~/common/components/hover-cards/ContactHoverCard";
import {cn} from "~/lib/utils";
import {usePersisted} from "~/hooks/use-persisted";

export declare type ClientOpportunity = {
    guid: string,
    title: string,
    contacts: {
        name: string,
        guid: string,
        primaryEmail: string | null,
        primaryPhone: string | null,
        primaryAddress: string | null,
        type: ContactType,
    }[],
    value: number,
    probability: number,
    // expectedValue: number,
    expectedCloseDate: Date,
    actualCloseDate: Date | null,
    teamMembers: string[],
    status: OpportunityStatus,
}

export function OpportunityTable() {
    const [searchTerm, setSearchTerm] = usePersisted("")
    const [contacts, setContacts] = usePersisted<ContactReadResult[]>([])
    const [teamMembers, setTeamMembers] = usePersisted<UserReadResult[]>([])
    const [timePeriod, setTimePeriod] = usePersisted<TimePeriod>("this-year")

    const [page, setPage] = useState(1)
    const [perPage, setPerPage] = useState(25)

    const [dates, setDates] = useState<{ [key: string]: Date }>({})

    const [sortBy, setSortBy] = usePersisted<Sort<ClientOpportunity>>({
        expectedCloseDate: 'desc',
    })

    const [statusFilter, setStatusFilter] = usePersisted<OpportunityStatus | null>(null)

    const handleDateChange = async (id: string, date: Date | undefined) => {
        if (date) {
            const prevDates = dates
            setDates({...dates, [id]: date})

            const result = handleServerAction(await updateOpportunityCloseDate(id, date))
            if (!result.success) {
                setDates(prevDates)
                throw new Error(`Error updating opportunity: ${result.message}`)
            }
        }
    }

    const handleQuickDateChange = async (id: string, time: 'week' | 'month' | '3-month') => {
        const currentDate = dates[id] || new Date()
        const newDate = new Date(currentDate)
        switch (time) {
            case 'week':
                newDate.setDate(newDate.getDate() + 7)
                break;
            case 'month':
                newDate.setMonth(newDate.getMonth() + 1)
                break;
            case '3-month':
                newDate.setMonth(newDate.getMonth() + 3)
                break;
        }
        const prevDate = dates
        setDates({...dates, [id]: newDate})

        const result = handleServerAction(await updateOpportunityCloseDate(id, newDate))

        if (!result.success) {
            setDates(prevDate)
            throw new Error(`Error updating opportunity: ${result.message}`)
        }
    }

    const {data, isLoading, isError, error} = useQuery({
        queryKey: ["deals", searchTerm, timePeriod, statusFilter, contacts, teamMembers, sortBy, page, perPage],
        queryFn: async () => {
            const result = handleServerAction(await getOpportunities(searchTerm, timePeriod, statusFilter, contacts, teamMembers, sortBy, page, perPage))
            if (result.success) {
                return result.result
            }
            throw new Error(`Error fetching opportunities: ${result.message}`)
        },
    })

    let table = <></>
    const moneyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });

    if (isLoading) {
        table = <LoadingDataTable columns={[
            'Title',
            'Status',
            'Value',
            'Probability',
            'Expected Value',
            'Actual/Expected Close Date',
            'Team Members',
            'Contacts'
        ]} fakeRowCount={perPage} pageable/>
    } else if (isError || data == null) {
        table = <ErroredDataTable columns={[
            'Title',
            'Status',
            'Value',
            'Probability',
            'Expected Value',
            'Actual/Expected Close Date',
            'Team Members',
            'Contacts'
        ]} message={error?.message ?? 'Error loading opportunities'} className={'h-[400px]'}/>
    } else {
        const [opportunities, count] = data
        table = <DataTable
            data={opportunities}
            count={count}
            page={page}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            pageable
            pageSizeOptions={[25, 50, 100]}
            height={'1200px'}
            idKey={'guid'}
            setSortBy={setSortBy}
            sortBy={sortBy}
            columns={[
                {
                    key: 'title',
                    title: 'Title',
                    sortable: true,
                    render: (opportunity: ClientOpportunity) => <a href={`/opportunities/${opportunity.guid}`} className="max-w-[20vw] text-wrap hover:underline">{opportunity.title}</a>
                },
                {
                    key: 'status',
                    title: 'Status',
                    render: (opportunity: ClientOpportunity) => <OpportunityStatusBadge status={opportunity.status}/>
                },
                {
                    key: 'value',
                    title: 'Value',
                    render: (opportunity: ClientOpportunity) => <span className="font-semibold">{moneyFormatter.format(opportunity.value)}</span>,
                    sortable: true
                },
                {
                    key: 'probability',
                    title: 'Probability',
                    render: (opportunity: ClientOpportunity) => <span className="font-semibold">{opportunity.probability * 100}%</span>,
                },
                // {
                //     key: 'expectedValue',
                //     title: 'Expected Value',
                //     render: (opportunity: ClientOpportunity) => <span
                //         className="font-semibold">{moneyFormatter.format(opportunity.expectedValue)}</span>,
                //     sortable: true
                // },
                {
                    key: 'expectedCloseDate',
                    title: 'Actual/Expected Close Date',
                    render: (opportunity: ClientOpportunity) => {
                        if (opportunity.actualCloseDate == null) {
                            return <DateRenderer date={opportunity.actualCloseDate ?? opportunity.expectedCloseDate}/>
                        }

                        return <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" className="w-[180px] justify-start text-left font-normal">
                                    <CalendarIcon className="mr-2 h-4 w-4"/>
                                    {dates[opportunity.guid]
                                        ? format(dates[opportunity.guid], "MMMM d, yyyy")
                                        : format(opportunity.expectedCloseDate, "MMMM d, yyyy")}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={dates[opportunity.guid] || opportunity.expectedCloseDate}
                                    onSelect={(date) => handleDateChange(opportunity.guid, date)}
                                    initialFocus
                                />
                                <div className="flex justify-between p-2 border-t">
                                    <Button size="sm" onClick={() => handleQuickDateChange(opportunity.guid, 'week')}>
                                        +1 Week
                                    </Button>
                                    <Button size="sm" onClick={() => handleQuickDateChange(opportunity.guid, 'month')}>
                                        +1 Month
                                    </Button>
                                    <Button size="sm" onClick={() => handleQuickDateChange(opportunity.guid, '3-month')}>
                                        +3 Months
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    },
                    sortable: true
                },
                {
                    key: 'contacts',
                    title: 'Contacts',
                    render: (opportunity: ClientOpportunity) => <EnglishList
                        Component={({children, idx}) => {
                            return <ContactHoverCard
                                guid={opportunity.contacts[idx].guid}
                                name={children}
                                type={opportunity.contacts[idx].type}
                                email={opportunity.contacts[idx].primaryEmail}
                                phone={opportunity.contacts[idx].primaryPhone}
                                address={opportunity.contacts[idx].primaryAddress}
                                showTypeIcon={true}
                            />
                        }}
                        strs={opportunity.contacts.map(contact => contact.name)}/>,
                },
                {
                    key: 'teamMembers',
                    title: 'Team Members',
                    render: (opportunity: ClientOpportunity) => <span>{englishList(opportunity.teamMembers)}</span>,
                },
            ]}

        />
    }
    return (
        <>
            <OpportunityFilters
                timePeriod={timePeriod}
                setTimePeriod={setTimePeriod}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                contacts={contacts}
                setContacts={setContacts}
                teamMembers={teamMembers}
                setTeamMembers={setTeamMembers}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            {table}
        </>
    )
}

export function OpportunityStatusIcon({status, withColor, className}: { status: OpportunityStatus, withColor?: boolean, className?: string }) {
    const classes = cn('h-4 w-4 mr-2', className)

    switch (status) {
        case OpportunityStatus.UNSTARTED:
            return <ArrowRightFromLine className={cn(classes, withColor ? 'text-gray-400' : undefined)}/>

        case OpportunityStatus.IDENTIFIED:
            return <Search className={cn(classes, withColor ? 'text-amber-500 dark:text-amber-900' : undefined)}/>

        case OpportunityStatus.FIRST_APPOINTMENT:
            return <Calendar1 className={cn(classes, withColor ? 'text-lime-300 dark:text-lime-900' : undefined)}/>

        case OpportunityStatus.SECOND_APPOINTMENT:
            return <CalendarSync className={cn(classes, withColor ? 'text-lime-400 dark:text-lime-800' : undefined)}/>

        case OpportunityStatus.THIRD_APPOINTMENT:
            return <CalendarSync className={cn(classes, withColor ? 'text-lime-500 dark:text-lime-700' : undefined)}/>

        case OpportunityStatus.CLOSING:
            return <Handshake className={cn(classes, withColor ? 'text-green-500 dark:text-green-900' : undefined)}/>

        case OpportunityStatus.PAPERWORK:
            return <Signature className={cn(classes, withColor ? 'text-green-600 dark:text-green-800' : undefined)}/>

        case OpportunityStatus.WON:
            return <DollarSign className={cn(classes, withColor ? 'text-green-500 dark:text-green-900' : undefined)}/>

        case OpportunityStatus.LOST:
            return <BadgeX className={cn(classes, withColor ? 'text-red-500 dark:text-red-900' : undefined)}/>
        case OpportunityStatus.CANCELLED:
            return <Ban className={cn(classes, withColor ? 'text-red-500 dark:text-red-900' : undefined)}/>
    }
}

export function OpportunityStatusBadge({status, className}: { status: OpportunityStatus, className?: string }) {
    const icon = <OpportunityStatusIcon status={status} withColor={false}/>;

    switch (status) {
        case OpportunityStatus.WON:
            return <Badge className={cn('bg-emerald-500 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200', className)}>{icon} Won</Badge>
        case OpportunityStatus.LOST:
        case OpportunityStatus.CANCELLED:
            return <Badge className={cn('bg-red-500 dark:bg-red-900 text-red-800 dark:text-red-200', className)}>
                {icon} {OpportunityStatusNameMapping[status]}
            </Badge>
        case OpportunityStatus.IDENTIFIED:
            return <Badge className={cn('bg-amber-500 dark:bg-amber-900 text-amber-800 dark:text-amber-200', className)}>{icon} Identified</Badge>
        case OpportunityStatus.FIRST_APPOINTMENT:
            return <Badge className={cn('bg-lime-300 dark:bg-lime-900 text-lime-800 dark:text-lime-200', className)}>{icon} First Appointment</Badge>
        case OpportunityStatus.SECOND_APPOINTMENT:
            return <Badge className={cn('bg-lime-400 dark:bg-lime-800 text-lime-800 dark:text-lime-200', className)}>{icon} Second Appointment</Badge>
        case OpportunityStatus.THIRD_APPOINTMENT:
            return <Badge className={cn('bg-lime-500 dark:bg-lime-700 text-lime-800 dark:text-lime-200', className)}>{icon} Third Appointment</Badge>
        case OpportunityStatus.CLOSING:
            return <Badge className={cn('bg-green-500 dark:bg-green-900 text-green-800 dark:text-green-200', className)}>{icon} Closing</Badge>
        case OpportunityStatus.PAPERWORK:
            return <Badge className={cn('bg-green-600 dark:bg-green-800 text-green-800 dark:text-green-200', className)}>{icon} Paperwork</Badge>
    }
}