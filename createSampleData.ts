import {PrismaClient} from "@prisma/client";
import {faker} from "@faker-js/faker/locale/en";
import {
    AccessGroup,
    ActivityPriority,
    ActivityStatus,
    ActivityType,
    AddressType,
    ContactRelationshipType,
    ContactStatus, ContactTimelineEventJoinType, ContactTimelineEventType,
    ContactType,
    HouseholdRelationshipStatus,
    ImportantDateType,
    PhoneType,
    TaskScheduleType
} from "./src/common/enum/enumerations";
import {generateGuid} from "./src/util/db/guid";
import {SexType} from "@faker-js/faker";
import {Contact} from "./src/db/sql/models/Contact";
import {Activity} from "./src/db/sql/models/Activity";
import {Model} from "./src/db/sql/SQLBase";
import {encryptData} from "./src/util/db/datamanagement";
import bcrypt from "bcrypt";
import {Address} from "./src/db/sql/models/Address";
import {ContactEmail} from "./src/db/sql/models/ContactEmail";
import {ContactPhone} from "./src/db/sql/models/ContactPhone";
import {ImportantDate} from "./src/db/sql/models/ImportantDate";
import {Note} from "./src/db/sql/models/Note";
import {ContactTimelineEvent} from "./src/db/sql/models/ContactTimelineEvent";
import {User} from "./src/db/sql/models/User";

const prisma = new PrismaClient();

const randomHouseholdStatus = (sex: SexType) => {
    const femaleStatuses = [HouseholdRelationshipStatus.AUNT, HouseholdRelationshipStatus.DAUGHTER, HouseholdRelationshipStatus.MOTHER, HouseholdRelationshipStatus.NIECE, HouseholdRelationshipStatus.SISTER]
    const maleStatuses = [HouseholdRelationshipStatus.SON, HouseholdRelationshipStatus.UNCLE, HouseholdRelationshipStatus.BROTHER, HouseholdRelationshipStatus.FATHER, HouseholdRelationshipStatus.BROTHER]

    if (sex === 'male') {
        return maleStatuses[Math.floor(Math.random() * maleStatuses.length)];
    } else {
        return femaleStatuses[Math.floor(Math.random() * femaleStatuses.length)];
    }
}

const randomStatus = (isCompany: boolean = false) => {
    const statuses = [ContactStatus.CLIENT, ContactStatus.PROSPECT, ContactStatus.LEAD]

    if (isCompany) {
        statuses.push(ContactStatus.STRATEGIC_PARTNER);
    }

    return statuses[Math.floor(Math.random() * statuses.length)];
}

const businessSuffixes = ['Inc.', 'LLC', 'Ltd', 'and Company', 'Corp.'];

const randomActivityType = () => {
    const types = [ActivityType.TASK, ActivityType.SCHEDULED]
    return types[Math.floor(Math.random() * types.length)];
}

const randomActivityPriority = () => {
    const priorities = [ActivityPriority.HIGH, ActivityPriority.MEDIUM, ActivityPriority.LOW]
    return priorities[Math.floor(Math.random() * priorities.length)];
}

const randomActivityStatus = () => {
    const statuses = Object.values(ActivityStatus);
    return statuses[Math.floor(Math.random() * statuses.length)];
}

const randomActivityTaskScheduleType = () => {
    const types = Object.values(TaskScheduleType);
    return types[Math.floor(Math.random() * types.length)];
}

let userId = generateGuid();

