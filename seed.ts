// First create a tenet
import 'dotenv/config';
import {
    AccessGroup,
    ActivityPriority,
    ActivityStatus,
    ActivityStatusNameMapping,
    ActivityType,
    AddressType,
    CompanyRelationshipStatus,
    ContactRelationshipType,
    ContactStatus,
    ContactTimelineEventJoinType,
    ContactTimelineEventType,
    ContactType,
    HouseholdRelationshipStatus,
    ImportantDateType,
    OpportunityStatus,
    PhoneType,
    TaskScheduleType
} from "~/common/enum/enumerations";
import {Tenet} from "~/db/sql/models/Tenet";
import {User} from "~/db/sql/models/User";
import * as fs from "node:fs";
import {Contact} from "~/db/sql/models/Contact";
import {ImportantDate} from "~/db/sql/models/ImportantDate";
import {Address} from "~/db/sql/models/Address";
import {ContactPhone} from "~/db/sql/models/ContactPhone";
import {ContactEmail} from "~/db/sql/models/ContactEmail";
import {Activity} from "~/db/sql/models/Activity";
import {differenceInDays, differenceInHours, differenceInMinutes} from "date-fns";
import {ContactTimelineEvent} from "./src/db/sql/models/ContactTimelineEvent";
import {ActivityWaypoint} from "./src/db/sql/models/ActivityWaypoint";
import {Opportunity} from "./src/db/sql/models/Opportunity";
import {Note} from "./src/db/sql/models/Note";
import {PerformInTransaction} from "./src/db/sql/transaction";
import {countryToState} from "./src/util/lists/States";
import {Logger} from "./src/util/Logger";

const logger = new Logger('PlaygroundImport')

