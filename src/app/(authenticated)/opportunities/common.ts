import {TimePeriod} from "~/app/(authenticated)/opportunities/client/opportunity-filters";
import {ContactReadResult} from "~/components/data/pickers/ContactPicker";
import {UserReadResult} from "~/components/data/pickers/UserPicker";
import {ClientOpportunity} from "~/app/(authenticated)/opportunities/client/opportunity-table";
import {ReadWhere} from "~/db/sql/types/where";
import {Opportunity} from "~/db/sql/models/Opportunity";
import {Sort} from "~/components/data/DataTable";
import {ReadOrder} from "~/db/sql/types/model";
import {OpportunityStatistics} from "~/app/(authenticated)/opportunities/client/stats-chart";
import {OpportunityStatus} from "~/common/enum/enumerations";

export const searchOpportunities = async (tenetId: Buffer | undefined, searchString: string, timePeriod: TimePeriod, statusFilter: OpportunityStatus | null, contacts: ContactReadResult[], teamMembers: UserReadResult[], sortBy: Sort<ClientOpportunity>, page: number, perPage: number): Promise<[ClientOpportunity[], number]> => {
    const startDate = new Date()
    const endDate = new Date()

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    switch (timePeriod) {
        case 'this-year':
            startDate.setMonth(0)
            startDate.setDate(1)
            endDate.setMonth(12)
            endDate.setDate(0)
            break;
        case 'this-quarter': {
            const month = startDate.getMonth()
            const quarter = Math.floor(month / 3) // Q0 is the same as first quarter
            startDate.setMonth(quarter * 3)
            startDate.setDate(1)
            endDate.setMonth(quarter * 3 + 3)
            endDate.setDate(0)
            break;
        }
        case 'this-month':
            startDate.setDate(1)
            endDate.setMonth(startDate.getMonth() + 1)
            endDate.setDate(0)
            break;
        case 'next-month':
            startDate.setMonth(startDate.getMonth() + 1)
            startDate.setDate(1)
            endDate.setMonth(startDate.getMonth() + 1)
            endDate.setDate(0)
            break;
        case 'next-quarter': {
            const month = startDate.getMonth()
            const quarter = Math.floor(month / 3) + 1
            startDate.setMonth(quarter * 3)
            startDate.setDate(1)
            endDate.setMonth(quarter * 3 + 3)
            endDate.setDate(0)
            break;
        }
    }

    const where: ReadWhere<Opportunity> = {
        title: {
            contains: searchString, mode: 'insensitive'
        },
        tenetId,
        OR: [
            {
                expectedCloseDate: {
                    gte: startDate,
                    lte: endDate
                }
            },
            {
                actualCloseDate: {
                    gte: startDate,
                    lte: endDate
                }
            }
        ],
        teamMembers: teamMembers.length > 0 ? {
            some: {
                id: {
                    in: teamMembers.map(contact => Buffer.from(contact.guid, 'hex'))
                }
            }
        } : undefined
    }

    if (contacts.length > 0) {
        where.AND = [
            {
                contacts: {
                    some: {
                        fullName: {
                            contains: searchString, mode: 'insensitive'
                        }
                    }
                },
            },
            {
                contacts: {
                    some: {
                        id: {
                            in: contacts.map(contact => Buffer.from(contact.guid, 'hex'))
                        }
                    }
                }
            }
        ]
    } else {
        where.contacts = {
            some: {
                fullName: {
                    contains: searchString, mode: 'insensitive'
                }
            }
        };
    }

    if (statusFilter != null) {
        where.status = statusFilter;
    }

    const orderBy: ReadOrder<Opportunity> = {};

    for (const key in sortBy) {
        const prop = key as keyof ReadOrder<Opportunity>;
        const _key = prop as keyof ClientOpportunity;

        if (key === 'expectedCloseDate' || key === 'actualCloseDate') {
            const sort = sortBy[key] as 'asc' | 'desc';
            orderBy.actualCloseDate = sort;
            orderBy.expectedCloseDate = sort;
        } else if (sortBy[_key] === 'asc') {
            orderBy[prop] = 'asc';
        } else {
            orderBy[prop] = 'desc';
        }
    }

    return await Promise.all([
        (await Opportunity.read({
            where,
            select: {
                title: true,
                contacts: {
                    select: {
                        fullName: true,
                        type: true,
                        phones: {
                            select: {
                                number: true,
                                isPrimary: true
                            },
                            orderBy: {
                                isPrimary: 'asc',
                                createdAt: 'asc'
                            },
                            take: 1
                        },
                        emails: {
                            select: {
                                email: true,
                                isPrimary: true
                            },
                            orderBy: {
                                isPrimary: 'asc',
                                createdAt: 'asc'
                            },
                            take: 1
                        },
                        addresses: {
                            select: {
                                address: true,
                                primary: true
                            },
                            orderBy: {
                                primary: 'asc',
                                createdAt: 'asc'
                            },
                            take: 1
                        }
                    }
                },
                teamMembers: {
                    select: {
                        fullName: true
                    }
                },
                value: true,
                probability: true,
                expectedCloseDate: true,
                actualCloseDate: true,
                status: true,
            },
            offset: (page - 1) * perPage,
            limit: perPage,
            orderBy
        })).map(opp => ({
            guid: opp.guid.toString('hex'),
            title: opp.title,
            contacts: opp.contacts.map(contact => ({
                name: contact.fullName,
                guid: contact.guid.toString('hex'),
                primaryEmail: contact.primaryEmail ?? null,
                primaryPhone: contact.primaryPhone ?? null,
                primaryAddress: contact.primaryAddress?.address ?? null,
                type: contact.type,
            })),
            teamMembers: opp.teamMembers.map(user => user.fullName),
            value: opp.value,
            probability: opp.probability,
            expectedCloseDate: opp.expectedCloseDate,
            // expectedValue: opp.expectedValue,
            actualCloseDate: opp.actualCloseDate,
            status: opp.status,
        } as ClientOpportunity)),
        Opportunity.count(where)
    ])
}

