'use server';
'use no memo';
import {Contact} from "~/db/sql/models/Contact";
import {
    CompanyRelationshipStatus,
    ContactRelationshipType,
    ContactRelationshipTypeNameMapping,
    ContactTimelineEventJoinType,
    ContactTimelineEventType,
    ContactType,
    ContactTypeNameMapping,
    getContactTypeFromRelationshipType,
    LifecycleStage
} from "~/common/enum/enumerations";
import {User} from "~/db/sql/models/User";
import {API} from "~/util/api/ApiResponse";
import {isEmptyString, properArticle} from "~/util/strings";
import {ClientContact} from "~/app/(authenticated)/contacts/[guid]/components/ContactForm";
import {Address} from "~/db/sql/models/Address";
import {ContactEmail} from "~/db/sql/models/ContactEmail";
import {ContactPhone} from "~/db/sql/models/ContactPhone";
import {ImportantDate} from "~/db/sql/models/ImportantDate";
import {ToastResponse} from "~/util/api/client/APIClient";
import {ReadWhere} from "~/db/sql/types/where";
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {Note} from "~/db/sql/models/Note";
import {ContactTimelineEvent, TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";
import {Model} from "~/db/sql/SQLBase";

const _getRelationships = async (user: User, contact: string) => {
    'use no memo';
    const contactObj = await Contact.readUnique({
        where: {
            id: Buffer.from(contact, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            type: true,
            fullName: true,
            relationAsSource: {
                select: {
                    contactRelationType: true,
                    contactRelationEstablished: true,
                    contactRelationNotes: true,
                    type: true,
                    fullName: true,
                    relationId: true,
                }
            },
            relationAsTarget: {
                select: {
                    contactRelationType: true,
                    contactRelationEstablished: true,
                    contactRelationNotes: true,
                    type: true,
                    fullName: true,
                    relationId: true,
                }
            }
        }
    });

    if (contactObj == null) {
        return API.toast('Contact not found', 'error', 404);
    }

    type Relationship = {
        id: string,
        relationId: string,
        type: ContactType,
        target: string,
        source: string,
        established: Date | null,
        notes: string | null,
        contactRelationType: string,
        fullName: string,
    }

    const records: Record<string, Array<Relationship>> = {};

    for (const relationship of contactObj.relationAsSource) {
        records[relationship.guid.toString('hex')] ??= [];
        records[relationship.guid.toString('hex')].push({
            id: relationship.guid.toString('hex'),
            type: relationship.type!,
            relationId: relationship.relationId!.toString('hex'),
            target: relationship.guid.toString('hex'),
            source: contactObj.guid.toString('hex'),
            established: relationship.contactRelationEstablished,
            notes: relationship.contactRelationNotes,
            contactRelationType: relationship.contactRelationType,
            fullName: relationship.fullName,
        });
    }

    for (const relationship of contactObj.relationAsTarget) {
        records[relationship.guid.toString('hex')] ??= [];
        records[relationship.guid.toString('hex')].push({
            id: relationship.guid.toString('hex'),
            type: relationship.type!,
            relationId: relationship.relationId!.toString('hex'),
            target: contactObj.guid.toString('hex'),
            source: relationship.guid.toString('hex'),
            established: relationship.contactRelationEstablished,
            notes: relationship.contactRelationNotes,
            contactRelationType: relationship.contactRelationType,
            fullName: relationship.fullName,
        });
    }

    return Object.values(records).map(relationship => {
        const baseContact = relationship[0];
        return {
            name: baseContact.fullName,
            nodeType: baseContact.type,
            id: baseContact.id,
            relationships: relationship.map(rel => ({
                id: rel.relationId,
                type: rel.contactRelationType as ContactRelationshipType,
                target: rel.target,
                source: rel.source,
                established: rel.established,
                notes: rel.notes
            })),
        }
    });
}

const _updateLifecycleStage = async (user: User, contact: string, stage: LifecycleStage | 'null') => {
    const contactObj = await Contact.readUnique({
        where: {
            id: Buffer.from(contact, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {lifecycleStage: true}
    });

    if (contactObj == null) {
        return API.toast('Contact not found', 'error', 404);
    }

    if (stage === 'null') {
        await contactObj.asyncSet('lifecycleStage', null);
        return API.toast('Lifecycle stage cleared', 'success', 200);
    } else if (contactObj.lifecycleStage !== stage) {
        await contactObj.asyncSet('lifecycleStage', stage);
        return API.toast('Lifecycle stage updated', 'success', 200);
    }
    return API.toast('Lifecycle stage unchanged', 'info', 400);
}

const _updateRelationship = async (user: User, relId: string, origin: string, target: string, type: ContactRelationshipType, established?: Date, notes?: string, newContact?: string) => {
    const contactType = Contact.getType(Buffer.from(target, 'hex'));
    if (contactType !== getContactTypeFromRelationshipType(type)) {
        return API.toast(`${properArticle(ContactTypeNameMapping[getContactTypeFromRelationshipType(type)], true, true)} cannot be used for ${properArticle(ContactRelationshipTypeNameMapping[type].replaceAll(/ of$| for$/g, ''), false, true)} relationship. Please select ${properArticle(ContactTypeNameMapping[getContactTypeFromRelationshipType(type)], false, true)} instead.`, 'error', 400);
    }

    await Model.getPrisma().contactRelationship.update({
        where: {
            id: Buffer.from(relId, 'hex')
        },
        data: {
            type: type,
            established: established?.toISOString(),
            notes: notes,
            sourceId: Buffer.from(origin, 'hex'),
            targetId: newContact ? Buffer.from(newContact, 'hex') : Buffer.from(target, 'hex'),
        }
    })

    return API.toast('Relationship updated', 'success', 200);
}

const _createRelationship = async (user: User, origin: string, target: string, type: ContactRelationshipType, established?: Date, notes?: string) => {
    'use no memo';
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to create a relationship', 'error', 400);
    }

    const contactType = Contact.getType(Buffer.from(target, 'hex'));
    if (contactType !== getContactTypeFromRelationshipType(type)) {
        return API.toast(`${properArticle(ContactTypeNameMapping[getContactTypeFromRelationshipType(type)], true, true)} cannot be used for ${properArticle(ContactRelationshipTypeNameMapping[type].replaceAll(/ of$| for$/g, ''), false, true)} relationship. Please select ${properArticle(ContactTypeNameMapping[getContactTypeFromRelationshipType(type)], false, true)} instead.`, 'error', 400);
    }

    const contact = new Contact(origin);
    const targetContact = new Contact(target);
    contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.RELATIONSHIP_FROM;
    targetContact.contactTimelineRelationshipType = ContactTimelineEventJoinType.RELATIONSHIP_TO;

    contact.timelineEvents ??= [];
    contact.timelineEvents.push(new ContactTimelineEvent(undefined, {
        eventType: ContactTimelineEventType.RELATIONSHIP_ADDED,
        userId: user.guid,
        tenetId: user.tenetId,
        contacts: [contact, targetContact],
        relationshipType: type,
    }));

    contact.relationAsSource ??= [];
    contact.relationAsSource.push(new Contact(target, {
        contactRelationType: type,
        contactRelationEstablished: established,
        contactRelationNotes: notes,
    }));

    await contact.commit();
    return API.toast('Relationship created', 'success', 200);
}

const _deleteRelationship = async (user: User, relId: string, origin: string, target: string, type: ContactRelationshipType) => {
    'use no memo';
    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to delete a relationship', 'error', 400);
    }

    const contact = new Contact(origin);
    const targetContact = new Contact(target);

    contact.timelineEvents ??= [];
    contact.timelineEvents.push(new ContactTimelineEvent(undefined, {
        eventType: ContactTimelineEventType.RELATIONSHIP_REMOVED,
        userId: user.guid,
        tenetId: user.tenetId,
        contacts: [contact, targetContact],
        relationshipType: type,
    }));

    contact.relationAsSource ??= [
        new Contact(target, {
            contactRelationType: type,
            relationId: Buffer.from(relId, 'hex'),
        })
    ]
    contact.relationAsTarget = [];

    await contact.commit();
    return API.toast('Relationship deleted', 'success', 200);
}

const _updateContact = async (user: User, contact: ClientContact) => {
    'use no memo';
    if (!contact.guid) {
        return API.toast('Contact GUID is required', 'error', 400);
    }

    if (!contact.status) {
        return API.toast('Contact status is required', 'error', 400);
    }

    const contactObj = await Contact.readUnique({
        where: {
            id: Buffer.from(contact.guid, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            type: true,
            status: true,
            fullName: true,
            householdId: true,
            emails: true,
            phones: true,
            addresses: true,
            lifecycleStage: true,
            importantDates: true,
            importantNotes: true,
            primaryContactId: true,
            headOfHouseholdId: true,
            companyId: true,
            position: true,
            householdStatus: true,
            companyStatus: true,
        }
    });

    if (contactObj == null) {
        return API.toast('Contact not found', 'error', 404);
    }

    if (isEmptyString(contact.lastName)) {
        return API.toast('Contact name is required', 'error', 400);
    } else if (isEmptyString(contact.firstName) && contactObj.type === ContactType.INDIVIDUAL) {
        return API.toast('Contact name is required', 'error', 400);
    }

    contactObj.status = contact.status;
    contactObj.firstName = contact.firstName;
    contactObj.lastName = contact.lastName;
    contactObj.householdId = contact.household ? Buffer.from(contact.household?.guid, 'hex') : null;
    contactObj.householdStatus = contact.householdStatus;
    contactObj.lifecycleStage = contact.lifecycleStage;
    contactObj.importantNotes = contact.importantNotes;
    contactObj.companyId = contact.company ? Buffer.from(contact.company.guid, 'hex') : null;
    contactObj.position = contact.position ?? null;
    contactObj.headOfHouseholdId = contact.headOfHousehold ? Buffer.from(contact.headOfHousehold.guid, 'hex') : null;
    contactObj.primaryContactId = contact.primaryContact ? Buffer.from(contact.primaryContact.guid, 'hex') : null;
    contactObj.companyStatus = contact.companyStatus;

    const events: ContactTimelineEvent[] = [];

    if (contactObj.isDirty('householdId')) {
        const old = contactObj.getOld('householdId');
        const contact = new Contact(contactObj.guid, {
            contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT
        });
        if (old != null) {
            const oldHH = new Contact(old);
            oldHH.contactTimelineRelationshipType = ContactTimelineEventJoinType.MEMBER_PARENT;

            contactObj.timelineEvents ??= [];
            events.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.MEMBER_REMOVED,
                userId: user.guid,
                tenetId: user.guid,
                contacts: [contact, oldHH],
            }));
        }

        if (contactObj.householdId != null) {
            const newHH = new Contact(contactObj.householdId);
            newHH.contactTimelineRelationshipType = ContactTimelineEventJoinType.MEMBER_PARENT;

            contactObj.timelineEvents ??= [];
            events.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.MEMBER_ADDED,
                userId: user.guid,
                tenetId: user.guid,
                contacts: [contact, newHH],
            }));
        }
    } else if (contactObj.isDirty('companyId')) {
        const old = contactObj.getOld('companyId');
        const contact = new Contact(contactObj.guid, {
            contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT
        });
        if (old != null) {
            const oldCompany = new Contact(old);
            oldCompany.contactTimelineRelationshipType = ContactTimelineEventJoinType.MEMBER_PARENT;

            contactObj.timelineEvents ??= [];
            events.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.MEMBER_REMOVED,
                userId: user.guid,
                tenetId: user.guid,
                contacts: [contact, oldCompany],
            }));
        }

        if (contactObj.companyId != null) {
            const newCompany = new Contact(contactObj.companyId);
            newCompany.contactTimelineRelationshipType = ContactTimelineEventJoinType.MEMBER_PARENT;

            contactObj.timelineEvents ??= [];
            events.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.MEMBER_ADDED,
                userId: user.guid,
                tenetId: user.guid,
                contacts: [contact, newCompany],
            }));
        }
    }

    contactObj.addresses = contact.addresses.map(addr => (
        new Address(addr.guid, {
            ...addr,
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        }) as typeof contactObj.addresses[number]
    ));
    contactObj.emails = contact.emails.map(email => (
        new ContactEmail(email.guid, {
            ...email,
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        }) as typeof contactObj.emails[number]
    ));
    contactObj.phones = contact.phones.map(phone => {
        return new ContactPhone(phone.guid, {
            ...phone,
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        }) as typeof contactObj.phones[number]
    });
    contactObj.importantDates = contact.importantDates.map(date => {
        return new ImportantDate(date.guid, {
            type: date.type,
            date: new Date(date.date), // Should be in ISO format
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        }) as typeof contactObj.importantDates[number]
    });

    if (events.length > 0) {
        await Promise.all([contactObj.commit(), ...events.map(event => event.commit())])
    } else {
        await contactObj.commit()
    }

    return API.toast('Contact updated', 'success', 200);
}

