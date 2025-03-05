import React from "react";
import {QueryWrapper} from "~/components/util/QueryWrapper";
import {Activity as ClientActivity, ClientActivityDetails, SubActivity, Waypoint} from "~/app/(authenticated)/activities/[guid]/client";
import {Activity} from "~/db/sql/models/Activity";
import {getAuthSession} from "~/util/auth/AuthUtils";
import {notFound, redirect} from "next/navigation";
import {ActivityType, RoleNameMapping} from "~/common/enum/enumerations";
import {withAuthentication} from "~/util/auth/AuthComponentUtils";
import {User} from "~/db/sql/models/User";
import {differenceInDays} from "date-fns";
import ModelSet from "~/util/db/ModelSet";

const getActivity = React.cache(async (guid: string, tenetId?: Buffer): Promise<ClientActivity | null> => {
    const firstByte = guid.substring(0, 2);
    let type = ActivityType.PATH;
    if (firstByte === '01') {
        type = ActivityType.PATH;
    } else if (firstByte === '02') {
        type = ActivityType.WAYPOINT;
    } else if (firstByte === '03') {
        type = ActivityType.TASK;
    } else if (firstByte === '04') {
        type = ActivityType.SCHEDULED;
    } else {
        return null;
    }

    switch (type) {
        case ActivityType.PATH: {
            const activity = await Activity.readUnique({
                where: {
                    id: Buffer.from(guid, 'hex'),
                    tenetId: tenetId
                },
                select: {
                    waypoints: {
                        select: {
                            title: true,
                            status: true,
                            actualStart: true,
                            dueDate: true,
                            actualEnd: true,
                            users: {
                                select: {
                                    id: true,
                                    fullName: true
                                }
                            },
                            summary: true,
                            description: true,
                            order: true,
                            templateId: true,
                        },
                        orderBy: {
                            order: 'asc'
                        }
                    },
                    activities: {
                        select: {
                            title: true,
                            order: true,
                            type: true,
                            taskScheduleType: true, // subType
                            description: true,
                            priority: true,
                            status: true,
                            completedAt: true,
                            startDate: true,
                            endDate: true,
                            users: {
                                select: {
                                    id: true,
                                    fullName: true,
                                }
                            },
                            steps: {
                                select: {
                                    title: true,
                                    completed: true,
                                    type: true,
                                    order: true,
                                    assignedTo: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                        }
                                    }
                                },
                                orderBy: {
                                    order: 'asc'
                                }
                            },
                            parentWaypointId: true,
                            templateId: true
                        }
                    },
                    template: {
                        select: {
                            childActivities: {
                                select: {
                                    order: true,
                                    title: true,
                                    type: true,
                                    taskScheduleType: true, // subType
                                    description: true,
                                    defaultPriority: true,
                                    defaultStatus: true,
                                    startDate: true,
                                    endDate: true,
                                    dateOffsetType: true,
                                    startRelativeToId: true,
                                    parentWaypointId: true,
                                    assignments: {
                                        select: {
                                            specificUser: {
                                                select: {
                                                    id: true,
                                                    fullName: true
                                                }
                                            },
                                            specificRole: true
                                        }
                                    },
                                    steps: {
                                        select: {
                                            title: true,
                                            type: true,
                                            order: true,
                                            assignedTo: {
                                                select: {
                                                    specificUser: {
                                                        select: {
                                                            id: true,
                                                            fullName: true,
                                                        }
                                                    },
                                                    specificRole: true
                                                }
                                            },
                                        },
                                        orderBy: {
                                            order: 'asc'
                                        }
                                    }
                                },
                                orderBy: {
                                    order: 'asc'
                                }
                            },
                            waypoints: {
                                select: {
                                    id: true,
                                    title: true,
                                    order: true,
                                    defaultStatus: true,
                                    dateOffsetType: true,
                                    dueDate: true,
                                    description: true,
                                    assignments: {
                                        select: {
                                            specificUser: {
                                                select: {
                                                    id: true,
                                                    fullName: true
                                                }
                                            },
                                            specificRole: true
                                        }
                                    },
                                },
                                orderBy: {
                                    order: 'asc'
                                }
                            }
                        }
                    },
                    title: true,
                    type: true,
                    taskScheduleType: true, // subType
                    description: true,
                    priority: true,
                    status: true,
                    completedAt: true,
                    startDate: true,
                    endDate: true,
                    contacts: {
                        select: {
                            id: true,
                            fullName: true,
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
                            type: true,
                        }
                    },
                    users: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                }
            })

            if (activity == null) {
                return null;
            }

            const subActivities = [] as SubActivity[];
            const waypoints = [] as Waypoint[];

            const usedTemplateWaypoints = new Set<string>();
            const mapping = new Map<string, string>();
            for (const _waypoint of activity.waypoints) {
                if (_waypoint.templateId != null) {
                    usedTemplateWaypoints.add(_waypoint.templateId.toString('hex'));
                    mapping.set(_waypoint.guid.toString('hex'), _waypoint.templateId.toString('hex'));
                }
            }

            const remainingTemplateWaypoints = new ModelSet<Exclude<typeof activity['template'], null>['waypoints'][number]>();
            for (const template of activity.template?.waypoints ?? []) {
                if (!usedTemplateWaypoints.has(template.guid.toString('hex'))) {
                    remainingTemplateWaypoints.add(template);
                }
            }

            const usedTemplates = new Set<string>();
            for (const _activity of activity.activities) {
                if (_activity.templateId != null) {
                    usedTemplates.add(_activity.templateId.toString('hex'));
                }
            }

            const remainingTemplates = new ModelSet<Exclude<typeof activity['template'], null>['childActivities'][number]>();
            for (const template of activity.template?.childActivities ?? []) {
                if (!usedTemplates.has(template.guid.toString('hex'))) {
                    remainingTemplates.add(template);
                }
            }

            for (const act of activity.activities) {
                subActivities.push({
                    guid: act.guid.toString('hex'),
                    title: act.title,
                    type: act.type,
                    subType: act.taskScheduleType,
                    description: act.description,
                    priority: act.priority,
                    status: act.status,
                    completedAt: act.completedAt,
                    startDate: act.startDate,
                    endDate: act.endDate,
                    waypoint: act.parentWaypointId?.toString('hex'),
                    steps: act.steps.map(step => {
                        return {
                            guid: step.guid.toString('hex'),
                            type: step.type,
                            title: step.title,
                            completed: step.completed,
                            order: step.order,
                            assignedTo: step.assignedTo.map(user => user.fullName),
                        }
                    }),
                    timeline: [],
                    users: act.users.map(user => user.fullName),
                } as SubActivity)
            }

            for (const obj of activity.waypoints) {
                const days = differenceInDays(obj.dueDate, obj.actualStart);

                waypoints.push({
                    guid: obj.guid.toString('hex'),
                    title: obj.title,
                    status: obj.status,
                    actualStart: obj.actualStart,
                    days,
                    actualEnd: obj.actualEnd,
                    users: obj.users.map(user => user.fullName),
                    description: obj.description,
                    summary: obj.summary,
                    order: obj.order,
                } as Waypoint)
            }

            for (const template of remainingTemplates) {
                let parentWaypoint = mapping.get(template.parentWaypointId?.toString('hex') ?? '');

                if (parentWaypoint == null && template.parentWaypointId != null) {
                    parentWaypoint = template.parentWaypointId.toString('hex');
                } else {
                    parentWaypoint = undefined;
                }

                subActivities.push({
                    guid: template.guid.toString('hex'),
                    title: template.title,
                    type: template.type,
                    subType: template.taskScheduleType,
                    description: template.description,
                    priority: template.defaultPriority,
                    status: template.defaultStatus,
                    startDate: template.startDate,
                    endDate: template.endDate,
                    offsetType: template.dateOffsetType,
                    dateRelativeTo: template.startRelativeToId?.toString('hex'),
                    timeline: [],
                    waypoint: parentWaypoint,
                    steps: template.steps.map(step => ({
                        guid: step.guid.toString('hex'),
                        type: step.type,
                        title: step.title,
                        completed: false,
                        order: step.order,
                        assignedTo: step.assignedTo.map(assignment => {
                            if (assignment.specificUserId != null) {
                                return assignment.specificUser!.fullName
                            }
                            return RoleNameMapping[assignment.specificRole!]
                        }),
                    })),
                    users: template.assignments.map(assignment => assignment.specificUser?.fullName ?? RoleNameMapping[assignment.specificRole!]),
                } as SubActivity)
            }

            for (const obj of remainingTemplateWaypoints) {
                waypoints.push({
                    guid: obj.guid.toString('hex'),
                    title: obj.title,
                    status: obj.defaultStatus,
                    days: obj.dueDate,
                    users: obj.assignments.map(assignment => {
                        if (assignment.specificUserId != null) {
                            return assignment.specificUser!.fullName;
                        }
                        return RoleNameMapping[assignment.specificRole!];
                    }),
                    description: obj.description,
                    order: obj.order,
                } as Waypoint)
            }

            return {
                guid: activity.guid.toString('hex'),
                title: activity.title,
                type: activity.type,
                subType: null,
                description: activity.description,
                priority: activity.priority,
                status: activity.status,
                contacts: activity.contacts.map(contact => ({
                    guid: contact.guid.toString('hex'),
                    fullName: contact.fullName,
                    primaryEmail: contact.primaryEmail ?? null,
                    primaryPhone: contact.primaryPhone ?? null,
                    type: contact.type,
                    primaryAddress: contact.primaryAddress?.address ?? null,
                })),
                assignedBy: activity.assignedBy.fullName,
                waypoints,
                activities: subActivities,
                timeline: [],
                completedAt: activity.completedAt,
                startDate: activity.startDate,
                endDate: activity.endDate,
                users: activity.users.map(user => user.fullName),
            } as ClientActivity
        }
        case ActivityType.WAYPOINT: {
            const activity = await Activity.readUnique({
                where: {
                    id: Buffer.from(guid, 'hex'),
                    tenetId: tenetId
                },
                select: {
                    activities: {
                        select: {
                            title: true,
                            order: true,
                            type: true,
                            taskScheduleType: true, // subType
                            description: true,
                            priority: true,
                            status: true,
                            completedAt: true,
                            startDate: true,
                            endDate: true,
                            users: {
                                select: {
                                    id: true,
                                    fullName: true,
                                }
                            },
                            steps: {
                                select: {
                                    title: true,
                                    completed: true,
                                    type: true,
                                    order: true,
                                    assignedTo: {
                                        select: {
                                            id: true,
                                            fullName: true,
                                        }
                                    }
                                },
                                orderBy: {
                                    order: 'asc'
                                }
                            },
                        }
                    },
                    title: true,
                    type: true,
                    taskScheduleType: true, // subType
                    description: true,
                    priority: true,
                    status: true,
                    completedAt: true,
                    startDate: true,
                    endDate: true,
                    contacts: {
                        select: {
                            id: true,
                            fullName: true,
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
                            type: true,
                        }
                    },
                    users: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                }
            })

            if (activity == null) {
                return null;
            }

            return {
                guid: activity.guid.toString('hex'),
                title: activity.title,
                type: activity.type,
                subType: null,
                description: activity.description,
                priority: activity.priority,
                status: activity.status,
                contacts: activity.contacts.map(contact => ({
                    guid: contact.guid.toString('hex'),
                    fullName: contact.fullName,
                    primaryEmail: contact.primaryEmail ?? null,
                    primaryPhone: contact.primaryPhone ?? null,
                    type: contact.type,
                    primaryAddress: contact.primaryAddress?.address ?? null,
                })),
                assignedBy: activity.assignedBy.fullName,
                waypoints: [],
                activities: activity.activities.map(act => ({
                    guid: act.guid.toString('hex'),
                    title: act.title,
                    type: act.type,
                    subType: act.taskScheduleType,
                    description: act.description,
                    priority: act.priority,
                    status: act.status,
                    completedAt: act.completedAt,
                    startDate: act.startDate,
                    endDate: act.endDate,
                    steps: act.steps.map(step => ({
                        guid: step.guid.toString('hex'),
                        type: step.type,
                        title: step.title,
                        completed: false,
                        order: step.order,
                        assignedTo: step.assignedTo.map(user => user.fullName),
                    })),
                    timeline: [],
                    users: act.users.map(user => user.fullName),
                })),
                users: activity.users.map(user => user.fullName),
                timeline: [],
                completedAt: activity.completedAt,
                startDate: activity.startDate,
                endDate: activity.endDate,
            }
        }

        case ActivityType.TASK:
        case ActivityType.SCHEDULED: {
            const activity = await Activity.readUnique({
                where: {
                    id: Buffer.from(guid, 'hex'),
                    tenetId: tenetId
                },
                select: {
                    title: true,
                    type: true,
                    taskScheduleType: true, // subType
                    description: true,
                    priority: true,
                    status: true,
                    completedAt: true,
                    startDate: true,
                    endDate: true,
                    parentActivity: true,
                    contacts: {
                        select: {
                            id: true,
                            fullName: true,
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
                            type: true,
                        }
                    },
                    users: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                    assignedBy: {
                        select: {
                            id: true,
                            fullName: true,
                        }
                    },
                }
            })

            if (activity == null) {
                return null;
            }

            return {
                guid: activity.guid.toString('hex'),
                title: activity.title,
                type: activity.type,
                subType: activity.taskScheduleType,
                description: activity.description,
                priority: activity.priority,
                status: activity.status,
                contacts: activity.contacts.map(contact => ({
                    guid: contact.guid.toString('hex'),
                    fullName: contact.fullName,
                    primaryEmail: contact.primaryEmail ?? null,
                    primaryPhone: contact.primaryPhone ?? null,
                    type: contact.type,
                    primaryAddress: contact.primaryAddress?.address ?? null,
                })),
                assignedBy: activity.assignedBy.fullName,
                waypoints: [],
                activities: [],
                timeline: [],
                completedAt: activity.completedAt,
                startDate: activity.startDate,
                endDate: activity.endDate,
                parentActivity: activity.parentActivity ? {
                    guid: activity.parentActivity.guid.toString('hex'),
                    title: activity.parentActivity.title
                } : undefined,
                users: activity.users.map(user => user.fullName),
            }
        }
    }
})

type Props = {
    params: Promise<{ guid: string }>;
}

export async function generateMetadata({params}: Props) {
    const requester = await getAuthSession();
    if (requester == 'refresh' || requester == null) {
        return redirect('/login');
    }
    const id = (await params).guid;
    const activity = await getActivity(id, requester.tenetId ?? undefined);

    if (activity == null) {
        return notFound();
    }

    return {
        title: activity.title,
    }
}

const ActivityDetailsWorkspace = async ({requester, params, searchParams}: { requester: User, params: Promise<{ guid: string }>, searchParams: Promise<{ goBack?: string }> }) => {
    const activity = await getActivity((await params).guid, requester.tenetId ?? undefined);

    if (activity == null) {
        return notFound();
    }

    const goBack = (await searchParams).goBack === 'true'

    return <QueryWrapper>
        <ClientActivityDetails activity={activity} goBack={goBack}/>
    </QueryWrapper>
}

export default withAuthentication(ActivityDetailsWorkspace);