await PerformInTransaction(async () => {
    const tenet = new Tenet(undefined, {
        name: 'Test Tenet',
    });

    await tenet.commit();

    const systemAdmin = new User(undefined, {
        firstName: 'System',
        lastName: 'Administrator',
        email: process.env.ADMIN_EMAIL ?? 'system@reliablesecurities.com',
        password: process.env.ADMIN_PASSWORD ?? 'password',
        type: AccessGroup.SYSADMIN,
        tenetId: tenet.guid,
        enabled: true,
        system: true,
    })

    await systemAdmin.commit();

// Create users
    const users: Record<number, User> = {
        [-1]: systemAdmin
    }

    const rawUsers = JSON.parse(fs.readFileSync('./g4/users.json', 'utf8'));
    for (const user of rawUsers) {
        const _user = new User(undefined, {
            firstName: user.FirstName,
            lastName: user.LastName,
            email: user.Initials + '@reliablesecurities.com',
            password: process.env.DEMO_USER_PASSWORD ?? 'password',
            type: AccessGroup.CLIENT,
            tenetId: tenet.guid,
            enabled: true,
        })

        users[user.SysUserID] = _user;

        await _user.commit();
    }

    type Individual = {
        IndividualID: number,
        LastName: string,
        MiddleName: string,
        FirstName: string,
        BirthDate: string,
        Gender: 'M' | 'F' | 'U', // U = company
        ImportantInfo: string,
    }

    const rawIndividuals: Individual[] = JSON.parse(fs.readFileSync('./g4/individual.json', 'utf8'));
    const individuals: Record<number, Individual> = {}

    for (const individual of rawIndividuals) {
        individuals[individual.IndividualID] = individual;
    }

    const contacts: Record<number, Contact> = {}
// Create contacts
    for (const individual of rawIndividuals) {
        const contact = new Contact(undefined, {
            firstName: individual.FirstName,
            lastName: individual.LastName,
            tenetId: tenet.guid,
            type: individual.FirstName == null ? ContactType.COMPANY : ContactType.INDIVIDUAL,
            importantNotes: individual.ImportantInfo,
            importantDates: individual.BirthDate ? [new ImportantDate(undefined, {
                date: new Date(individual.BirthDate),
                type: ImportantDateType.BIRTHDAY,
                tenetId: tenet.guid,
            })] : [],
            status: ContactStatus.OTHER,
        });

        await contact.commit();

        contacts[individual.IndividualID] = contact;
    }

    const groupMembership: Record<number, { id: number, position: string }[]> = {}
    const rawGroupMembership = JSON.parse(fs.readFileSync('./g4/contact-group-indv.json', 'utf8'));

    for (const group of rawGroupMembership) {
        groupMembership[group.ContactGroupID] ??= [];
        groupMembership[group.ContactGroupID].push({id: group.IndividualID, position: group.position});
    }

    type ContactGroup = {
        ContactGroupID: number,
        Name: string,
        ImportantInfo: string,
        URL: string,
        type: 'Business Owner' | 'Corporate' | 'Professional' | 'Retired' | 'Other' | 'Teacher/Clergy' | null,
        status: string,
    }

    const contactGroups: Record<number, Contact> = {}
    const rawContactGroups = JSON.parse(fs.readFileSync('./g4/contact-group.json', 'utf8')) as ContactGroup[];

    for (const group of rawContactGroups) {
        const members = groupMembership[group.ContactGroupID] ?? [];

        const statusMapping: Record<string, ContactStatus> = {
            'Client': ContactStatus.CLIENT,
            'Prospect': ContactStatus.PROSPECT,
            'Mass Mail': ContactStatus.CLIENT,
            'Connection': ContactStatus.LEAD,
            'Strategic Partner': ContactStatus.STRATEGIC_PARTNER,
            'Old Prospect': ContactStatus.OFF,
            'Contact': ContactStatus.OTHER,
            'Personal': ContactStatus.OTHER
        }

        const companyStatusMapping: Record<string, CompanyRelationshipStatus> = {
            'Chairman': CompanyRelationshipStatus.CHAIRMAN_OF_THE_BOARD,
            'Chair': CompanyRelationshipStatus.CHAIRMAN_OF_THE_BOARD,
            'Secretary': CompanyRelationshipStatus.BOARD_MEMBER,
            'Treasurer': CompanyRelationshipStatus.BOARD_MEMBER,
            'Vice Chairman': CompanyRelationshipStatus.CHAIRMAN_OF_THE_BOARD,
            'Vice Chair': CompanyRelationshipStatus.CHAIRMAN_OF_THE_BOARD,
        }

        const householdStatusMapping: Record<string, HouseholdRelationshipStatus> = {
            'Partner': HouseholdRelationshipStatus.SPOUSE,
            'Spouse': HouseholdRelationshipStatus.SPOUSE,
            'Life-Partner': HouseholdRelationshipStatus.SPOUSE,
            'Husband': HouseholdRelationshipStatus.SPOUSE,
            'Wife': HouseholdRelationshipStatus.SPOUSE,
            'Son': HouseholdRelationshipStatus.SON,
            'Father': HouseholdRelationshipStatus.FATHER,
            'Daughter': HouseholdRelationshipStatus.DAUGHTER,
            'Mother': HouseholdRelationshipStatus.MOTHER,
        }

        if (members.find(member => contacts[member.id].type === ContactType.COMPANY)) {
            const company = contacts[members.find(member => contacts[member.id].type === ContactType.COMPANY)!.id];
            company.lastName = group.Name;
            company.status = statusMapping[group.status];
            // We have a company, add members to it
            for (const member of members) {
                const _contact = contacts[member.id];
                if (_contact.type === ContactType.COMPANY) {
                    continue;
                }
                _contact.position = member.position;
                _contact.companyStatus = companyStatusMapping[member.position] ?? CompanyRelationshipStatus.EMPLOYEE
                _contact.companyId = company.guid
                _contact.status = statusMapping[group.status];
                await _contact.commit();
            }
            await company.commit();
            contactGroups[group.ContactGroupID] = company;
        } else {
            switch (group.type) {
                case 'Business Owner':
                case 'Corporate':
                case 'Professional':
                case 'Teacher/Clergy':
                    // Technically, teacher/clergy is not a company but it's the same kind of entity
                    // Companies
                    const company = new Contact(undefined, {
                        lastName: group.Name,
                        tenetId: tenet.guid,
                        type: ContactType.COMPANY,
                        importantNotes: group.ImportantInfo,
                        status: statusMapping[group.status],
                    })

                    await company.commit();
                    contactGroups[group.ContactGroupID] = company;

                    for (const member of members) {
                        const _contact = contacts[member.id];
                        if (_contact.type === ContactType.COMPANY) {
                            continue;
                        }
                        _contact.companyId = company.guid
                        _contact.status = statusMapping[group.status];
                        _contact.companyStatus = companyStatusMapping[member.position] ?? CompanyRelationshipStatus.EMPLOYEE
                        _contact.position = member.position;
                        await _contact.commit();
                    }

                    break;

                default:
                    // Make a household
                    const household = new Contact(undefined, {
                        lastName: group.Name,
                        tenetId: tenet.guid,
                        type: ContactType.HOUSEHOLD,
                        importantNotes: group.ImportantInfo,
                        status: statusMapping[group.status],
                    })

                    await household.commit();

                    let hasHoH = false;
                    // Add members to the household
                    for (const member of members) {
                        const status = hasHoH ? HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD : householdStatusMapping[member.position];
                        if (status == null && member.position != null) {
                            logger.warn(`Unknown household status ${member.position}`);
                            continue;
                        }
                        hasHoH = true;
                        const _contact = contacts[member.id];
                        _contact.householdId = household.guid;
                        _contact.status = statusMapping[group.status];
                        _contact.householdStatus = status;
                        await _contact.commit();
                    }

                    contactGroups[group.ContactGroupID] = household;
                    break;
            }
        }
    }

    type RawAddress = {
        AddressID: number,
        ContactGroupID: number,
        Address1: string,
        Address2: string | null,
        City: string,
        state: string,
        ['Zip/PostalCode']: string,
        country: string,
    }

// Add information to the contacts (addresses, emails, phones, etc.)
    const rawAddresses = JSON.parse(fs.readFileSync('./g4/address.json', 'utf8')) as RawAddress[];

    for (const address of rawAddresses) {
        const contact = contactGroups[address.ContactGroupID];
        if (contact == null) {
            logger.warn(`Address ${address.AddressID} has no contact (GroupID: ${address.ContactGroupID})`);
            continue;
        }
        let addressLine = address.Address1;
        if (addressLine === '---PRIVATE---' && address.Address2) {
            addressLine = address.Address2;
        } else if (address.Address2) {
            addressLine += `, ${address.Address2}`;
        }

        await new Address(undefined, {
            street: addressLine,
            city: address.City,
            state: countryToState['US'][address.state] ?? address.state,
            zip: address['Zip/PostalCode'],
            country: address.country ?? 'USA',
            type: AddressType.HOME,
            tenetId: tenet.guid,
            contactId: contact.guid,
        }).commit();

        if (contact.primaryContactId || contact.headOfHouseholdId) {
            await new Address(undefined, {
                street: addressLine,
                city: address.City,
                state: countryToState['US'][address.state] ?? address.state,
                zip: address['Zip/PostalCode'],
                country: address.country ?? 'USA',
                type: AddressType.HOME,
                contactId: contact.primaryContactId ?? contact.headOfHouseholdId!,
                tenetId: tenet.guid,
            }).commit();
        }
    }

    type RawPhone = {
        PhoneID: number,
        ContactGroupID: number,
        AreaCode: string,
        Number: string,
        type: 'Home' | 'Work' | 'Mobile' | 'Fax' | 'Other',
    }
// Create phones
    const rawPhones = JSON.parse(fs.readFileSync('./g4/phone.json', 'utf8')) as RawPhone[];

    for (const phone of rawPhones) {
        const contact = contactGroups[phone.ContactGroupID];
        if (contact == null) {
            logger.warn(`Phone ${phone.PhoneID} has no contact (GroupID: ${phone.ContactGroupID})`);
            continue;
        }
        const phoneTypeMapping: Record<string, PhoneType> = {
            'Fax': PhoneType.OTHER,
            'Business': PhoneType.WORK,
            'Home': PhoneType.HOME,
            'Cell': PhoneType.MOBILE,
            'Pager': PhoneType.OTHER,
        }
        await new ContactPhone(undefined, {
            number: phone.AreaCode + ' ' + phone.Number,
            type: phoneTypeMapping[phone.type],
            contactId: contact.guid,
            tenetId: tenet.guid,
        }).commit();

        if (contact.primaryContactId || contact.headOfHouseholdId) {
            await new ContactPhone(undefined, {
                number: phone.AreaCode + ' ' + phone.Number,
                type: phoneTypeMapping[phone.type],
                contactId: contact.primaryContactId ?? contact.headOfHouseholdId!,
                tenetId: tenet.guid,
            }).commit();
        }
    }

    type RawEmail = {
        EmailID: number,
        ContactGroupID: number,
        EmailAddress: string,
    }

// Create emails
    const rawEmails = JSON.parse(fs.readFileSync('./g4/email.json', 'utf8')) as RawEmail[];

    for (const email of rawEmails) {
        const contact = contactGroups[email.ContactGroupID];
        if (contact == null) {
            logger.warn(`Email ${email.EmailID} has no contact (GroupID: ${email.ContactGroupID})`);
            continue;
        }
        await new ContactEmail(undefined, {
            email: email.EmailAddress,
            contactId: contact.guid,
            tenetId: tenet.guid,
        }).commit();

        if (contact.primaryContactId || contact.headOfHouseholdId) {
            await new ContactEmail(undefined, {
                email: email.EmailAddress,
                contactId: contact.primaryContactId ?? contact.headOfHouseholdId!,
                tenetId: tenet.guid,
            }).commit();
        }
    }

    type RawImportantDate = {
        ImportantDateID: number,
        ContactGroupID: number,
        Name: 'Anniversary' | 'Retirement Date' | 'Other',
        Date: string,
    }

// Create important dates
    const rawImportantDates = JSON.parse(fs.readFileSync('./g4/important-date.json', 'utf8')) as RawImportantDate[];

    for (const date of rawImportantDates) {
        const contact = contactGroups[date.ContactGroupID];
        if (contact == null) {
            logger.warn(`Important date ${date.ImportantDateID} has no contact (GroupID: ${date.ContactGroupID})`);
            continue;
        }
        if (date.Name === 'Other') {
            continue;
        }
        const importantDateMapping: Record<string, ImportantDateType> = {
            'Anniversary': ImportantDateType.ANNIVERSARY,
            'Retirement Date': ImportantDateType.RETIREMENT,
        }
        if (!(date.Name in importantDateMapping)) {
            logger.warn(`Unknown important date ${date.Name} for ${contact.fullName}`);
            continue;
        }
        await new ImportantDate(undefined, {
            contactId: contact.guid,
            tenetId: tenet.guid,
            date: new Date(date.Date),
            type: importantDateMapping[date.Name],
        }).commit();
    }

    type RawRelationship = {
        IndividualID1: number,
        position1: string,
        IndividualID2: number,
        position2: string,
    }

// Create relationships
    const rawRelationships = JSON.parse(fs.readFileSync('./g4/relations.json', 'utf8')) as RawRelationship[];

    for (const relationship of rawRelationships) {
        const contact1 = contacts[relationship.IndividualID1];
        const contact2 = contacts[relationship.IndividualID2];

        await contact1.addContactRelationship(relationship.position1 as ContactRelationshipType, contact2)
        await contact2.addContactRelationship(relationship.position2 as ContactRelationshipType, contact1)
    }

// Create paths and waypoints
    const paths: Record<string, string[]> = {};

    type RawWaypoint = {
        ContactGroupID: number,
        Description: string,
        InObjectiveUID: string,
        ObjectiveUID: string,
        tActionStatusID: number,
        tPriorityID: number,
        StaffGroupID: number,
        SysUserID: number,
        DueDate: string,
        DateTimeEntered: string,
        DateTimeDone: string,
        DateTimeModified: string,

        Probability: number,
        Value: number,
        bOpportunity: boolean,
    }

    const rawWaypoints = JSON.parse(fs.readFileSync('./g4/objective.json', 'utf8')) as RawWaypoint[];
    const rawWaypointsMap: Record<string, RawWaypoint> = {}

    for (const waypoint of rawWaypoints) {
        if (waypoint.InObjectiveUID) {
            paths[waypoint.InObjectiveUID] ??= [];
            paths[waypoint.InObjectiveUID].push(waypoint.ObjectiveUID);
        }
        rawWaypointsMap[waypoint.ObjectiveUID] = waypoint;
    }

    const userGroups: Record<number, User[]> = {}
    const rawUserGroups = JSON.parse(fs.readFileSync('./g4/user-groups.json', 'utf8'));
    for (const userGroup of rawUserGroups) {
        userGroups[userGroup.GroupID] ??= [];

        userGroups[userGroup.GroupID].push(users[userGroup.SysUserID]);
    }

    const dateOffset = (offset: number) => {
        const date = new Date()
        date.setDate(date.getDate() + offset);
        return date;
    }

    const objectiveMap: Record<string, Activity> = {}
    const waypointMap: Record<string, ActivityWaypoint> = {}

    const objectiveMeta: Record<string, {
        originalStartDate: Date,
    }> = {}

    for (const waypoint of rawWaypoints) {
        if (waypoint.InObjectiveUID) {
            continue;
        }

        const assigner = users[waypoint.SysUserID ?? -1];

        const days = differenceInDays(new Date(waypoint.DueDate), new Date(waypoint.DateTimeEntered));

        if (days < 0) {
            logger.fatal(`Objective ${waypoint.Description} has a due date before it was created. This is bad.`);
            process.exit(1);
        }

        const priorityMapping: Record<number, ActivityPriority> = {
            1: ActivityPriority.HIGH,
            2: ActivityPriority.MEDIUM,
            3: ActivityPriority.LOW,
        }

        const statusMapping: Record<number, ActivityStatus> = {
            1: ActivityStatus.COMPLETED,
            2: ActivityStatus.IN_PROGRESS,
            4: ActivityStatus.CANCELLED,
            6: ActivityStatus.FAILED,
            7: ActivityStatus.PENDING_APPROVAL,
        }

        const assignees = userGroups[waypoint.StaffGroupID];

        const randomAssignee = () => assignees[Math.floor(Math.random() * assignees.length)];

        let opportunity = null as Opportunity | null;
        
        const contacts = waypoint.ContactGroupID == null ? [] : [contactGroups[waypoint.ContactGroupID]];

        if (waypoint.bOpportunity) {
            let oppStatus = OpportunityStatus.UNSTARTED;

            switch (statusMapping[waypoint.tActionStatusID] ?? ActivityStatus.NOT_STARTED) {
                case ActivityStatus.COMPLETED:
                    oppStatus = OpportunityStatus.WON;
                    break;

                case ActivityStatus.FAILED:
                    oppStatus = OpportunityStatus.LOST;
                    break;

                case ActivityStatus.CANCELLED:
                    oppStatus = OpportunityStatus.CANCELLED;
                    break;

                case ActivityStatus.PENDING_APPROVAL:
                    oppStatus = OpportunityStatus.PAPERWORK;
                    break;

                case ActivityStatus.IN_PROGRESS:
                    oppStatus = OpportunityStatus.IDENTIFIED;
                    break;

                default:
                    oppStatus = OpportunityStatus.UNSTARTED;
                    break;
            }

            opportunity = new Opportunity(undefined, {
                title: waypoint.Description,
                contacts,
                tenetId: tenet.guid,
                probability: waypoint.Probability / 100,
                value: waypoint.Value,
                status: oppStatus,
                expectedCloseDate: dateOffset(days),
                teamMembers: userGroups[waypoint.StaffGroupID],
                events: [
                    new ContactTimelineEvent(undefined, {
                        eventType: ContactTimelineEventType.OPPORTUNITY_CREATED,
                        userId: assigner.guid,
                        tenetId: tenet.guid,
                        contacts,
                    })
                ],
                statusHistory: []
            })

            await opportunity.commit();
        }

        const activity = new Activity(undefined, {
            type: waypoint.ObjectiveUID in paths ? ActivityType.PATH : ActivityType.WAYPOINT,
            title: waypoint.Description,
            contacts,
            assignedById: assigner.guid,
            users: userGroups[waypoint.StaffGroupID],
            tenetId: tenet.guid,
            startDate: new Date(),
            endDate: dateOffset(days),
            status: statusMapping[waypoint.tActionStatusID] ?? ActivityStatus.NOT_STARTED,
            priority: priorityMapping[waypoint.tPriorityID],
            opportunityId: opportunity?.guid,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: assigner.guid,
                    tenetId: tenet.guid,
                    contacts,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
            ],
        })


        const _date = Math.floor(Math.random() * days);
        const date = dateOffset(_date);
        if (activity.status !== ActivityStatus.NOT_STARTED) {
            activity.events!.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                userId: randomAssignee().guid,
                tenetId: tenet.guid,
                contacts,
                extraInfo: 'from **Not Started** to **In Progress**',
                createdAt: date,
                updatedAt: date,
            }))
        }

        switch (activity.status) {
            case ActivityStatus.COMPLETED: {
                activity.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_COMPLETED,
                    userId: randomAssignee().guid,
                    tenetId: tenet.guid,
                    contacts,
                    createdAt: dateOffset(days),
                    updatedAt: dateOffset(days),
                }))
                break;
            }

            case ActivityStatus.FAILED: {
                activity.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_FAILED,
                    userId: randomAssignee().guid,
                    tenetId: tenet.guid,
                    contacts,
                    createdAt: dateOffset(days),
                    updatedAt: dateOffset(days),
                }))
                break;
            }

            case ActivityStatus.CANCELLED: {
                activity.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CANCELLED,
                    userId: randomAssignee().guid,
                    tenetId: tenet.guid,
                    contacts,
                    createdAt: dateOffset(days),
                    updatedAt: dateOffset(days),
                }))
                break;
            }

            case ActivityStatus.PENDING_APPROVAL: {
                // Date between `date` and `date + days`
                const date1 = new Date();
                date1.setDate(date1.getDate() + _date);
                date1.setDate(date1.getDate() + Math.floor(Math.random() * (days - _date)))
                activity.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: randomAssignee().guid,
                    tenetId: tenet.guid,
                    contacts,
                    extraInfo: 'from **Pending Approval** to **In Progress**',
                    createdAt: dateOffset(days),
                    updatedAt: dateOffset(days),
                }))
                break;
            }
        }

        if (waypoint.ObjectiveUID in paths) {
            // Add waypoints to the path
            let idx = 0;
            activity.waypoints = [];
            for (const _waypoint of paths[waypoint.ObjectiveUID]) {
                const data = rawWaypointsMap[_waypoint]
                const startDateOffset = differenceInDays(new Date(data.DateTimeEntered), activity.startDate!);
                const endDateOffset = differenceInDays(new Date(data.DueDate), new Date(data.DateTimeEntered)) + startDateOffset;
                const waypointObject = new ActivityWaypoint(undefined, {
                    title: data.Description,
                    tenetId: tenet.guid,
                    actualStart: dateOffset(startDateOffset),
                    dueDate: dateOffset(endDateOffset),
                    status: statusMapping[data.tActionStatusID] ?? ActivityStatus.NOT_STARTED,
                    order: idx,
                    users: userGroups[data.StaffGroupID],
                    events: [
                        new ContactTimelineEvent(undefined, {
                            eventType: ContactTimelineEventType.WAYPOINT_CREATED,
                            userId: assigner.guid,
                            tenetId: tenet.guid,
                            contacts: activity.contacts!.map(contact => new Contact(contact.guid, {
                                contactTimelineRelationshipType: ContactTimelineEventJoinType.ACTIVITY_CONTACT
                            })),
                        })
                    ],
                })

                activity.waypoints!.push(waypointObject);
                idx++;
                waypointMap[data.ObjectiveUID] = waypointObject;
                objectiveMeta[data.ObjectiveUID] = {
                    originalStartDate: new Date(data.DateTimeEntered)
                }
            }
        }

        objectiveMap[waypoint.ObjectiveUID] = activity;
        await activity.commit();

        objectiveMeta[waypoint.ObjectiveUID] = {
            originalStartDate: new Date(waypoint.DateTimeEntered)
        }
    }