const addActivities = async (contactId: Buffer) => {
    const activities: Activity[] = [];
    const randomNotes: Note[] = [];
    const numActivities = Math.floor(Math.random() * 30) + 5; // Between 1 and 5 activities
    const contact = new Contact(contactId);

    for (let i = 0; i < numActivities; i++) {
        const shouldBeNote = Math.random() < 0.33;

        if (shouldBeNote) {
            const rangeStart = new Date();
            const rangeEnd = new Date();
            rangeStart.setFullYear(rangeStart.getFullYear() - 3);

            const createdAt = faker.date.between({
                from: rangeStart,
                to: rangeEnd
            });

            const note = new Note(undefined, {
                content: faker.lorem.paragraph(),
                tenetId,
                authorId: userId,
                createdAt,
                contactId,
                events: [
                    new ContactTimelineEvent(undefined, {
                        eventType: ContactTimelineEventType.NOTE,
                        userId: userId,
                        tenetId,
                        contacts: [new Contact(contactId, {
                            contactTimelineRelationshipType: ContactTimelineEventJoinType.CONTACT_TARGET
                        })],
                        createdAt
                    })
                ]
            })

            randomNotes.push(note);
        } else {
            const activity = new Activity(undefined, {
                title: faker.company.buzzPhrase(),
                description: faker.hacker.phrase(),
                type: randomActivityType(),
                tenetId,
                assignedById: userId,
                events: [
                    new ContactTimelineEvent(undefined, {
                        eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                        userId: userId,
                        tenetId,
                        contacts: [contact],
                    })
                ],
                contacts: [contact],
                users: [new User(userId)],
            })

            switch (activity.type) {
                case ActivityType.TASK: {
                    const rangeStart = new Date();
                    const rangeEnd = new Date();
                    rangeStart.setFullYear(rangeStart.getFullYear() - 3);
                    rangeEnd.setMonth(rangeEnd.getMonth() + 1);

                    const start = faker.date.between({from: rangeStart, to: rangeEnd});
                    activity.startDate = start;

                    const daysUntilDue = Math.floor(Math.random() * 3);

                    const end = new Date(start);
                    end.setDate(end.getDate() + daysUntilDue);
                    activity.endDate = end;

                    activity.priority = randomActivityPriority();
                    activity.status = randomActivityStatus();
                    activity.taskScheduleType = randomActivityTaskScheduleType();

                    activity.events![0].createdAt = rangeStart;
                    break;
                }

                case ActivityType.SCHEDULED: {
                    const rangeStart = new Date();
                    const rangeEnd = new Date();
                    rangeStart.setFullYear(rangeStart.getFullYear() - 3);
                    rangeEnd.setMonth(rangeEnd.getMonth() + 1);

                    const start = faker.date.between({from: rangeStart, to: rangeEnd});
                    const hourStart = Math.floor(Math.random() * 8) + 9 // Between 9AM and 5PM

                    const atThirty = Math.random();
                    const minutes = atThirty >= 0.5 ? 30 : 0;

                    start.setHours(hourStart, minutes, 0, 0);
                    activity.startDate = start;

                    const hoursDuration = Math.floor(Math.random() * 8) / 2 + 0.5; // Between 0.5 and 4.5

                    const end = new Date(start);
                    end.setMinutes(end.getMinutes() + hoursDuration * 60);
                    activity.endDate = end;

                    activity.priority = randomActivityPriority();
                    activity.status = randomActivityStatus();
                    activity.taskScheduleType = randomActivityTaskScheduleType();
                    activity.events![0].createdAt = rangeStart;
                    break;
                }
            }

            activities.push(activity);

            const numNotes = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < numNotes; i++) {
                let from = new Date(activity.startDate!);
                let to = new Date(activity.endDate!);

                if (from > to) {
                    const temp = from;
                    from = to;
                    to = temp;
                }
                const createdAt = faker.date.between({
                    from,
                    to
                });

                const note = new Note(undefined, {
                    activityId: activity.guid,
                    content: faker.lorem.paragraph(),
                    contactId,
                    createdAt,
                    authorId: userId,
                    tenetId,
                    events: [
                        new ContactTimelineEvent(undefined, {
                            eventType: ContactTimelineEventType.NOTE,
                            userId: userId,
                            tenetId,
                            contacts: activity.contacts!.map(contact => {
                                contact.contactTimelineRelationshipType = ContactTimelineEventJoinType.CONTACT_TARGET;
                                return contact as Contact;
                            }),
                            activityId: activity.guid,
                            createdAt,
                        })
                    ]
                })
                randomNotes.push(note);
            }
        }
    }

    await Promise.all(activities.map(activity => activity.commit()));
    await Promise.all(randomNotes.map(note => note.commit()));
}

