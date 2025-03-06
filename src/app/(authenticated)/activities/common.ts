import {Sort} from "~/components/data/DataTable";
import {Activity as SearchActivity} from "~/app/(authenticated)/activities/client";
import {ActivityPriority, ActivityStatus, ActivityType, TaskScheduleType} from "~/common/enum/enumerations";
import {ToastResponse} from "~/util/api/client/APIClient";
import {API} from "~/util/api/ApiResponse";
import {ReadOrder} from "~/db/sql/types/model";
import {Activity} from "~/db/sql/models/Activity";
import {ReadWhere} from "~/db/sql/types/where";

export async function searchTasks(tenetId: Buffer | undefined, search: string, page: number, perPage: number, orderBy: Sort<SearchActivity>, filters?: {
    baseType?: ActivityType,
    type?: TaskScheduleType,
    status?: ActivityStatus,
    priority?: ActivityPriority,
    users?: string[], // Id[]
    contacts?: string[] // Id[]
}): Promise<[SearchActivity[], number] | ToastResponse> {
    const allowedSorts = new Set(['title', 'priority', 'endDate', 'startDate'])

    if (perPage > 100) {
        perPage = 100
    }

    for (const key in orderBy) {
        if (!allowedSorts.has(key)) {
            return API.toast(`Invalid sort field ${key}`, 'error', 400);
        }
    }

    const readOrderBy: ReadOrder<Activity> = {};

    for (const key in orderBy) {
        const _key = key as 'title' | 'priority' | 'endDate'
        readOrderBy[_key] = orderBy[_key] as 'asc' | 'desc'
    }

    const where: ReadWhere<Activity> = {
        title: {
            contains: search,
            mode: 'insensitive'
        },
        tenetId,
    };

    if (filters?.baseType) {
        where.type = filters.baseType;
    }

    if (filters?.type) {
        where.taskScheduleType = filters.type;
    }

    if (filters?.status) {
        where.status = filters.status;
    }

    if (filters?.priority) {
        where.priority = filters.priority;
    }

    if (filters?.users && filters.users.length > 0) {
        where.users = {
            some: {
                id: {
                    in: filters.users.filter(Boolean).map(user => Buffer.from(user, 'hex'))
                }
            }
        }
    }

    if (filters?.contacts && filters.contacts.length > 0) {
        where.contacts = {
            some: {
                id: {
                    in: filters.contacts.map(contact => Buffer.from(contact, 'hex'))
                }
            }
        }
    }

    return Promise.all([(await Activity.read({
        where: where,
        orderBy: readOrderBy,
        select: {
            id: true,
            title: true,
            taskScheduleType: true,
            status: true,
            priority: true,
            startDate: true,
            endDate: true,
            users: {
                select: {
                    id: true,
                    fullName: true
                }
            },
            contacts: {
                select: {
                    id: true,
                    fullName: true,
                    type: true,
                    emails: {
                        orderBy: {
                            isPrimary: 'desc',
                            createdAt: 'desc'
                        },
                        take: 1,
                    },
                    phones: {
                        orderBy: {
                            isPrimary: 'desc',
                            createdAt: 'desc'
                        },
                        take: 1,
                    },
                    addresses: {
                        orderBy: {
                            primary: 'desc',
                            createdAt: 'desc'
                        },
                        take: 1,
                    },
                }
            },
            tenetId: true
        },
        limit: perPage,
        offset: (page - 1) * perPage
    })).map(activity => ({
        guid: activity.guid.toString('hex'),
        title: activity.title,
        type: activity.taskScheduleType,
        status: activity.status,
        priority: activity.priority,
        startDate: activity.startDate,
        endDate: activity.endDate,
        users: activity.users.map(user => user.fullName),
        contacts: activity.contacts.map(contact => ({
            guid: contact.guid.toString('hex'),
            name: contact.fullName,
            primaryEmail: contact.primaryEmail ?? null,
            primaryPhone: contact.primaryPhone ?? null,
            primaryAddress: contact.primaryAddress?.address ?? null,
            type: contact.type,
        })),
        baseType: activity.type
    } as SearchActivity)), Activity.count(where)])

}