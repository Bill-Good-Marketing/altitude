import {Sort} from "~/components/data/DataTable";
import {ContactResult, ContactSearchFilter} from "~/app/(authenticated)/contacts/client";
import {ToastResponse} from "~/util/api/client/APIClient";
import {Contact} from "~/db/sql/models/Contact";
import {ReadWhere} from "~/db/sql/types/where";
import {ContactStatus, ContactType} from "~/common/enum/enumerations";
import {ReadOrder} from "~/db/sql/types/model";
import {API} from "~/util/api/ApiResponse";
import {TimelineSelect, toFeedItem} from "~/db/sql/models/ContactTimelineEvent";
import {ModelSetType} from "~/db/sql/types/utility";

export async function searchContacts(tenetId: Buffer | undefined, searchString: string, page: number, count: number, sortBy: Sort<ContactResult>, filters?: ContactSearchFilter): Promise<[ContactResult[], number] | ToastResponse> {
    if (count > 100) {
        count = 100;
    }

    const baseWhere = Contact.searchWhere(tenetId, searchString);

    const allowedSorts = new Set(['fullName', 'type', 'status'])

    const where: ReadWhere<Contact> = {
        AND: [
            baseWhere,
            {
                type: filters?.householdStatus ? ContactType.INDIVIDUAL : filters?.type,
                status: filters?.status,
                householdStatus: filters?.householdStatus
            }
        ]
    }

    const orderBy: ReadOrder<Contact> = {}

    for (const sortByKey in sortBy) {
        const _key2 = sortByKey as keyof Sort<ContactResult>;
        if (allowedSorts.has(sortByKey) && sortBy[_key2] != null) {
            orderBy[sortByKey as 'fullName' | 'type' | 'status'] = sortBy[_key2] as 'asc' | 'desc'
        } else {
            return API.toast(`Invalid sort field ${sortByKey}`, 'error', 400)
        }
    }

    const [contacts, recordCount] = await Promise.all([Contact.read({
        where,
        orderBy,
        select: {
            id: true,
            type: true,
            status: true,
            fullName: true,
            emails: {
                select: {
                    email: true,
                    isPrimary: true
                },
                take: 1,
                orderBy: {
                    isPrimary: 'desc',
                    createdAt: 'desc'
                }
            },
            phones: {
                select: {
                    number: true,
                    isPrimary: true
                },
                take: 1,
                orderBy: {
                    isPrimary: 'desc',
                    createdAt: 'desc'
                }
            },
            addresses: {
                select: {
                    city: true,
                    state: true,
                    primary: true,
                    country: true,
                    timezone: true
                },
                take: 1,
                orderBy: {
                    primary: 'desc',
                    createdAt: 'desc'
                }
            },
            householdStatus: true,
            householdId: true,
            companyId: true,
            primaryContactId: true,
            headOfHouseholdId: true,
            position: true,
            company: {
                select: {
                    id: true,
                    lastName: true,
                }
            },
            household: {
                select: {
                    id: true,
                    lastName: true,
                    headOfHousehold: {
                        select: {
                            id: true,
                            fullName: true
                        }
                    }
                }
            },
            timelineEvents: {
                take: 3,
                orderBy: {
                    createdAt: 'desc'
                },
                select: TimelineSelect
            },
        },
        limit: count,
        offset: (page - 1) * count
    }), Contact.count(where)])

    type ContactMembership = { name: string, id: string, status: ContactStatus }

    const contactsById: { [key: string]: ModelSetType<typeof contacts> } = {};
    const householdMembership: { [key: string]: ContactMembership[] } = {};
    const companyMembership: { [key: string]: ContactMembership[] } = {};

    for (const contact of contacts) {
        contactsById[contact.guid.toString('hex')] = contact;

        if (contact.householdId) {
            if (!(contact.householdId.toString('hex') in householdMembership)) {
                householdMembership[contact.householdId.toString('hex')] = [];
            }
            householdMembership[contact.householdId.toString('hex')].push({
                name: contact.fullName!,
                id: contact.guid.toString('hex'),
                status: contact.status!
            });
        }

        if (contact.companyId) {
            if (!(contact.companyId.toString('hex') in companyMembership)) {
                companyMembership[contact.companyId.toString('hex')] = [];
            }
            companyMembership[contact.companyId.toString('hex')].push({
                name: contact.fullName!,
                id: contact.guid.toString('hex'),
                status: contact.status!
            });
        }
    }

    return [
        contacts.map(contact => {
            let members: ContactMembership[] = [];
            if (contact.type === ContactType.HOUSEHOLD) {
                if (contact.guid.toString('hex') in householdMembership) {
                    members.push(...householdMembership[contact.guid.toString('hex')]);
                }
            } else if (contact.type === ContactType.COMPANY) {
                if (contact.guid.toString('hex') in companyMembership) {
                    members.push(...companyMembership[contact.guid.toString('hex')]);
                }
            }

            if (members.length > 4) {
                members = members.slice(0, 4);
                members.push({name: 'others', id: 'others', status: ContactStatus.PLAN_PARTICIPANT});
            }

            return {
                id: contact.guid.toString('hex'),
                fullName: contact.fullName!,
                type: contact.type!,
                status: contact.status!,
                email: contact.primaryEmail!,
                phone: contact.primaryPhone!,
                city: contact.addresses[0]?.city,
                state: contact.addresses[0]?.state,
                householdStatus: contact.householdStatus ?? undefined,
                companyName: contact.company?.lastName,
                companyId: contact.company?.guid.toString('hex'),
                position: contact.position ?? undefined,
                householdName: contact.household?.lastName,
                householdId: contact.household?.guid.toString('hex'),
                headOfHouseholdName: contact.household?.headOfHousehold?.fullName,
                headOfHouseholdId: contact.household?.headOfHousehold?.guid.toString('hex'),
                members,
                recentActivities: contact.timelineEvents.map(toFeedItem),
                tz: contact.addresses[0]?.timezone,
                country: contact.addresses[0]?.country,
            } as ContactResult
        }),
        recordCount
    ]
}