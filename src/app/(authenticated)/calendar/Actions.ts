'use server';
'use no memo';

import {User} from "~/db/sql/models/User";
import {Activity} from "~/db/sql/models/Activity";
import {ActivityType} from "~/common/enum/enumerations";
import {API} from "~/util/api/ApiResponse";

async function _fetchEvents(user: User, start: Date, end: Date, contactId?: string) {
    const events = await Activity.read({
        where: {
            contacts: contactId ? {
                some: {
                    id: Buffer.from(contactId, 'hex')
                }
            } : undefined,
            startDate: {
                gte: start
            },
            endDate: {
                lte: end
            },
            tenetId: user.tenetId ?? undefined,
            users: {
                some: {
                    id: user.guid
                }
            },
            type: ActivityType.SCHEDULED
        },
        orderBy: {
            startDate: 'asc'
        },
        select: {
            title: true,
            startDate: true,
            endDate: true,
            taskScheduleType: true,
            type: true
        }
    });

    return events.map(event => ({
        guid: event.guid.toString('hex'),
        title: event.title!,
        start: event.startDate!,
        end: event.endDate!,
        type: event.taskScheduleType!,
        baseType: event.type!
    }))
}

async function _getTasks(user: User, start: Date, end: Date) {
    const tasks = await Activity.read({
        where: {
            startDate: {
                gte: start
            },
            endDate: {
                lte: end
            },
            tenetId: user.tenetId ?? undefined,
            users: {
                some: {
                    id: user.guid
                }
            },
            type: ActivityType.TASK
        },
        orderBy: {
            startDate: 'asc',
            title: 'asc'
        },
        select: {
            title: true,
            status: true,
            endDate: true, // Checking for overdue tasks
            priority: true,
        }
    })

    return tasks.map(task => ({
        guid: task.guid.toString('hex'),
        title: task.title!,
        status: task.status!,
        endDate: task.endDate!,
        priority: task.priority!
    }))
}

export const fetchEvents = API.serverAction(_fetchEvents);
export const getTasks = API.serverAction(_getTasks);