export const getOpportunityStatistics = async (tenetId: Buffer | undefined, timePeriod: TimePeriod): Promise<OpportunityStatistics[]> => {
    const startDate = new Date()
    const endDate = new Date()

    startDate.setHours(0, 0, 0, 0)
    endDate.setHours(23, 59, 59, 999)

    switch (timePeriod) {
        case 'this-year':
            startDate.setMonth(0)
            startDate.setDate(1)
            endDate.setMonth(12)
            endDate.setDate(0)
            break;
        case 'this-quarter': {
            const month = startDate.getMonth()
            const quarter = Math.floor(month / 3) // Q0 is the same as first quarter
            startDate.setMonth(quarter * 3)
            startDate.setDate(1)
            endDate.setMonth(quarter * 3 + 3)
            endDate.setDate(0)
            break;
        }
        case 'this-month':
            startDate.setDate(1)
            endDate.setMonth(startDate.getMonth() + 1)
            endDate.setDate(0)
            break;
        case 'next-month':
            startDate.setMonth(startDate.getMonth() + 1)
            startDate.setDate(1)
            endDate.setMonth(startDate.getMonth() + 1)
            endDate.setDate(0)
            break;
        case 'next-quarter': {
            const month = startDate.getMonth()
            const quarter = Math.floor(month / 3) + 1
            startDate.setMonth(quarter * 3)
            startDate.setDate(1)
            endDate.setMonth(quarter * 3 + 3)
            endDate.setDate(0)
            break;
        }
    }

    return (await Opportunity.read({
        where: {
            tenetId,
            OR: [
                {
                    expectedCloseDate: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                {
                    actualCloseDate: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            ],
            status: {
                notIn: [OpportunityStatus.LOST, OpportunityStatus.CANCELLED]
            }
        },
        select: {
            expectedCloseDate: true,
            actualCloseDate: true,
            probability: true,
            value: true,
            title: true,
            status: true,
        }
    })).map(opportunity => {
        const date = opportunity.actualCloseDate ?? opportunity.expectedCloseDate

        if (opportunity.status === OpportunityStatus.WON) {
            return {
                date,
                amount: opportunity.value,
                name: opportunity.title,
                predicted: false,
                probability: opportunity.probability
            }
        }

        return {
            date,
            amount: opportunity.value,
            name: opportunity.title,
            predicted: true,
            probability: opportunity.probability
        }
    })
}