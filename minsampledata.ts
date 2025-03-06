import {Tenet} from "~/db/sql/models/Tenet";
import {User} from "~/db/sql/models/User";
import {Contact} from "~/db/sql/models/Contact";
import {
    AccessGroup,
    ActivityStatus,
    ActivityType,
    AddressType,
    ContactStatus,
    ContactTimelineEventType,
    ContactType,
    ImportantDateType,
    PhoneType,
    TaskScheduleType
} from "~/common/enum/enumerations";
import {Activity} from "~/db/sql/models/Activity";
import {ActivityWaypoint} from "./src/db/sql/models/ActivityWaypoint";
import {ContactTimelineEvent} from "./src/db/sql/models/ContactTimelineEvent";
import {ActivityStep} from "./src/db/sql/models/ActivityStep";
import {Address} from "./src/db/sql/models/Address";
import {ContactPhone} from "./src/db/sql/models/ContactPhone";
import {ContactEmail} from "./src/db/sql/models/ContactEmail";
import {ImportantDate} from "./src/db/sql/models/ImportantDate";

const tenet = new Tenet(undefined, {
    name: 'Test Tenet',
});

const user = new User(undefined, {
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    type: AccessGroup.CLIENT,
    password: 'password',
    enabled: true,
});

tenet.users = [user];

const contact = new Contact(undefined, {
    firstName: 'Alice',
    lastName: 'Ape',
    status: ContactStatus.CLIENT,
    type: ContactType.INDIVIDUAL,
    tenet,
    addresses: [
        new Address(undefined, {
            street: '123 Fake St',
            city: 'Fakeville',
            state: 'CA',
            zip: '12345',
            country: 'USA',
            type: AddressType.HOME,
            primary: true,
            tenet
        })
    ],
    phones: [
        new ContactPhone(undefined, {
            number: '123-456-7890',
            type: PhoneType.HOME,
            isPrimary: true,
            tenet
        })
    ],
    emails: [
        new ContactEmail(undefined, {
            email: 'aalice@gmail.com',
            isPrimary: true,
            tenet
        })
    ],
    importantDates: [
        new ImportantDate(undefined, {
            date: new Date(),
            type: ImportantDateType.ANNIVERSARY,
            tenet,
        }),
        new ImportantDate(undefined, {
            date: new Date(),
            type: ImportantDateType.BIRTHDAY,
            tenet,
        }),
        new ImportantDate(undefined, {
            date: new Date(),
            type: ImportantDateType.RETIREMENT,
            tenet,
        })
    ]
});

await tenet.commit();
await contact.commit()
const flowEndDate = new Date();
flowEndDate.setDate(flowEndDate.getDate() + 3);

const path = new Activity(undefined, {
    type: ActivityType.PATH,
    title: 'Client Onboarding',
    description: 'Setting up a new client with our services',
    tenetId: tenet.guid,
    users: [user],
    contacts: [contact],
    startDate: new Date(),
    endDate: flowEndDate,
    waypoints: [],
    assignedBy: user,
})

let scheduleStartDate = new Date();
scheduleStartDate.setHours(10, 0, 0, 0);
let endDate = new Date(scheduleStartDate);
endDate.setHours(endDate.getHours() + 1);
const waypoint1 = new ActivityWaypoint(undefined, {
    order: 0,
    title: 'Welcome the Client',
    description: 'Welcome the client and introduce them to the team who will managing their wealth',
    status: ActivityStatus.COMPLETED,
    actualStart: new Date(),
    dueDate: new Date(),
    users: [user],
    tenet,
    childActivities: [
        new Activity(undefined, {
            order: 0,
            type: ActivityType.TASK,
            title: 'Send welcome email',
            description: 'Send welcome email to client',
            tenetId: tenet.guid,
            startDate: new Date(),
            endDate: new Date(),
            taskScheduleType: TaskScheduleType.COMMUNICATION_EMAIL,
            status: ActivityStatus.COMPLETED,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                    extraInfo: 'from **Not Started** to **Assigned**'
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_COMPLETED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
            ],
            parentActivityId: path.guid,
            steps: ActivityStep.fromArray(['Find the right email', 'Send Email'], tenet.guid, true),
            contacts: [contact],
            users: [user],
            assignedBy: user,
        }),
        new Activity(undefined, {
            order: 1,
            type: ActivityType.SCHEDULED,
            title: 'In-office visit',
            description: 'Schedule an in-office visit with the client',
            tenetId: tenet.guid,
            startDate: scheduleStartDate,
            endDate: endDate,
            status: ActivityStatus.COMPLETED,
            taskScheduleType: TaskScheduleType.HOLD_TENTATIVE,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                    extraInfo: 'from **Scheduled** to **In Progress**'
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_COMPLETED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
            ],
            parentActivityId: path.guid,
            holdReason: 'Tentative due to client\'s schedule',
            steps: ActivityStep.fromArray(['Send Calendly Link', 'Prepare Office', 'Get Welcome Sign', 'Figure out favorite drink', 'Conduct Visit & KYC with Client'], tenet.guid),
            contacts: [contact],
            users: [user],
            assignedBy: user
        })
    ],
})

