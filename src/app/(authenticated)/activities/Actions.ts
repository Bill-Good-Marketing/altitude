'use server';
import {ActivityStep} from "~/db/sql/models/ActivityStep";
import {ClientActivity} from "~/app/(authenticated)/activities/ActivityForm";
import {User} from "~/db/sql/models/User";
import {
    ActivityPriority,
    ActivityStatus,
    ActivityStatusNameMapping,
    ActivityType,
    ActivityTypeNameMapping,
    ContactTimelineEventJoinType,
    ContactTimelineEventType,
    TaskScheduleType
} from "~/common/enum/enumerations";
import {Activity as SearchActivity} from "~/app/(authenticated)/activities/client";
import {Sort} from "~/components/data/DataTable";
import {API} from "~/util/api/ApiResponse";
import {ToastResponse} from "~/util/api/client/APIClient";
import {Activity} from "~/db/sql/models/Activity";
import {Note} from "~/db/sql/models/Note";
import ModelSet from "~/util/db/ModelSet";
import {isEmptyString} from "~/util/strings";
import {ReadWhere} from "~/db/sql/types/where";
import {Contact} from "~/db/sql/models/Contact";
import {ContactTimelineEvent, TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ReadResult} from "~/db/sql/types/model";
import {ActivityWaypoint} from "~/db/sql/models/ActivityWaypoint";
import {searchTasks as server_searchTasks} from "~/app/(authenticated)/activities/common";

'use no memo';

const _searchTasks = async (user: User, search: string, page: number, count: number, sortBy: Sort<SearchActivity>, filters?: {
    baseType?: ActivityType,
    type?: TaskScheduleType,
    status?: ActivityStatus,
    priority?: ActivityPriority,
    users?: string[], // Id[]
    contacts?: string[] // Id[]
}) => {
    return await server_searchTasks(user.tenetId ?? undefined, search, page, count, sortBy, filters);
}