// To be done after all contacts are created
const createRandomProfessionalRelationship = async (individualCount: number, referrersCount: number) => {
    const professionalRelationships = [ContactRelationshipType.REFERRED, ContactRelationshipType.LAWYER, ContactRelationshipType.ESTATE_PLANNER, ContactRelationshipType.ACCOUNTANT];
    const relationship = professionalRelationships[Math.floor(Math.random() * professionalRelationships.length)];

    switch (relationship) {
        case ContactRelationshipType.REFERRED:
            // Existing clients refer new people
            const referrer = (await Contact.read({
                where: {
                    type: ContactType.INDIVIDUAL,
                    status: ContactStatus.CLIENT
                },
                select: {
                    id: true
                },
                limit: 1,
                offset: Math.floor(Math.random() * referrersCount)
            })).first()

            const referred = (await Contact.read({
                where: {
                    type: ContactType.INDIVIDUAL,
                },
                select: {
                    id: true
                },
                limit: 1,
                offset: Math.floor(Math.random() * individualCount)
            })).first();

            await referrer.addRelationship('relatedTo', referred as Contact, {
                type: relationship,
                established: faker.date.past({
                    years: 15
                }),
                notes: faker.lorem.paragraph()
            }, true);
            break;

        case ContactRelationshipType.LAWYER:
        case ContactRelationshipType.ESTATE_PLANNER:
        case ContactRelationshipType.ACCOUNTANT:
            // People go to companies for other financial services
            const partner = (await Contact.read({
                select: {
                    id: true
                },
                limit: 1,
                offset: Math.floor(Math.random() * individualCount)
            })).first()

            const client = (await Contact.read({
                where: {
                    type: ContactType.INDIVIDUAL,
                },
                select: {
                    id: true
                },
                limit: 1,
                offset: Math.floor(Math.random() * individualCount)
            })).first();

            await client.addRelationship('relatedTo', partner as Contact, {
                type: relationship,
                established: faker.date.past({
                    years: 15
                }),
                notes: faker.lorem.paragraph()
            }, true);
            break;
    }
}

const createImportantDates = async (contactId: Buffer) => {
    const importantDates = [new ImportantDate(undefined, {
        date: faker.date.past({
            years: 15
        }),
        type: ImportantDateType.BIRTHDAY,
        contactId,
        tenetId
    }), new ImportantDate(undefined, {
        date: faker.date.soon({
            days: 365
        }),
        type: ImportantDateType.ANNIVERSARY,
        contactId,
        tenetId
    }), new ImportantDate(undefined, {
        date: faker.date.between({
            from: new Date('2000-01-01'),
            to: new Date('2040-12-31')
        }),
        type: ImportantDateType.RETIREMENT,
        contactId,
        tenetId
    })]

    await Model.createMany(importantDates);
}