// Add activities to these waypoints/paths (or just add them if they're standalone)
    type Action = {
        ActionID: number,
        created: string,
        updated: string,
        Description: string,
        ContactGroupID: number,
        DateTimeStart: string,
        DateTimeEnd: string,
        type: string,
        status: string,
        priority: string,
        ObjectiveUID: string,
        SysUserID: number,
        StaffGroupID: number,
        bIsScheduled: boolean,
    }

    const actions = JSON.parse(fs.readFileSync('./g4/actions.json', 'utf8')) as Action[];

    const actionCounts: Record<string, number> = {};

    for (const action of actions) {
        if (action.type == null) {
            continue;
        }

        if (action.DateTimeEnd == null) {
            action.DateTimeEnd = action.DateTimeStart;
        }

        const actionTypeMapping: Record<string, TaskScheduleType> = {
            'Admin': TaskScheduleType.TASK_ADMIN,
            'Call': TaskScheduleType.COMMUNICATION_CALL,
            'Message': TaskScheduleType.COMMUNICATION_MESSAGE,
            'Meeting': TaskScheduleType.MEETING,
            'Other': TaskScheduleType.TASK,
            'PROBLEM': TaskScheduleType.TASK_TODO,
        }

        const actionStatusMapping: Record<string, ActivityStatus> = {
            'Done': ActivityStatus.COMPLETED,
            'Open': ActivityStatus.NOT_STARTED,
            'Canceled': ActivityStatus.CANCELLED,
            'Failed': ActivityStatus.FAILED,
            'Pending': ActivityStatus.PENDING_APPROVAL,
        }

        const actionPriorityMapping: Record<string, ActivityPriority> = {
            'High': ActivityPriority.HIGH,
            'Normal': ActivityPriority.MEDIUM,
            'Low': ActivityPriority.LOW,
        }

        const actionType = actionTypeMapping[action.type];
        const actionStatus = actionStatusMapping[action.status] ?? (action.bIsScheduled ? ActivityStatus.SCHEDULED : ActivityStatus.NOT_STARTED);
        const actionPriority = actionPriorityMapping[action.priority] ?? ActivityPriority.MEDIUM;

        if (actionType == null) {
            logger.warn(`Unknown action type ${action.type} for action ${action.ActionID}`);
            continue;
        }

        const days = differenceInDays(new Date(action.DateTimeStart), new Date(action.DateTimeEnd));
        let parentDiff = 0;

        if (action.ObjectiveUID) {
            if (action.ObjectiveUID in objectiveMap) {
                const parent = objectiveMeta[action.ObjectiveUID];
                parentDiff = differenceInDays(parent.originalStartDate!, new Date(action.DateTimeStart))
            } else if (action.ObjectiveUID in waypointMap) {
                const parent = objectiveMeta[action.ObjectiveUID];
                parentDiff = differenceInDays(parent.originalStartDate!, new Date(action.DateTimeStart))
            }
        }

        let startDate = dateOffset(parentDiff);
        let endDate = dateOffset(parentDiff + days);

        if (action.bIsScheduled) {
            const minuteDiff = differenceInMinutes(new Date(action.DateTimeStart), new Date(action.DateTimeEnd));
            endDate = new Date(startDate);
            endDate.setHours(endDate.getHours() + minuteDiff / 60, endDate.getMinutes() + minuteDiff % 60, 0, 0);
        }
        
        const contacts = action.ContactGroupID == null ? [] : [contactGroups[action.ContactGroupID]];

        const assignedTo = userGroups[action.StaffGroupID];

        if (startDate > endDate) {
            const temp = startDate;
            startDate = endDate;
            endDate = temp;
        }

        const activity = new Activity(undefined, {
            title: action.Description,
            contacts,
            assignedById: users[action.SysUserID ?? -1].guid,
            users: assignedTo,
            tenetId: tenet.guid,
            startDate,
            endDate,
            status: actionStatus,
            priority: actionPriority,
            taskScheduleType: actionType,
            type: action.bIsScheduled ? ActivityType.SCHEDULED : ActivityType.TASK,
            events: [
                new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                    userId: users[action.SysUserID ?? -1].guid,
                    tenetId: tenet.guid,
                    contacts:contacts,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                })
            ],
        })

        if (actionStatus !== ActivityStatus.NOT_STARTED && actionStatus !== ActivityStatus.SCHEDULED) {
            const initialStatus = action.bIsScheduled ? ActivityStatus.SCHEDULED : ActivityStatus.NOT_STARTED;
            activity.events!.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                userId: users[action.SysUserID ?? -1].guid,
                tenetId: tenet.guid,
                contacts,
                extraInfo: `from **${ActivityStatusNameMapping[initialStatus]}** to **${ActivityStatusNameMapping[ActivityStatus.IN_PROGRESS]}**`
            }))
        }

        const eventMapping: Partial<Record<ActivityStatus, ContactTimelineEventType>> = {
            [ActivityStatus.COMPLETED]: ContactTimelineEventType.ACTIVITY_COMPLETED,
            [ActivityStatus.CANCELLED]: ContactTimelineEventType.ACTIVITY_CANCELLED,
            [ActivityStatus.FAILED]: ContactTimelineEventType.ACTIVITY_FAILED,
        }

        switch (actionStatus) {
            case ActivityStatus.COMPLETED:
            case ActivityStatus.CANCELLED:
            case ActivityStatus.FAILED:
                activity.completedAt = new Date();
                activity.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: eventMapping[actionStatus],
                    userId: users[action.SysUserID ?? -1].guid,
                    tenetId: tenet.guid,
                    contacts,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                }))
                break;

            case ActivityStatus.PENDING_APPROVAL:
                activity.events!.push(new ContactTimelineEvent(undefined, {
                    eventType: ContactTimelineEventType.ACTIVITY_STATUS_CHANGED,
                    userId: users[action.SysUserID ?? -1].guid,
                    tenetId: tenet.guid,
                    contacts,
                    extraInfo: `from **${ActivityStatusNameMapping[ActivityStatus.IN_PROGRESS]}** to **${ActivityStatusNameMapping[ActivityStatus.PENDING_APPROVAL]}**`
                }))
                break;
        }

        if (action.ObjectiveUID) {
            if (action.ObjectiveUID in objectiveMap) {
                activity.parentActivityId = objectiveMap[action.ObjectiveUID].guid;
                activity.opportunityId = objectiveMap[action.ObjectiveUID].opportunityId;
            } else if (action.ObjectiveUID in waypointMap) {
                activity.parentWaypointId = waypointMap[action.ObjectiveUID].guid;
                activity.parentActivityId = waypointMap[action.ObjectiveUID].activityId;
                activity.opportunityId = waypointMap[action.ObjectiveUID].activity!.opportunityId;
            }

            const order = actionCounts[action.ObjectiveUID] ?? 0;
            actionCounts[action.ObjectiveUID] = order + 1;
            activity.order = order;
        }

        await activity.commit();
    }

    type RawNote = {
        NoteID: number,
        DateTimeEntered: string,
        NoteText: string,
        SysUserID: number,
        ObjectiveUID: string,
        ContactGroupID: number,
    }

    const rawNotes = JSON.parse(fs.readFileSync('./g4/note.json', 'utf8')) as RawNote[];

    for (const note of rawNotes) {
        const contact = contactGroups[note.ContactGroupID];
        if (!contact) {
            logger.warn(`Note ${note.NoteID} has no contact (GroupID: ${note.ContactGroupID})`);
            continue;
        }

        const author = users[note.SysUserID ?? -1];

        const noteObj = new Note(undefined, {
            authorId: author.guid,
            tenetId: tenet.guid,
            content: note.NoteText,
        })

        if (note.ObjectiveUID) {
            const originalStartDate = objectiveMeta[note.ObjectiveUID].originalStartDate;
            const diff = differenceInDays(originalStartDate, new Date(note.DateTimeEntered));
            if (note.ObjectiveUID in objectiveMap) {
                noteObj.activity = objectiveMap[note.ObjectiveUID];
                const created = new Date(noteObj.activity!.startDate!);
                created.setDate(created.getDate() + diff);
                noteObj.createdAt = created;
                noteObj.opportunityId = objectiveMap[note.ObjectiveUID].opportunityId;
            } else if (note.ObjectiveUID in waypointMap) {
                noteObj.waypoint = waypointMap[note.ObjectiveUID];
                const created = new Date(noteObj.waypoint!.actualStart!);
                created.setDate(created.getDate() + diff);
                noteObj.createdAt = created;
                noteObj.opportunityId = waypointMap[note.ObjectiveUID].activity!.opportunityId;
            }
        } else {
            noteObj.contact = contactGroups[note.ContactGroupID];
            noteObj.createdAt = new Date(note.DateTimeEntered);
        }

        await noteObj.commit();
    }
}, 60000)

console.log('Success!')
process.exit(0);