const _getActivity = async (user: User, guid: string, includeNotes: boolean = false): Promise<ClientActivity | null | ToastResponse> => {
    const activity = await Activity.readUnique({
        where: {
            id: Buffer.from(guid, 'hex'),
            tenetId: user.tenetId ?? undefined,
        },
        select: {
            title: true,
            type: true,
            taskScheduleType: true,
            startDate: true,
            endDate: true,
            location: true,
            phoneNumber: true,
            holdReason: true,
            contacts: {
                select: {
                    id: true,
                    fullName: true,
                    primaryEmail: true,
                    type: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            users: {
                select: {
                    id: true,
                    fullName: true,
                    email: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            description: true,
            events: {
                orderBy: {
                    createdAt: 'desc'
                },
                select: TimelineSelect,
                take: 5
            },
            notes: includeNotes ? {
                select: {
                    content: true,
                    author: {
                        select: {
                            fullName: true
                        }
                    },
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            } : undefined,
            waypoints: {
                select: {
                    title: true,
                    status: true,
                    actualStart: true,
                    dueDate: true,
                    users: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    },
                    description: true,
                },
                orderBy: {
                    order: 'asc'
                }
            },
            activities: {
                select: {
                    title: true,
                    type: true,
                    taskScheduleType: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    priority: true,
                    description: true,
                    parentWaypointId: true,
                    steps: {
                        select: {
                            title: true,
                            type: true,
                            order: true,
                            completed: true,
                            assignedTo: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    email: true
                                }
                            }
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
            status: true,
            priority: true
        }
    })

    if (!activity) {
        return API.toast('Activity not found', 'error', 404);
    }

    return {
        guid: activity.guid.toString('hex'),
        title: activity.title,
        type: activity.type,
        subType: activity.taskScheduleType,
        startDate: activity.startDate,
        endDate: activity.endDate,
        contacts: activity.contacts.map(contact => ({
            guid: contact.guid.toString('hex'),
            fullName: contact.fullName,
            primaryEmail: contact.primaryEmail,
            type: contact.type
        })),
        users: activity.users.map(user => ({
            guid: user.guid.toString('hex'),
            fullName: user.fullName,
            email: user.email
        })),
        notes: includeNotes ? activity.notes?.map((note: Note) => ({
            guid: note.guid.toString('hex'),
            content: note.content!,
            author: note.author!.fullName!,
            createdAt: note.createdAt!
        })) : undefined,
        description: activity.description,
        events: activity.events.map(event => toFeedItem(event)),
        status: activity.status!,
        priority: activity.priority,
        location: activity.location,
        phoneNumber: activity.phoneNumber,
        holdReason: activity.holdReason,
        waypoints: activity.waypoints.map(waypoint => ({
            guid: waypoint.guid.toString('hex'),
            _id: waypoint.guid.toString('hex'),
            title: waypoint.title,
            status: waypoint.status,
            start: waypoint.actualStart,
            end: waypoint.dueDate,
            users: waypoint.users.map(user => ({
                fullName: user.fullName,
                guid: user.guid.toString('hex'),
                email: user.email!,
            })),
            description: waypoint.description ?? undefined,
            useSpecificDate: true,
        })),
        childActivities: activity.activities.map(activity => ({
            guid: activity.guid.toString('hex'),
            _id: activity.guid.toString('hex'),
            title: activity.title,
            type: activity.type,
            subType: activity.taskScheduleType ?? undefined,
            start: activity.startDate,
            end: activity.endDate,
            description: activity.description,
            status: activity.status,
            priority: activity.priority,
            steps: activity.steps.map(step => ({
                guid: step.guid.toString('hex'),
                _id: step.guid.toString('hex'),
                title: step.title,
                type: step.type,
                order: step.order,
                completed: step.completed,
                assignedTo: step.assignedTo.map(user => ({
                    guid: user.guid.toString('hex'),
                    fullName: user.fullName,
                    email: user.email
                }))
            })),
            waypoint: activity.parentWaypointId?.toString('hex'),
        }))
    }
}

const _createNote = async (user: User, activityId: string, content: string) => {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to create a note', 'error', 400);
    }

    const activity = await Activity.readUnique({
        where: {
            id: Buffer.from(activityId, 'hex'),
            tenetId: user.tenetId
        },
        select: {
            contacts: true
        }
    })

    if (!activity) {
        return API.toast('Activity not found', 'error', 404);
    }

    const note = new ContactTimelineEvent(undefined, {
        note: new Note(undefined, {
            content,
            activityId: activity.guid,
            tenetId: user.tenetId,
            authorId: user.guid,
        }),
        eventType: ContactTimelineEventType.NOTE,
        user: user,
        tenetId: user.tenetId,
        contacts: activity.contacts.map(contact => {
            contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.CONTACT_TARGET;
            return contact as Contact;
        }),
        activityId: activity.guid,
    })

    await note.commit();

    note.createdAt = new Date();

    return toFeedItem(note as ReadResult<ContactTimelineEvent, typeof TimelineSelect>);
}

const _getActivityTimeline = async (user: User, activity: string, offset: number, count: number, waypoint?: boolean): Promise<[FeedItem[], number]> => {
    if (count > 5) {
        count = 5;
    }

    const where: ReadWhere<ContactTimelineEvent> = {
        OR: waypoint ? undefined : [{
            activityId: Buffer.from(activity, 'hex')
        }, {
            activity: {
                parentActivityId: Buffer.from(activity, 'hex')
            }
        }],
        tenetId: user.tenetId ?? undefined,
        waypointId: waypoint ? Buffer.from(activity, 'hex') : undefined
    };

    return Promise.all([(await ContactTimelineEvent.read({
        where,
        orderBy: {
            createdAt: 'desc'
        },
        select: TimelineSelect,
        limit: count,
        offset
    })).map(toFeedItem), ContactTimelineEvent.count(where)])
}

const _createActivity = async (user: User, activity: ClientActivity, initialNote?: string) => {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to create an activity', 'error', 400);
    }

    if (activity.type == null) {
        return API.toast('Activity type is required', 'error', 400);
    } else if (activity.subType == null && (activity.type === ActivityType.SCHEDULED || activity.type === ActivityType.TASK)) {
        return API.toast('Activity sub-type is required', 'error', 400);
    } else if (activity.startDate == null) {
        return API.toast('Activity start date is required', 'error', 400);
    } else if (activity.endDate == null) {
        return API.toast('Activity due date is required', 'error', 400);
    }

    const activityObj = new Activity(undefined, {
        title: activity.title,
        type: activity.type,
        taskScheduleType: activity.subType,
        startDate: activity.startDate,
        endDate: activity.endDate,
        tenetId: user.tenetId,
        description: activity.description,
        priority: activity.priority,
        status: activity.status,
        location: activity.location,
        assignedById: user.guid,
        contacts: activity.contacts.map(contact => new Contact(contact.guid)),
        users: activity.users.map(user => new User(user.guid)),
        notes: !isEmptyString(initialNote) ? [
            new Note(undefined, {
                content: initialNote ?? '',
                tenetId: user.tenetId,
                authorId: user.guid,
            })
        ] : []
    })

    if (activity.type === ActivityType.PATH) {
        // Add child activities and waypoints
        const waypointMap: Record<string, ActivityWaypoint> = {}
        const waypointChildrenCounts: Record<string, number> = {}

        activityObj.waypoints = activity.waypoints.map((waypoint, idx) => {
            let start = waypoint.start;

            if (waypoint.start == null && idx === 0) {
                start = new Date(activityObj.startDate!);
            }

            const _waypoint = new ActivityWaypoint(undefined, {
                title: waypoint.title,
                description: waypoint.description,
                status: waypoint.status,
                order: idx,
                actualStart: start,
                dueDate: waypoint.end,
                users: waypoint.users.map(user => new User(user.guid)),
                tenetId: user.tenetId!,
                events: [
                    new ContactTimelineEvent(undefined, {
                        eventType: ContactTimelineEventType.WAYPOINT_CREATED,
                        userId: user.guid,
                        tenetId: user.tenetId!,
                        activityId: activityObj.guid,
                        contacts: activity.contacts.map(contact => new Contact(contact.guid, {
                            contactTimelineRelationshipType: ContactTimelineEventJoinType.ACTIVITY_CONTACT
                        })),
                    })
                ],
            })
            waypointMap[waypoint._id] = _waypoint;
            return _waypoint;
        })

        let missingWaypoints = false
        activityObj.activities = activity.childActivities.map((act) => {
            if (act.waypoint == null || missingWaypoints) {
                missingWaypoints = true;
                return;
            }
            const waypoint = waypointMap[act.waypoint]
            waypointChildrenCounts[act.waypoint] = (waypointChildrenCounts[act.waypoint] ?? 0) + 1;
            return new Activity(undefined, {
                title: act.title,
                type: act.type,
                taskScheduleType: act.subType,
                description: act.description,
                priority: act.priority,
                status: act.status,
                contacts: activityObj.contacts,
                users: waypoint.users,
                parentWaypointId: waypoint.guid,
                assignedById: user.guid,
                tenetId: user.tenetId!,
                steps: act.steps.map((step, idx) => new ActivityStep(undefined, {
                    title: step.title,
                    type: step.type,
                    order: idx,
                    completed: false,
                    tenetId: user.tenetId!,
                    assignedTo: step.assignedTo.map(assignment => new User(assignment.guid))
                })),
                order: waypointChildrenCounts[act.waypoint] - 1,
                startDate: act.start,
                endDate: act.end,
            });
        }).filter(Boolean) as Activity[];

        if (missingWaypoints) {
            return API.toast('While creating an activity related to a waypoint, the waypoint was not found. This is a developer error, please contact the site administrator.', 'error', 500);
        }
    }
    else if (activity.type === ActivityType.WAYPOINT) {
        // Add child activities but not waypoints
        activityObj.activities = activity.childActivities.map((act, idx) => {
            return new Activity(undefined, {
                title: act.title,
                type: act.type,
                taskScheduleType: act.subType,
                description: act.description,
                priority: act.priority,
                status: act.status,
                contacts: activityObj.contacts,
                users: activityObj.users,
                assignedById: user.guid,
                tenetId: user.tenetId!,
                steps: act.steps.map((step, idx) => new ActivityStep(undefined, {
                    title: step.title,
                    type: step.type,
                    order: idx,
                    completed: false,
                    tenetId: user.tenetId!,
                    assignedTo: step.assignedTo.map(assignment => new User(assignment.guid))
                })),
                order: idx,
                startDate: act.start,
                endDate: act.end,
            });
        })
    }

    await activityObj.commit();

    return API.toast('Activity created', 'success', 200);
}

const _updateActivity = async (user: User, activity: ClientActivity) => {
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to update an activity', 'error', 400);
    }

    if (activity.guid == null) {
        return API.toast('Activity GUID is required to update. Please create the activity first.', 'error', 400);
    }

    if (activity.type == null) {
        return API.toast('Activity type is required to update. This is a bug.', 'error', 500)
    }

    const activityObj = await Activity.readUnique({
        where: {
            id: Buffer.from(activity.guid, 'hex'),
            tenetId: user.tenetId
        },
        select: {
            title: true,
            type: true,
            taskScheduleType: true,
            startDate: true,
            endDate: true,
            location: true,
            phoneNumber: true,
            holdReason: true,
            contacts: {
                select: {
                    id: true,
                },
            },
            users: {
                select: {
                    id: true,
                },
            },
            description: true,
            notes: {
                select: {
                    content: true,
                    author: {
                        select: {
                            fullName: true
                        }
                    },
                    createdAt: true
                },
                orderBy: {
                    createdAt: 'desc'
                }
            },
            waypoints: {
                select: {
                    title: true,
                    status: true,
                    actualStart: true,
                    dueDate: true,
                    users: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    },
                    events: {
                        select: {
                            id: true,
                            userId: true,
                            activityId: true,
                            tenetId: true,
                            contacts: {
                                select: {
                                    id: true,
                                }
                            },
                            eventType: true,
                        }
                    },
                    order: true,
                    description: true,
                    tenetId: true,
                },
                orderBy: {
                    order: 'asc'
                }
            },
            activities: {
                select: {
                    title: true,
                    type: true,
                    taskScheduleType: true,
                    startDate: true,
                    endDate: true,
                    status: true,
                    priority: true,
                    description: true,
                    parentWaypointId: true,
                    assignedById: true,
                    tenetId: true,
                    order: true,
                    contacts: {
                        select: {
                            id: true,
                        }
                    },
                    users: {
                        select: {
                            id: true,
                        }
                    },
                    // events: {
                    //     select: {
                    //         id: true,
                    //         userId: true,
                    //         activityId: true,
                    //         tenetId: true,
                    //         contacts: {
                    //             select: {
                    //                 id: true,
                    //             }
                    //         },
                    //         eventType: true,
                    //     }
                    // },
                    steps: {
                        select: {
                            title: true,
                            type: true,
                            order: true,
                            completed: true,
                            tenetId: true,
                            assignedTo: {
                                select: {
                                    id: true,
                                }
                            }
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
            status: true,
            priority: true
        }
    })

    if (!activityObj) {
        return API.toast('Activity not found', 'error', 404);
    }

    if (activity.subType == null && (activity.type === ActivityType.SCHEDULED || activity.type === ActivityType.TASK)) {
        return API.toast('Activity sub-type is required', 'error', 400);
    } else if (activity.startDate == null) {
        return API.toast('Activity start date is required', 'error', 400);
    } else if (activity.endDate == null) {
        return API.toast('Activity due date is required', 'error', 400);
    }

    activityObj.title = activity.title;
    activityObj.type = activity.type!;
    activityObj.location = activity.location;
    activityObj.taskScheduleType = activity.subType;
    activityObj.startDate = activity.startDate;
    activityObj.endDate = activity.endDate;
    activityObj.location = activity.location;
    activityObj.description = activity.description;
    activityObj.status = activity.status;
    activityObj.priority = activity.priority;
    if (activity.type === ActivityType.SCHEDULED) {
        activityObj.phoneNumber = activity.phoneNumber;
        activityObj.holdReason = activity.holdReason;
    }

    const curContacts = new ModelSet(activityObj.contacts as Contact[]);
    const newContacts = new ModelSet(activity.contacts.map(contact => new Contact(contact.guid)));
    const intersection = curContacts.intersection(newContacts);

    const added = curContacts.addedTo(newContacts);
    const removed = curContacts.removed(newContacts);

    activityObj.users = activity.users.map(user => new User(user.guid) as typeof activityObj['users'][number]);
    activityObj.contacts = newContacts.toArray() as typeof activityObj['contacts'];

    const newWaypoints: Record<string, ActivityWaypoint> = {}
    const waypoints: Record<string, ActivityWaypoint> = {}

    const oldWaypoints = new ModelSet(activityObj.waypoints);
    const oldActivities = new ModelSet(activityObj.activities);

    if (activity.type === ActivityType.PATH) {
        activityObj.waypoints = activity.waypoints.map((waypoint, idx) => {
            if (waypoint.guid == null) {
                let start = waypoint.start;
                if (waypoint.start == null && idx === 0) {
                    start = new Date(activityObj.startDate!);
                }
                const _waypoint = new ActivityWaypoint(undefined, {
                    title: waypoint.title,
                    description: waypoint.description,
                    status: waypoint.status,
                    order: idx,
                    actualStart: start,
                    dueDate: waypoint.end,
                    users: waypoint.users.map(user => new User(user.guid)),
                    tenetId: user.tenetId!,
                    events: [
                        new ContactTimelineEvent(undefined, {
                            eventType: ContactTimelineEventType.WAYPOINT_CREATED,
                            userId: user.guid,
                            tenetId: user.tenetId!,
                            contacts: activity.contacts.map(contact => new Contact(contact.guid, {
                                contactTimelineRelationshipType: ContactTimelineEventJoinType.ACTIVITY_CONTACT
                            })),
                        })
                    ],
                })
                newWaypoints[waypoint._id] = _waypoint;
                waypoints[_waypoint.guid.toString('hex')] = _waypoint;

                return _waypoint;
            }
            const _waypoint = new ActivityWaypoint(waypoint.guid, {
                title: waypoint.title,
                description: waypoint.description,
                status: waypoint.status,
                order: idx,
                actualStart: waypoint.start,
                dueDate: waypoint.end,
                users: waypoint.users.map(user => new User(user.guid)),
                events: [
                    new ContactTimelineEvent(undefined, {
                        eventType: ContactTimelineEventType.WAYPOINT_CREATED,
                        userId: user.guid,
                        tenetId: user.tenetId!,
                        contacts: activity.contacts.map(contact => new Contact(contact.guid, {
                            contactTimelineRelationshipType: ContactTimelineEventJoinType.ACTIVITY_CONTACT
                        })),
                    })
                ],
            })

            _waypoint.old = oldWaypoints.get(waypoint.guid) as ActivityWaypoint;
            _waypoint.tenetId = oldWaypoints.get(waypoint.guid)?.tenetId;

            waypoints[waypoint.guid] = _waypoint;
            return _waypoint;
        }) as typeof activityObj.waypoints
    }

    let idx = 0;
    const newActivities: Activity[] = [];
    for (const act of activity.childActivities) {
        if (activity.type === ActivityType.PATH) {
            if (act.waypoint == null) {
                return API.toast('While creating an activity related to a waypoint, the waypoint was not found. This is a developer error, please contact the site administrator.', 'error', 500);
            }

            let waypointId = act.waypoint;
            if (waypointId in newWaypoints) {
                waypointId = newWaypoints[waypointId].guid.toString('hex');
            }
            const waypoint = waypoints[waypointId];

            const _act = new Activity(act.guid, {
                title: act.title,
                type: act.type,
                taskScheduleType: act.subType,
                description: act.description,
                priority: act.priority,
                status: act.status,
                contacts: activityObj.contacts as Contact[],
                users: waypoint.users,
                assignedById: user.guid,
                tenetId: user.tenetId!,
                steps: act.steps.map((step, idx) => new ActivityStep(step.guid, {
                    title: step.title,
                    type: step.type,
                    order: idx,
                    completed: false,
                    tenetId: user.tenetId!,
                    assignedTo: step.assignedTo.map(assignment => new User(assignment.guid))
                })),
                order: idx,
                startDate: act.start,
                endDate: act.end,
                parentWaypointId: Buffer.from(waypointId, 'hex'),
            });

            if (act.guid) {
                _act.old = oldActivities.get(_act.guid) as typeof _act;
            }
            newActivities.push(_act);
        } else {
            const _act = new Activity(act.guid, {
                title: act.title,
                type: act.type,
                taskScheduleType: act.subType,
                description: act.description,
                priority: act.priority,
                status: act.status,
                contacts: activityObj.contacts as Contact[],
                users: activityObj.users as User[],
                assignedById: user.guid,
                tenetId: user.tenetId!,
                steps: act.steps.map((step, idx) => new ActivityStep(step.guid, {
                    title: step.title,
                    type: step.type,
                    order: idx,
                    completed: false,
                    tenetId: user.tenetId!,
                    assignedTo: step.assignedTo.map(assignment => new User(assignment.guid))
                })),
                order: idx,
                startDate: act.start,
                endDate: act.end,
            });

            if (act.guid) {
                _act.old = oldActivities.get(_act.guid) as typeof _act;
            }
            newActivities.push(_act);

            idx++;
        }
    }
    activityObj.activities = newActivities as typeof activityObj.activities;

    activityObj.events = [];

    if (added.size() > 0) {
        activityObj.events!.push(new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.ACTIVITY_ADDED_TO,
            userId: user.guid,
            tenetId: user.tenetId,
            contacts: added.toArray().map(contact => {
                contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.ACTIVITY_CONTACT;
                return contact;
            })
        }))
    }
    if (removed.size() > 0) {
        activityObj.events!.push(new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.ACTIVITY_REMOVED_FROM,
            userId: user.guid,
            tenetId: user.tenetId,
            contacts: removed.toArray().map(contact => {
                contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.ACTIVITY_CONTACT;
                return contact;
            })
        }))
    }
    if (activityObj.isDirty('status')) {
        const status = activityObj.status;
        switch (status) {
            case ActivityStatus.COMPLETED:
                activityObj.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_COMPLETED,
                    userId: user.guid,
                    tenetId: user.tenetId,
                    contacts: intersection.toArray().map(contact => {
                        contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.ACTIVITY_CONTACT;
                        return contact;
                    }),
                }))
                break;
            case ActivityStatus.CANCELLED:
                activityObj.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CANCELLED,
                    userId: user.guid,
                    tenetId: user.tenetId,
                    contacts: intersection.toArray().map(contact => {
                        contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.ACTIVITY_CONTACT;
                        return contact;
                    }),
                }))
                break;
            default:
                activityObj.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: user.guid,
                    tenetId: user.tenetId,
                    contacts: intersection.toArray().map(contact => {
                        contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.ACTIVITY_CONTACT;
                        return contact;
                    }),
                    extraInfo: `from **${ActivityStatusNameMapping[activityObj.getOld('status')!] ?? 'Unspecified'}** to **${ActivityStatusNameMapping[activityObj.status]}**`
                }))
                break;
        }
    }

    await activityObj.commit();

    return API.toast('Activity updated', 'success', 200);
}

