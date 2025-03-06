'use server';
'use no memo';

import {Contact} from "~/db/sql/models/Contact";
import {User} from "~/db/sql/models/User";
import {API} from "~/util/api/ApiResponse";
import {AccessGroup, ContactType} from "~/common/enum/enumerations";
import {ClientReadResult} from "~/db/sql/types/utility";
import {ReadAttributes} from "~/db/sql/types/select";
import {ReadWhere} from "~/db/sql/types/where";
import {dbClient} from "~/db/sql/SQLBase";

const allowedContactAttributes: Set<AllowedContactAttributes> = new Set(['type', 'status', 'lifecycleStage', 'primaryEmail', 'primaryPhone', 'fullName', 'firstName', 'lastName']);
type AllowedContactAttributes =
    'type'
    | 'status'
    | 'lifecycleStage'
    | 'primaryEmail'
    | 'primaryPhone'
    | 'fullName'
    | 'firstName'
    | 'lastName';

async function _readContact<Keys extends AllowedContactAttributes[]>(user: User, search: string, page: number, perPage: number, attributes: Keys, filters?: {
    type?: ContactType,
    requireEmail?: boolean
    requirePhone?: boolean
}): Promise<[ClientReadResult<Contact, Keys>[], number]> {
    let where = Contact.searchWhere(user.tenetId ?? undefined, search);
    if (filters) {
        const and: ReadWhere<Contact>[] = [];
        dbClient.contact.findMany({
            where: {}
        })

        if (filters.type) {
            and.push({
                type: filters.type
            })
        }
        if (filters.requireEmail) {
            and.push({
                emails: {
                    some: {}
                }
            })
        }
        if (filters.requirePhone) {
            and.push({
                phones: {
                    some: {}
                }
            })
        }

        if (and.length > 0) {
            and.push(where);
            where = {
                AND: and
            }
        }
    }

    if (page <= 0) {
        page = 1;
    }

    if (perPage > 100) {
        perPage = 100;
    }

    const select: ReadAttributes<Contact> = {};

    for (const attribute of attributes) {
        if (!allowedContactAttributes.has(attribute)) {
            throw new Error(`Invalid attribute ${attribute} for contacts`);
        }
        if (attribute === 'primaryEmail') {
            select.emails = {
                select: {
                    id: true,
                    email: true,
                    isPrimary: true
                },
                orderBy: {
                    isPrimary: 'desc'
                }
            }
        } else if (attribute === 'primaryPhone') {
            select.phones = {
                select: {
                    id: true,
                    number: true,
                    isPrimary: true
                },
                orderBy: {
                    isPrimary: 'desc'
                }
            }
        } else {
            select[attribute] = true;
        }
    }

    const [contacts, count] = await Promise.all([
        Contact.read({
            where,
            orderBy: {
                firstName: 'asc',
                lastName: 'asc'
            },
            select,
            limit: perPage,
            offset: (page - 1) * perPage
        }), Contact.count(where)
    ])

    return [contacts.map(contact => contact.clientSafeJson(attributes) as ClientReadResult<Contact, Keys>), count]
}

async function _readUser(user: User, search: string, page: number, perPage: number): Promise<[ClientReadResult<User, ['fullName', 'email']>[], number]> {
    const where: ReadWhere<User> = {
        OR: [
            {
                fullName: {
                    contains: search, mode: 'insensitive'
                }
            },
            {
                email: {
                    contains: search, mode: 'insensitive'
                }
            }
        ],
        tenetId: user.tenetId ?? undefined,
        type: AccessGroup.CLIENT
    }

    if (page <= 0) {
        page = 1;
    }

    if (perPage > 100) {
        perPage = 100;
    }

    const [users, count] = await Promise.all([User.read({
        where,
        orderBy: {
            fullName: 'asc'
        },
        select: {
            id: true,
            fullName: true,
            email: true
        },
        limit: perPage,
        offset: (page - 1) * perPage
    }), User.count(where)])

    return [users.map(user => user.clientSafeJson(['fullName', 'email']) as ClientReadResult<User, ['fullName', 'email']>), count]
}

export const readContact = API.serverAction(_readContact);
export const readUser = API.serverAction(_readUser);