const _createContact = async (user: User, type: ContactType, contact: ClientContact) => {
    if (contact.guid) {
        return API.toast('Cannot create a contact that already exists', 'error', 400);
    }

    if (!contact.status) {
        return API.toast('Contact status is required', 'error', 400);
    }

    if (isEmptyString(contact.lastName)) {
        return API.toast('Contact name is required', 'error', 400);
    } else if (isEmptyString(contact.firstName) && type === ContactType.INDIVIDUAL) {
        return API.toast('Contact name is required', 'error', 400);
    }

    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to create a contact', 'error', 400);
    }

    // TS = dump, requires type annotation here for some reason
    const contactObj: Contact = new Contact(undefined, {
        status: contact.status,
        firstName: contact.firstName,
        lastName: contact.lastName,
        tenetId: user.tenetId,
        type,
        importantNotes: contact.importantNotes,
        householdId: contact.household ? Buffer.from(contact.household.guid, 'hex') : null,
        lifecycleStage: contact.lifecycleStage,
        companyId: contact.company ? Buffer.from(contact.company.guid, 'hex') : null,
        position: contact.position ?? null,
        householdStatus: contact.householdStatus,
        primaryContactId: contact.primaryContact ? Buffer.from(contact.primaryContact.guid, 'hex') : null,
        headOfHouseholdId: contact.headOfHousehold ? Buffer.from(contact.headOfHousehold.guid, 'hex') : null,
        companyStatus: contact.companyStatus,
        industry: contact.industry,
        size: contact.size,
        website: contact.website,
        addresses: contact.addresses.map(addr => new Address(undefined, {
            ...addr,
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        })),
        emails: contact.emails.map(email => new ContactEmail(undefined, {
            ...email,
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        })),
        phones: contact.phones.map(phone => new ContactPhone(undefined, {
            ...phone,
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        })),
        importantDates: contact.importantDates.map(date => new ImportantDate(undefined, {
            type: date.type,
            date: new Date(date.date), // Should be in ISO format
            tenetId: contactObj.tenetId!,
            contactId: contactObj.guid
        })),
        timelineEvents: [
            new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.CONTACT_CREATED,
                userId: user.guid,
                tenetId: user.tenetId,
                relationshipType: ContactRelationshipType.PRIMARY_CONTACT,
                contactTimelineRelationshipType: ContactTimelineEventJoinType.CONTACT_TARGET,
            })
        ]
    });

    if (contactObj)
        await contactObj.commit();

    return API.toast('Contact created', 'success', 200);
}