const _deleteActivity = async (user: User, activityId: string) => {
    const activity = await Activity.readUnique({
        where: {
            id: Buffer.from(activityId, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            events: {
                select: {
                    id: true,
                    userId: true,
                    tenetId: true,
                    contacts: {
                        select: {
                            id: true,
                        }
                    },
                    eventType: true,
                }
            },
            contacts: {
                select: {
                    id: true,
                }
            }
        }
    })

    if (!activity) {
        return API.toast('Activity not found', 'error', 404);
    }

    activity.events = [
        new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.ACTIVITY_REMOVED,
            userId: user.guid,
            tenetId: user.tenetId!,
            contacts: activity.contacts.map(contact => {
                contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.ACTIVITY_CONTACT;
                return contact as Contact;
            })
        })
    ] as typeof activity.events;

    await activity.commit();
    await activity.delete();

    return API.toast(`${ActivityTypeNameMapping[activity.type!]} deleted`, 'info', 200);
}

const _updateNote = async (user: User, note: string, content: string) => {
    const noteObj = await Note.readUnique({
        where: {
            id: Buffer.from(note, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            content: true
        }
    });

    if (!noteObj) {
        return API.toast('Note not found', 'error', 404);
    } else if (isEmptyString(content)) {
        return API.toast('Note cannot be empty', 'error', 400);
    }

    noteObj.content = content;
    await noteObj.commit();

    return API.toast('Note saved', 'success', 200);
}

export const searchTasks = API.serverAction(_searchTasks);
export const getActivity = API.serverAction(_getActivity);
export const createNote = API.serverAction(_createNote);
export const getActivityTimeline = API.serverAction(_getActivityTimeline);
export const createActivity = API.serverAction(_createActivity);
export const updateActivity = API.serverAction(_updateActivity);
export const deleteActivity = API.serverAction(_deleteActivity);
export const updateNote = API.serverAction(_updateNote);
