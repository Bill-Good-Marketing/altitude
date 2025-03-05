'use client';

import {ActivityStatus, ActivityType, ActivityTypeNameMapping, TaskScheduleType, TaskScheduleTypeNameMapping} from "~/common/enum/enumerations";
import {useQuery} from "@tanstack/react-query";
import {handleServerAction} from "~/util/api/client/APIClient";
import {getOpportunityActivities, getOpportunityTimeline} from "~/app/(authenticated)/opportunities/[guid]/Actions";
import {LoadingDataTable} from "~/components/data/LoadingDataTable";
import {DataTable, ErroredDataTable, NoDataTable, Sort} from "~/components/data/DataTable";
import React from "react";
import {Input} from "~/components/ui/input";
import {FormattedLink} from "~/components/util/FormattedLink";
import {ActivityTypeIcon} from "~/components/data/models/ActivityTypeIcon";
import {DateRenderer} from "~/components/util/Date";
import {englishList} from "~/util/strings";
import {ActivityStatusBadge} from "~/app/(authenticated)/activities/client";
import {InfiniteList} from "~/components/ui/infinitelist";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";

export function OpportunityTimeline({guid}: { guid: string }) {
    const COUNT = 5;

    return <div className="space-y-4">
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                <InfiniteList<FeedItem>
                    listKey={`feed-${guid}`}
                    load={async offset => {
                        const result = handleServerAction(await getOpportunityTimeline(guid, offset, COUNT));
                        if (!result.success || result.result == null) {
                            throw new Error(`Error loading notes: ${result.message}`);
                        }
                        return result.result!;
                    }}
                    render={(item, idx, count) => {
                        return <li key={item.guid}>
                            <FeedItem feedItem={item} idx={idx} length={count}
                                      includeActivityDetails={false} includeOpportunityDetails={true}/>
                        </li>
                    }}
                    noData={() => {
                        return <></>
                    }}
                    className={'h-[400px]'}
                    viewportClassName={'p-4'}
                    filterItems={(items) => {
                        const seen = new Set<string>();
                        return items.filter(item => {
                            if (seen.has(item.guid)) {
                                return false;
                            }
                            seen.add(item.guid);
                            return true;
                        });
                    }}
                />
            </ul>
        </div>
    </div>
}

export declare type OpportunityActivity = {
    guid: string,
    title: string,
    startDate: Date,
    endDate: Date,
    status: ActivityStatus,
    type: ActivityType,
    subType: TaskScheduleType | null,
    assigned: string[],
}

export function OpportunityActivities({guid}: { guid: string }) {
    const [page, setPage] = React.useState(1)
    const [perPage, setPerPage] = React.useState(25)
    const [sort, setSort] = React.useState<Sort<OpportunityActivity>>({title: 'asc'})
    const [search, setSearch] = React.useState('')
    const [interimSearch, setInterimSearch] = React.useState('')

    const {data, isLoading, isError, error} = useQuery({
        queryKey: ['opportunity-activities', guid, search, page, perPage, sort],
        queryFn: async () => {
            const result = handleServerAction(await getOpportunityActivities(guid, search, page, perPage, sort));
            if (!result.success) {
                throw new Error(`Error loading opportunity activities: ${result.message}`);
            }
            return result.result;
        },
        enabled: guid != null
    })

    let content: React.JSX.Element

    if (isLoading) {
        content = <LoadingDataTable columns={['Name', 'Start Date', 'End Date', 'Type', 'Team Members']} fakeRowCount={25} pageable={true} height={'70vh'}/>
    } else if (isError || data == null) {
        content = <ErroredDataTable columns={['Name', 'Start Date', 'End Date', 'Type', 'Team Members']}
                                    message={(error as Error)?.message ?? 'Error loading opportunity activities'}/>
    } else {
        const [records, count] = data

        if (records.length === 0) {
            content =
                <NoDataTable columns={['Name', 'Start Date', 'End Date', 'Type', 'Team Members']} dataTypeName={'opportunity activity'} clearSearch={() => {
                    setSearch('')
                    setInterimSearch('')
                    setPage(1)
                    setPerPage(25)
                    setSort({title: 'asc'})
                }}/>
        } else {
            content = <DataTable
                data={records}
                count={count}
                idKey={'guid'}
                columns={[{
                    title: 'Name',
                    key: 'title',
                    render: (row: OpportunityActivity) => <FormattedLink href={`/activities/${row.guid}`}>{row.title}</FormattedLink>,
                    sortable: true,
                }, {
                    title: 'Status',
                    key: 'status',
                    render: (row: OpportunityActivity) => <ActivityStatusBadge status={row.status}/>,
                },
                    {
                    title: 'Start Date',
                    key: 'startDate',
                    render: (row: OpportunityActivity) => <DateRenderer date={row.startDate} includeTime={row.type === ActivityType.SCHEDULED}/>,
                    sortable: true,
                }, {
                    title: 'End Date',
                    key: 'endDate',
                    render: (row: OpportunityActivity) => <DateRenderer date={row.endDate} includeTime={row.type === ActivityType.SCHEDULED}/>,
                    sortable: true,
                }, {
                    title: 'Type',
                    key: 'type',
                    render: (row: OpportunityActivity) => <div className={'flex items-center space-x-2'}>
                        <ActivityTypeIcon type={row.subType} baseType={row.type}/> {row.subType ? TaskScheduleTypeNameMapping[row.subType] : ActivityTypeNameMapping[row.type]}
                    </div>,
                }, {
                    title: 'Team Members',
                    key: 'assigned',
                    render: (row: OpportunityActivity) => <span>{englishList(row.assigned.map(name => name.split(' ')[0]))}</span>,
                }]}
                height={'70vh'}
                onPageChange={setPage}
                onPerPageChange={setPerPage}
                perPage={perPage}
                page={page}
                sortBy={sort}
                setSortBy={setSort}
                pageable
                pageSizeOptions={[10, 25, 50, 100]}
            />
        }
    }

    return <div className="space-y-4">
        <Input
            type="text"
            placeholder="Search activities..."
            value={interimSearch}
            onChange={(event) => setInterimSearch(event.target.value)}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    setSearch(interimSearch)
                }
            }}
            onBlur={() => setSearch(interimSearch)}
        />
        {content}
    </div>
}