const _getEditContact = async (user: User, guid: string): Promise<ClientContact | ToastResponse> => {
    const contact = await Contact.readUnique({
        where: {
            id: Buffer.from(guid, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            type: true,
            status: true,
            fullName: true,
            firstName: true,
            lastName: true,
            emails: true,
            phones: true,
            addresses: true,
            lifecycleStage: true,
            importantDates: true,
            importantNotes: true,
            householdStatus: true,
            companyStatus: true,
            industry: true,
            size: true,
            website: true,
            position: true,
            household: {
                select: {
                    id: true,
                    fullName: true
                }
            },
            company: {
                select: {
                    id: true,
                    fullName: true
                }
            },
            headOfHousehold: {
                select: {
                    id: true,
                    fullName: true
                }
            },
            primaryContact: {
                select: {
                    id: true,
                    fullName: true
                }
            }
        }
    });

    if (!contact) {
        return API.toast('Contact not found', 'error', 404);
    }

    return {
        guid: contact.guid.toString('hex'),
        firstName: contact.firstName,
        lastName: contact.lastName,
        household: contact.household ? {
            guid: contact.household.guid.toString('hex'),
            fullName: contact.household.fullName!,
            primaryEmail: null
        } : null,
        company: contact.company ? {
            guid: contact.company.guid.toString('hex'),
            fullName: contact.company.fullName!,
            primaryEmail: null
        } : null,
        emails: contact.emails.map(email => ({
            guid: email.guid.toString('hex'),
            email: email.email,
            isPrimary: email.isPrimary
        })) ?? [],
        phones: contact.phones.map(phone => ({
            guid: phone.guid.toString('hex'),
            number: phone.formattedNumber,
            isPrimary: phone.isPrimary,
            type: phone.type
        })) ?? [],
        addresses: contact.addresses.map(address => address.clientSafeJson()) ?? [],
        status: contact.status,
        lifecycleStage: contact.lifecycleStage,
        importantDates: contact.importantDates.map(date => ({
            guid: date.guid.toString('hex'),
            date: date.date.toISOString().split('T')[0],
            type: date.type
        })) ?? [],
        importantNotes: contact.importantNotes,
        householdStatus: contact.householdStatus,
        companyStatus: contact.companyStatus,
        industry: contact.industry,
        size: contact.size,
        website: contact.website,
        headOfHousehold: contact.headOfHousehold ? {
            guid: contact.headOfHousehold.guid.toString('hex'),
            fullName: contact.headOfHousehold.fullName,
            primaryEmail: null,
            primaryPhone: null
        } : null,
        primaryContact: contact.primaryContact ? {
            guid: contact.primaryContact.guid.toString('hex'),
            fullName: contact.primaryContact.fullName,
            primaryEmail: null,
            primaryPhone: null
        } : null,
        position: contact.position,
    }
}

const _addNote = async (user: User, contact: string, note: string) => {
    const contactObj = await Contact.readUnique({
        where: {
            id: Buffer.from(contact, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
    });

    if (contactObj == null) {
        return API.toast('Contact not found', 'error', 404);
    }

    if (user.tenetId == null) {
        return API.toast('You must be in a tenet to add a note', 'error', 400);
    }

    const _note = new Note(undefined, {
        contactId: Buffer.from(contact, 'hex'),
        tenetId: user.tenetId!,
        content: note,
        authorId: user.guid,
        events: [
            new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.NOTE,
                userId: user.guid,
                tenetId: user.tenetId,
                contacts: [new Contact(contact, {
                    contactTimelineRelationshipType: ContactTimelineEventJoinType.CONTACT_TARGET
                })],
            })
        ]
    })

    await _note.commit();
    return API.toast('Note added', 'success', 200);
}

const _getFeed = async (user: User, contact: string, offset: number, count: number): Promise<[FeedItem[], number]> => {
    if (count > 5) {
        count = 5;
    }

    let where: ReadWhere<ContactTimelineEvent>;
    const type = Contact.getType(Buffer.from(contact, 'hex'));
    switch (type) {
        case ContactType.INDIVIDUAL:
            where = {
                tenetId: user.tenetId ?? undefined,
                contacts: {
                    some: {
                        deleted: undefined,
                        id: Buffer.from(contact, 'hex')
                    }
                },
                NOT: {
                    AND: [
                        {
                            contacts: {
                                some: {
                                    deleted: undefined,
                                    contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT
                                }
                            }
                        },
                        {
                            eventType: ContactTimelineEventType.MEMBER_REMOVED
                        }
                    ]
                },
            }
            break;
        case ContactType.HOUSEHOLD:
            // Household or members
            where = {
                tenetId: user.tenetId ?? undefined,
                contacts: {
                    some: {
                        deleted: undefined,
                        OR: [
                            {id: Buffer.from(contact, 'hex'), deleted: undefined},
                            {householdId: Buffer.from(contact, 'hex'), deleted: undefined},
                        ]
                    }
                },
                NOT: {
                    AND: [
                        {
                            contacts: {
                                some: {
                                    deleted: undefined,
                                    contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT
                                }
                            }
                        },
                        {
                            eventType: ContactTimelineEventType.MEMBER_REMOVED
                        }
                    ]
                },
            };
            break;

        case ContactType.COMPANY:
            // Company or employees
            where = {
                tenetId: user.tenetId ?? undefined,
                contacts: {
                    some: {
                        deleted: undefined,
                        OR: [
                            {id: Buffer.from(contact, 'hex'), deleted: undefined},
                            {companyId: Buffer.from(contact, 'hex'), deleted: undefined}
                        ]
                    }
                },
                NOT: {
                    AND: [
                        {
                            contacts: {
                                some: {
                                    deleted: undefined,
                                    contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT
                                }
                            }
                        },
                        {
                            eventType: ContactTimelineEventType.MEMBER_REMOVED
                        }
                    ]
                },
            };
            break;
    }

    return Promise.all([(await ContactTimelineEvent.read({
        select: TimelineSelect,
        where,
        // Sort first by start date, then by end date, then by created date
        orderBy: {
            createdAt: 'desc'
        },
        limit: count,
        offset
    })).map(toFeedItem), ContactTimelineEvent.count(where)])
}

const _addEmployee = async (user: User, company: string, employee: string, position: string | null, relationship: CompanyRelationshipStatus) => {
    const contactObj = await Contact.readUnique({
        where: {
            id: Buffer.from(employee, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            companyId: true
        }
    });

    if (contactObj == null) {
        return API.toast('Employee not found', 'error', 404);
    }

    contactObj.companyId = Buffer.from(company, 'hex');
    contactObj.companyStatus = relationship;
    contactObj.position = position;

    await contactObj.commit();

    return 'success';
}

const _deleteEmployee = async (user: User, employee: string) => {
    const contact = await Contact.readUnique({
        where: {
            id: Buffer.from(employee, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            id: true,
            fullName: true,
            companyId: true,
            companyStatus: true,
            position: true
        }
    })

    if (contact == null) {
        return API.toast('Employee not found', 'error', 404);
    }

    if (contact.companyId == null) {
        return API.toast(`${contact.fullName} is not part of a company`, 'error', 400);
    }

    contact.companyStatus = null;
    contact.position = null;
    contact.companyId = null;

    await contact.commit();

    return 'success';
}

const _updateEmployee = async (user: User, employee: string, position: string | null, relationship: CompanyRelationshipStatus | null) => {
    const contact = await Contact.readUnique({
        where: {
            id: Buffer.from(employee, 'hex'),
            tenetId: user.tenetId ?? undefined
        },
        select: {
            fullName: true,
            companyId: true,
            companyStatus: true,
            position: true
        }
    })

    if (contact == null) {
        return API.toast('Employee not found', 'error', 404);
    }

    if (contact.companyId == null) {
        return API.toast(`${contact.fullName} is not part of a company`, 'error', 400);
    }

    contact.companyStatus = relationship;
    contact.position = position;

    await contact.commit();

    return 'success';
}

export const getRelationships = API.serverAction(_getRelationships);
export const updateLifecycleStage = API.serverAction(_updateLifecycleStage);
export const updateRelationship = API.serverAction(_updateRelationship);
export const createRelationship = API.serverAction(_createRelationship);
export const deleteRelationship = API.serverAction(_deleteRelationship);
export const updateContact = API.serverAction(_updateContact);
export const createContact = API.serverAction(_createContact);
export const getEditContact = API.serverAction(_getEditContact);
export const addNote = API.serverAction(_addNote);
export const getFeed = API.serverAction(_getFeed);
export const addEmployee = API.serverAction(_addEmployee);
export const deleteEmployee = API.serverAction(_deleteEmployee);
export const updateEmployee = API.serverAction(_updateEmployee);