const dueDate = new Date();
dueDate.setDate(dueDate.getDate() + 2);
const startDate = new Date();
startDate.setDate(startDate.getDate() + 1);
scheduleStartDate = new Date(startDate);
scheduleStartDate.setHours(10, 0, 0, 0);
scheduleStartDate.setDate(scheduleStartDate.getDate() + 1);
endDate = new Date(scheduleStartDate);
endDate.setHours(endDate.getHours() + 1);
const waypoint2 = new ActivityWaypoint(undefined, {
    order: 1,
    title: 'Set up brokerage account',
    status: ActivityStatus.IN_PROGRESS,
    actualStart: startDate,
    dueDate,
    users: [user],
    tenet,
    childActivities: [
        new Activity(undefined, {
            order: 0,
            type: ActivityType.SCHEDULED,
            title: 'Compliance Review',
            description: 'Review paperwork with compliance team',
            tenetId: tenet.guid,
            startDate,
            endDate,
            taskScheduleType: TaskScheduleType.MEETING_INTERNAL,
            status: ActivityStatus.COMPLETED,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                })
            ],
            parentActivityId: path.guid,
            phoneNumber: '+1234567890',
            users: [user],
            contacts: [contact],
            assignedBy: user
        }),
        new Activity(undefined, {
            order: 1,
            type: ActivityType.TASK,
            title: 'Transfer Assets',
            description: 'Submit transfer request and then follow through to move client\'s assets to our brokerage account',
            tenetId: tenet.guid,
            startDate: startDate,
            endDate: startDate,
            taskScheduleType: TaskScheduleType.TASK_ADMIN,
            status: ActivityStatus.IN_PROGRESS,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                })
            ],
            parentActivityId: path.guid,
            steps: ActivityStep.fromArray(['Review with compliance', 'Submit forms', 'Complete Transfer'], tenet.guid),
            users: [user],
            assignedBy: user,
            contacts: [contact],
        }),
    ],
})

const multi = new Activity(undefined, {
    type: ActivityType.WAYPOINT,
    title: 'Set up brokerage account',
    description: 'Set up a brokerage account for the client',
    tenetId: tenet.guid,
    startDate: new Date(),
    endDate: new Date(),
    contacts: [contact],
    users: [user],
    activities: [
        new Activity(undefined, {
            order: 0,
            type: ActivityType.SCHEDULED,
            title: 'Call Client about Account Setup',
            description: 'Determine what account type best fits the client\'s investment goals',
            tenetId: tenet.guid,
            startDate: new Date(),
            endDate: new Date(),
            status: ActivityStatus.COMPLETED,
            taskScheduleType: TaskScheduleType.COMMUNICATION_CALL_OUTBOUND,
            contacts: [contact],
            users: [user],
            assignedBy: user,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_COMPLETED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
            ],
        }),
        new Activity(undefined, {
            order: 1,
            type: ActivityType.TASK,
            title: 'Open new account',
            tenetId: tenet.guid,
            startDate: new Date(),
            endDate: new Date(),
            taskScheduleType: TaskScheduleType.TASK_ADMIN,
            status: ActivityStatus.IN_REVIEW,
            contacts: [contact],
            users: [user],
            steps: ActivityStep.fromArray(['Find out what account best fits the client', 'Create the account'], tenet.guid),
            assignedBy: user,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                    extraInfo: 'from **Not Started** to **Assigned**'
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                    extraInfo: 'from **Assigned** to **In Progress**'
                }),
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: user.guid,
                    tenetId: tenet.guid,
                    contacts: [contact],
                    extraInfo: 'from **Assigned** to **In Review**'
                }),
            ],
        }),
    ],
    assignedBy: user
})

await multi.commit();

path.waypoints = [waypoint1, waypoint2];

await path.commit();