const createHousehold = async (tenetId: Buffer, contacts: number = 1, parentCompany?: Buffer) => {
    if (contacts < 1) {
        console.error('Contacts must be greater than 0');
        return;
    }
    const lastName = faker.person.lastName();

    const primaryPhone = faker.phone.number();
    const status = randomStatus();

    const hohSex = faker.person.sexType();
    const spouseSex = hohSex === 'male' ? 'female' : 'male';
    const primaryName = faker.person.firstName(hohSex);
    const primaryEmail = faker.internet.email({firstName: primaryName, lastName});

    const address = {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'USA',
        primary: true,
        tenetId
    }

    const household = new Contact(undefined, {
        lastName: lastName + ' Family',
        fullName: lastName + ' Family',
        companyId: parentCompany,
        status,
        tenetId,
    }, ContactType.HOUSEHOLD)

    await household.commit();

    await new ContactEmail(undefined, {
        email: primaryEmail,
        contactId: household.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new ContactPhone(undefined, {
        number: primaryPhone,
        type: PhoneType.HOME,
        contactId: household.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new Address(undefined, {
        ...address,
        contactId: household.guid,
        type: AddressType.HOME
    }).commit()

    const id = household.guid;

    const events: ContactTimelineEvent[] = [];

    if (parentCompany) {
        await household.addRelationship('relatedTo', new Contact(parentCompany), {
            type: ContactRelationshipType.OWNS_COMPANY,
            established: faker.date.past({
                years: 15
            }),
            notes: faker.lorem.paragraph()
        }, true);

        events.push(new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.MEMBER_ADDED,
            userId: userId,
            tenetId,
            contacts: [new Contact(id, {
                contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT
            }), new Contact(parentCompany, {
                contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
            })],
        }))
    }

    // Create head of household
    const headOfHousehold = new Contact(undefined, {
        firstName: primaryName,
        lastName: lastName,
        fullName: `${primaryName} ${lastName}`,
        status,
        tenetId,
        companyId: parentCompany,
        householdId: id,
        householdStatus: HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD,
        position: parentCompany ? faker.person.jobTitle() : undefined,
        contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT,
    }, ContactType.INDIVIDUAL)

    events.push(new ContactTimelineEvent(undefined, {
        eventType: ContactTimelineEventType.MEMBER_ADDED,
        userId: userId,
        tenetId,
        contacts: [new Contact(id, {
            contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
        }), headOfHousehold],
    }))

    await headOfHousehold.commit();

    await new ContactEmail(undefined, {
        email: primaryEmail,
        contactId: headOfHousehold.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new ContactPhone(undefined, {
        number: primaryPhone,
        type: PhoneType.HOME,
        contactId: headOfHousehold.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new Address(undefined, {
        ...address,
        contactId: headOfHousehold.guid,
        type: AddressType.HOME
    }).commit()

    household.headOfHouseholdId = headOfHousehold.guid;
    await household.commit();

    await headOfHousehold.addRelationship('relatedTo', household, {
        type: ContactRelationshipType.HEAD_OF_HOUSEHOLD,
        established: faker.date.past({
            years: 15
        }),
        notes: faker.lorem.paragraph()
    }, true);

    if (parentCompany) {
        await headOfHousehold.addRelationship('relatedTo', new Contact(parentCompany), {
            type: ContactRelationshipType.EXECUTIVE,
            established: faker.date.past({
                years: 15
            }),
            notes: faker.lorem.paragraph()
        }, true);

        events.push(new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.MEMBER_ADDED,
            userId: userId,
            tenetId,
            contacts: [headOfHousehold, new Contact(parentCompany, {
                contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
            })],
        }))
    }

    await addActivities(headOfHousehold.guid);
    await createImportantDates(headOfHousehold.guid);

    for (let i = 0; i < contacts; i++) {
        const sex = i === 0 ? spouseSex : faker.person.sexType();
        const name = faker.person.firstName(sex);
        const phone = faker.phone.number();
        const email = faker.internet.email({firstName: name, lastName});
        const _contact = new Contact(undefined, {
            firstName: name,
            lastName: lastName,
            fullName: `${name} ${lastName}`,
            status,
            tenetId,
            companyId: parentCompany,
            householdId: id,
            householdStatus: i === 0 ? HouseholdRelationshipStatus.SPOUSE : randomHouseholdStatus(sex),
            position: parentCompany ? faker.person.jobTitle() : undefined,
            contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT,
        }, ContactType.INDIVIDUAL)

        await _contact.commit();

        await new ContactEmail(undefined, {
            email: email,
            contactId: _contact.guid,
            tenetId,
            isPrimary: true
        }).commit()

        await new ContactPhone(undefined, {
            number: phone,
            type: PhoneType.HOME,
            contactId: _contact.guid,
            tenetId,
            isPrimary: true
        }).commit()

        await new Address(undefined, {
            ...address,
            contactId: _contact.guid,
            type: AddressType.HOME
        }).commit()

        await createImportantDates(_contact.guid);

        await headOfHousehold.addRelationship('relatedTo', _contact, {
            type: _contact.householdStatus,
            established: faker.date.past({
                years: 15
            }),
            notes: faker.lorem.paragraph()
        }, true);

        await _contact.addRelationship('relatedTo', household, {
            type: ContactRelationshipType.HOUSEHOLD,
            established: faker.date.past({
                years: 15
            }),
            notes: faker.lorem.paragraph()
        }, true);

        events.push(new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.MEMBER_ADDED,
            userId: userId,
            tenetId,
            contacts: [new Contact(id, {
                contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
            }), _contact],
        }))

        if (parentCompany) {
            await _contact.addRelationship('relatedTo', new Contact(parentCompany), {
                type: ContactRelationshipType.EXECUTIVE,
                established: faker.date.past({
                    years: 15
                }),
                notes: faker.lorem.paragraph()
            }, true);

            events.push(new ContactTimelineEvent(undefined, {
                eventType: ContactTimelineEventType.MEMBER_ADDED,
                userId: userId,
                tenetId,
                contacts: [_contact, new Contact(parentCompany, {
                    contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
                })],
            }))
        }

        await addActivities(_contact.guid);
    }

    await addActivities(id);
    await Promise.all(events.map(event => event.commit()))

    return id;
}

const createCompany = async (tenetId: Buffer, contacts: number = 1) => {
    if (contacts < 1) {
        console.error('Contacts must be greater than 0');
        return;
    }

    const companyName = faker.company.name();
    const domain = companyName.toLowerCase().replaceAll(/[^a-zA-Z\s]/g, '').replaceAll(' ', '-').replaceAll('--', '-') + '.com';
    const status = randomStatus(true);
    const suffix = businessSuffixes[Math.floor(Math.random() * businessSuffixes.length)];

    const company = new Contact(undefined, {
        lastName: companyName + ', ' + suffix,
        fullName: companyName + ', ' + suffix,
        status,
        tenetId,
        industry: faker.hacker.noun(),
        website: `https://${domain}`,
        size: contacts,
    }, ContactType.COMPANY);
    await company.commit();
    const id = company.guid;

    await new ContactEmail(undefined, {
        email: 'info@' + domain,
        contactId: company.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new ContactPhone(undefined, {
        number: faker.phone.number(),
        type: PhoneType.WORK,
        contactId: company.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new Address(undefined, {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'USA',
        primary: true,
        tenetId,
        contactId: company.guid,
        type: AddressType.WORK
    }).commit()

    const primaryName = faker.person.firstName();
    const primaryLastName = faker.person.lastName();
    const contact = new Contact(undefined, {
        firstName: primaryName,
        lastName: primaryLastName,
        fullName: `${primaryName} ${primaryLastName}`,
        position: faker.person.jobTitle(),
        status,
        tenetId,
        companyId: id,
        contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT,
    }, ContactType.INDIVIDUAL);
    await contact.commit();

    await new ContactEmail(undefined, {
        email: faker.internet.email({
            provider: domain,
            firstName: primaryName,
            lastName: primaryLastName
        }).toLowerCase(),
        contactId: contact.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new ContactPhone(undefined, {
        number: faker.phone.number(),
        type: PhoneType.WORK,
        contactId: contact.guid,
        tenetId,
        isPrimary: true
    }).commit()

    await new Address(undefined, {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: 'USA',
        primary: true,
        tenetId,
        contactId: contact.guid,
        type: AddressType.WORK
    }).commit()

    await createImportantDates(contact.guid);
    await addActivities(contact.guid);

    const events: ContactTimelineEvent[] = [];

    events.push(new ContactTimelineEvent(undefined, {
        eventType: ContactTimelineEventType.MEMBER_ADDED,
        userId: userId,
        tenetId,
        contacts: [contact, new Contact(id, {
            contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
        })],
    }))

    await contact.addRelationship('relatedTo', company, {
        type: ContactRelationshipType.OWNS_COMPANY,
        established: faker.date.past({
            years: 15
        }),
        notes: faker.lorem.paragraph()
    }, true);

    for (let i = 0; i < contacts; i++) {
        const name = faker.person.firstName();
        const lastName = faker.person.lastName();
        const phone = faker.phone.number();
        const email = faker.internet.email({provider: domain, firstName: name, lastName});
        const _contact = new Contact(undefined, {
            firstName: name,
            lastName: lastName,
            fullName: `${name} ${lastName}`,
            status: status === ContactStatus.STRATEGIC_PARTNER ? ContactStatus.STRATEGIC_PARTNER : ContactStatus.PLAN_PARTICIPANT,
            tenetId,
            companyId: id,
            position: faker.person.jobTitle(),
            contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_CONTACT,
        }, ContactType.INDIVIDUAL);
        await _contact.commit();

        events.push(new ContactTimelineEvent(undefined, {
            eventType: ContactTimelineEventType.MEMBER_ADDED,
            userId: userId,
            tenetId,
            contacts: [_contact, new Contact(id, {
                contactTimelineRelationshipType: ContactTimelineEventJoinType.MEMBER_PARENT
            })],
        }))

        await new ContactEmail(undefined, {
            email: email.toLowerCase(),
            contactId: _contact.guid,
            tenetId,
            isPrimary: true
        }).commit()

        await new ContactPhone(undefined, {
            number: phone,
            type: PhoneType.HOME,
            contactId: _contact.guid,
            tenetId,
            isPrimary: true
        }).commit()

        await new Address(undefined, {
            street: faker.location.streetAddress(),
            city: faker.location.city(),
            state: faker.location.state(),
            zip: faker.location.zipCode(),
            country: 'USA',
            primary: true,
            tenetId,
            contactId: _contact.guid,
            type: AddressType.WORK
        }).commit()

        await createImportantDates(_contact.guid);
        await addActivities(_contact.guid);

        await _contact.addRelationship('relatedTo', company, {
            type: ContactRelationshipType.EMPLOYEE,
            established: faker.date.past({
                years: 15
            }),
            notes: faker.lorem.paragraph()
        });
    }

    await Promise.all(events.map(event => event.commit()))
    await addActivities(id);

    return id;
}

const numCompanies = 15;
const numHouseholds = 25;

let tenetId = generateGuid();

const tenet = await prisma.tenet.findUnique({
    where: {
        name: 'Test Tenet'
    },
    select: {
        id: true
    }
})

if (tenet == null) {
    await prisma.tenet.create({
        data: {
            id: tenetId,
            name: 'Test Tenet',
        }
    });
} else {
    tenetId = Buffer.from(tenet.id);
}

const user = await prisma.user.findUnique({
    where: {
        email: 'test@example.com'
    },
    select: {
        id: true
    }
})

if (user == null) {
    await prisma.user.create({
        data: {
            id: userId,
            email: 'test@example.com',
            firstName: 'Test',
            lastName: 'User',
            fullName: 'Test User',
            type: AccessGroup.CLIENT,
            password: encryptData(bcrypt.hashSync('password', 10)),
            enabled: true,
            tenetId
        }
    });
} else {
    userId = Buffer.from(user.id);
}

let promises: Promise<any>[] = [];
for (let i = 0; i < numCompanies; i++) {
    promises.push((async () => {
        if (i % 3 === 0) {
            const id = await createCompany(tenetId, 15);

            await createHousehold(tenetId, Math.floor(Math.random() * 3) + 3, id); // Between 3 abd 5 contacts
        } else {
            await createCompany(tenetId, Math.floor(Math.random() * 15) + 1);
        }
    })())
}
await Promise.all(promises);

promises = [];
for (let i = 0; i < numHouseholds; i++) {
    promises.push(createHousehold(tenetId, Math.floor(Math.random() * 3) + 3)); // Between 3 and 5 contacts
}
await Promise.all(promises);

const individualCount = await Contact.count({
    type: ContactType.INDIVIDUAL
})

const referrersCount = await Contact.count({
    type: ContactType.INDIVIDUAL,
    status: ContactStatus.CLIENT
})

const professionalRelationshipCount = 500;

promises = [];
for (let i = 0; i < professionalRelationshipCount; i++) {
    promises.push(createRandomProfessionalRelationship(individualCount, referrersCount));
}
await Promise.all(promises);