import {User} from "~/db/sql/models/User";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import TodayDashboard from "~/app/(authenticated)/client";
import {ActivityType} from "~/common/enum/enumerations";
import {Activity} from "~/db/sql/models/Activity";
import {ContactTimelineEvent, TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";

const Dashboard = async ({requester}: { requester: User }) => {
    // Eventually will use office schedule data
    const dateStart = new Date();
    dateStart.setDate(dateStart.getDate() - 1);

    const dateEnd = new Date();
    dateEnd.setDate(dateEnd.getDate() + 1);

    const [appointments, tasks, recentInteractions] = await Promise.all([
        Activity.read({
            where: {
                users: {
                    some: {
                        id: requester.guid
                    }
                },
                type: ActivityType.SCHEDULED,
                tenetId: requester.tenetId ?? undefined,
                startDate: {
                    gte: dateStart
                },
                endDate: {
                    lte: dateEnd
                }
            },
            select: {
                title: true,
                type: true,
                taskScheduleType: true,
                startDate: true,
                endDate: true,
                contacts: {
                    select: {
                        fullName: true
                    }
                }
            },
            limit: 5,
            offset: 0
        }),
        Activity.read({
            where: {
                users: {
                    some: {
                        id: requester.guid
                    }
                },
                type: ActivityType.TASK,
                tenetId: requester.tenetId ?? undefined,
                startDate: {
                    gte: dateStart
                },
                endDate: {
                    lte: dateEnd
                }
            },
            select: {
                title: true,
                priority: true,
                description: true,
                startDate: true,
                endDate: true,
                contacts: {
                    select: {
                        fullName: true
                    }
                },
                assignedBy: {
                    select: {
                        fullName: true
                    }
                }
            },
            limit: 5,
            offset: 0
        }),
        ContactTimelineEvent.read({
            where: {
                userId: requester.guid,
                tenetId: requester.tenetId ?? undefined
            },
            select: TimelineSelect,
            orderBy: {
                createdAt: 'desc'
            },
            limit: 5,
            offset: 0
        })
    ])

    return <TodayDashboard
        userData={{
            guid: requester.guid.toString('hex'),
            name: requester.fullName!,
        }}
        appointments={appointments.map(apt => ({
            guid: apt.guid.toString('hex'),
            title: apt.title,
            type: apt.taskScheduleType!,
            start: apt.startDate,
            end: apt.endDate,
            with: apt.contacts.map(contact => ({
                guid: contact.guid.toString('hex'),
                name: contact.fullName!
            }))
        }))}
        tasks={tasks.map(task => ({
            guid: task.guid.toString('hex'),
            title: task.title,
            priority: task.priority,
            description: task.description,
            startDate: task.startDate,
            dueDate: task.endDate,
            with: task.contacts.map(contact => ({
                guid: contact.guid.toString('hex'),
                name: contact.fullName!
            })),
            assignedBy: task.assignedBy.fullName
        }))}
        recentInteractions={recentInteractions.map(toFeedItem)}/>
}

export default withAuthentication(Dashboard);