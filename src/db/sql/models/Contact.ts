/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult, ReadOrder, ModelQueryable} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {persisted, required, wrap, jointable, join, Default, calculated, on, computed} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {Tenet} from '~/db/sql/models/Tenet';
import {Note} from '~/db/sql/models/Note';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {ContactTimelineEventJoinType, ContactType, ContactStatus, LifecycleStage, HouseholdRelationshipStatus, CompanyRelationshipStatus, ContactRelationshipType, ImportantDateType} from '~/common/enum/enumerations';
import {Address} from '~/db/sql/models/Address';
import {ContactEmail} from '~/db/sql/models/ContactEmail';
import {ContactPhone} from '~/db/sql/models/ContactPhone';
import {ImportantDate} from '~/db/sql/models/ImportantDate';
import {Activity} from '~/db/sql/models/Activity';
import {Opportunity} from '~/db/sql/models/Opportunity';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {isPhoneNumber} from "~/util/strings";
import {DeletedObjectError, ProgrammingError, ReadOnlyError, UncommitedObjectError} from "~/common/errors";
import {generateGuid} from "~/util/db/guid";
import {quickTrace} from "~/util/tracing";
// import {ongdb} from "~/db/graph/ONgDB";
// import {GraphQuery} from "~/db/sql/types/hooks";
import {PrismaPromise} from "@prisma/client";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ContactDefaultData = {
	firstName?: string | null;
	lastName?: string;
	tenet?: Tenet;
	tenetId?: Buffer;
	importantNotes?: string | null;
	notes?: Note[];
	contactTimelineRelationshipType?: ContactTimelineEventJoinType;
	timelineEvents?: ContactTimelineEvent[];
	createdAt?: Date | null;
	updatedAt?: Date | null;
	type?: ContactType;
	status?: ContactStatus;
	lifecycleStage?: LifecycleStage | null;
	addresses?: Address[];
	emails?: ContactEmail[];
	phones?: ContactPhone[];
	importantDates?: ImportantDate[];
	activities?: Activity[];
	lastContactedDate?: Date | null;
	followUpDate?: Date | null;
	household?: Contact | null;
	householdId?: Buffer | null;
	headOfHouseholdFor?: Contact | null;
	householdStatus?: HouseholdRelationshipStatus | null;
	company?: Contact | null;
	companyId?: Buffer | null;
	position?: string | null;
	primaryContactFor?: Contact | null;
	companyStatus?: CompanyRelationshipStatus | null;
	headOfHousehold?: Contact | null;
	headOfHouseholdId?: Buffer | null;
	householdMembers?: Contact[];
	employees?: Contact[];
	industry?: string | null;
	website?: string | null;
	size?: number | null;
	primaryContact?: Contact | null;
	primaryContactId?: Buffer | null;
	deleted?: boolean;
	deletedAt?: Date | null;
	opportunities?: Opportunity[];
	contactRelationType?: string;
	contactRelationEstablished?: Date | null;
	contactRelationNotes?: string | null;
	relationId?: Buffer;
	relationAsSource?: Contact[];
	relationAsTarget?: Contact[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type ContactData = ContactDefaultData & {
    fullName?: string;
}

/* End automatically generated type for `data` field in constructor */

export class Contact extends Model<Contact> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, true)
	@persisted declare public firstName?: string | null;
	
	@ai.property('string', null, false, false)
	@required declare public lastName?: string;
	
	@wrap('tenet', 'contacts', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	
	@ai.property('string', null, false, true)
	@persisted declare public importantNotes?: string | null;
	
	@ai.property('note', null, true, false)
	@wrap('note', 'contact', 'contactId', false, true) declare public notes?: Note[];
	
	@ai.property('contactTimelineEvent', "Events associated with this contact's activities, this is used for a timeline of interactions with the contact", false, false)
	@jointable('contactTimelineEvent', 'contactEventRelation', 'contactId', 'contactEventId', 'contactEventId_contactId', 'contacts')
	declare public timelineEvents?: ContactTimelineEvent[];
	
	@join('type', 'contacts', 'contactTimelineEvent')
	@ai.property('ContactTimelineEventJoinType', "Describes how this contact relates to a contact event.", false, false)
	declare public contactTimelineRelationshipType?: ContactTimelineEventJoinType;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	
	@ai.property('ContactType', "Contact type, either individual, household, or company", false, false)
	@required declare public type?: ContactType;
	
	@ai.property('ContactStatus', null, false, false)
	@required declare public status?: ContactStatus;
	
	@ai.property('LifecycleStage', "Contact's investment lifecycle stage", false, true)
	@persisted declare public lifecycleStage?: LifecycleStage | null;
	
	@ai.property('address', null, true, false)
	@wrap('address', 'contact', 'contactId', false, true) declare public addresses?: Address[];
	
	@ai.property('contactEmail', null, true, false)
	@wrap('contactEmail', 'contact', 'contactId', false, true) declare public emails?: ContactEmail[];
	
	@ai.property('contactPhone', null, true, false)
	@wrap('contactPhone', 'contact', 'contactId', false, true) declare public phones?: ContactPhone[];
	
	@ai.property('importantDate', null, true, false)
	@wrap('importantDate', 'contact', 'contactId', false, true) declare public importantDates?: ImportantDate[];
	
	@ai.property('activity', "Activities that the contact is involved in", false, false)
	@jointable('activity', 'activityRelation', 'contactId', 'activityId', 'activityId_contactId', 'contacts')
	declare public activities?: Activity[];
	
	@persisted declare public lastContactedDate?: Date | null;
	@persisted declare public followUpDate?: Date | null;
	
	@ai.property('contact', null, false, true)
	@wrap('contact', 'householdMembers', 'householdId', true, false) declare public household?: Contact | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public householdId?: Buffer | null;
	
	@wrap('contact', 'headOfHousehold', 'headOfHouseholdId', false, false) declare public headOfHouseholdFor?: Contact | null;
	
	@ai.property('HouseholdRelationshipStatus', null, false, true)
	@persisted declare public householdStatus?: HouseholdRelationshipStatus | null;
	
	@ai.property('contact', null, false, true)
	@wrap('contact', 'employees', 'companyId', true, false) declare public company?: Contact | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public companyId?: Buffer | null;
	
	@ai.property('string', null, false, true)
	@persisted declare public position?: string | null;
	
	@wrap('contact', 'primaryContact', 'primaryContactId', false, false) declare public primaryContactFor?: Contact | null;
	
	@ai.property('CompanyRelationshipStatus', null, false, true)
	@persisted declare public companyStatus?: CompanyRelationshipStatus | null;
	
	@ai.property('contact', "For household-type contacts only, who is the head of the household", false, true)
	@wrap('contact', 'headOfHouseholdFor', 'headOfHouseholdId', true, false) declare public headOfHousehold?: Contact | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public headOfHouseholdId?: Buffer | null;
	
	@ai.property('contact', null, true, false)
	@wrap('contact', 'household', 'householdId', false, true) declare public householdMembers?: Contact[];
	
	@ai.property('contact', "This company's employees", true, false)
	@wrap('contact', 'company', 'companyId', false, true) declare public employees?: Contact[];
	
	@ai.property('string', null, false, true)
	@persisted declare public industry?: string | null;
	
	@ai.property('string', "This company's website", false, true)
	@persisted declare public website?: string | null;
	
	@ai.property('number', "This company's size", false, true)
	@persisted declare public size?: number | null;
	
	@ai.property('contact', "The primary contact for the company", false, true)
	@wrap('contact', 'primaryContactFor', 'primaryContactId', true, false) declare public primaryContact?: Contact | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public primaryContactId?: Buffer | null;
	
	@persisted @Default(false) declare public deleted?: boolean;
	@persisted declare public deletedAt?: Date | null;
	
	@ai.property('opportunity', "Related opportunities", false, false)
	@jointable('opportunity', 'opportunityRelation', 'contactId', 'opportunityId', 'contactId_opportunityId', 'contacts')
	declare public opportunities?: Opportunity[];
	
	@ai.property('contact', "Related contacts where this contact is considered the source of the relationship", false, false)
	@jointable('contact', 'target', 'sourceId', 'targetId', true, 'relationAsTarget')
	declare public relationAsSource?: Contact[];
	
	@join('type', ['relationAsTarget', 'relationAsSource'], 'contact')
	declare public contactRelationType?: string;
	
	@join('established', ['relationAsTarget', 'relationAsSource'], 'contact')
	declare public contactRelationEstablished?: Date | null;
	
	@join('notes', ['relationAsTarget', 'relationAsSource'], 'contact')
	declare public contactRelationNotes?: string | null;
	
	@join('id', ['relationAsTarget', 'relationAsSource'], 'contact')
	declare public relationId?: Buffer;
	
	@ai.property('contact', "Related contacts where this contact is considered the target of the relationship", false, false)
	@jointable('contact', 'source', 'targetId', 'sourceId', true, 'relationAsSource')
	declare public relationAsTarget?: Contact[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    @computed(['firstName', 'lastName', 'type'], (obj, firstName: string, lastName: string) => {
        if (firstName === '' || firstName == null) {
            return lastName;
        }
        return `${firstName} ${lastName}`
    }, (obj, fullName: string) => {
        if (fullName == null) {
            return;
        }
        const contact = obj as Contact;

        if (contact.type == null) {
            return;
        }

        const initialOverride = contact.overrideSetFunctionality;
        contact.overrideSetFunctionality = true;

        if (contact.type === ContactType.INDIVIDUAL) {
            const nameParts = fullName.split(' ');
            const len = nameParts.length;

            if (len == 1) {
                contact.firstName = nameParts[0];
                contact.lastName = '';
            } else {
                contact.firstName = nameParts.slice(0, len - 1).join(' '); // All words up to the last
                contact.lastName = nameParts[len - 1];
            }

            contact._loadedProperties.add('firstName');
            contact._loadedProperties.add('lastName');

            contact._dirty['firstName'] = contact.firstName;
            contact._dirty['lastName'] = contact.lastName;
        } else {
            contact.lastName = fullName;
            contact._loadedProperties.add('lastName');

            contact._dirty['lastName'] = contact.lastName;
        }
        contact.overrideSetFunctionality = initialOverride;
    })
    @ai.property('string', null, false, false)
    declare public fullName?: string;

    @calculated(['emails'], (obj: Model<Contact>, emails: ContactEmail[]) => {
        const primaryEmail = emails.find(email => email.isPrimary);
        if (primaryEmail) {
            return primaryEmail.email;
        } else if (emails.length > 0) {
            return emails[0].email;
        }
        return null;
    }, {cache: true})
    declare public primaryEmail?: string | null; // Primary email address

    @calculated(['phones'], (obj: Model<Contact>, phones: ContactPhone[]) => {
        const primaryPhone = phones.find(phone => phone.isPrimary);
        if (primaryPhone) {
            return primaryPhone.formattedNumber ?? null;
        } else if (phones.length > 0) {
            return phones[0].formattedNumber ?? null;
        }
        return null;
    }, {cache: true})
    declare public primaryPhone?: string | null; // Primary phone number

    @calculated(['addresses'], (obj: Model<Contact>, addresses: Address[]) => {
        const primaryAddress = addresses.find(address => address.primary);
        if (primaryAddress) {
            return primaryAddress;
        } else if (addresses.length > 0) {
            return addresses[0];
        }
        return null;
    }, {cache: true})
    declare public primaryAddress?: Address | null;

    @calculated(['importantDates'], (obj: Model<Contact>, importantDates: ImportantDate[]) => {
        const birthday = importantDates.find(date => date.type === ImportantDateType.BIRTHDAY);
        if (birthday) {
            return birthday.date;
        }
        return null;
    }, {cache: true})
    declare public birthday?: Date | null;

    @calculated(['importantDates'], (obj: Model<Contact>, importantDates: ImportantDate[]) => {
        const anniversary = importantDates.find(date => date.type === ImportantDateType.ANNIVERSARY);
        if (anniversary) {
            return anniversary.date;
        }
        return null;
    }, {cache: true})
    declare public anniversary?: Date | null;

    @calculated(['importantDates'], (obj: Model<Contact>, importantDates: ImportantDate[]) => {
        const retirement = importantDates.find(date => date.type === ImportantDateType.RETIREMENT);
        if (retirement) {
            return retirement.date;
        }
        return null;
    }, {cache: true})
    declare public retirement?: Date | null;

    // @relationship('contact', 'related_to')
    // declare public relatedTo?: ModelSet<Contact>;

    constructor(id?: Buffer | string | Uint8Array, data?: ContactData, type?: ContactType) {
        if (id == null && type == null && data?.type == null) {
            throw new Error('Contact must have either an ID or a type');
        }

        const isNew = id == null;

        if (type == null && data?.type != null) {
            type = data.type;
        }

        if (type != null) {
            if (data == null) {
                data = {};
            }
            data.type = type;
        }

        if (id == null && type != null) {
            id = Contact.generateContactGuid(type);
        } else if (id != null) {
            let _id: Buffer;
            if (Buffer.isBuffer(id)) {
                _id = id;
            } else if (typeof id === 'string') {
                _id = Buffer.from(id, 'hex');
            } else {
                _id = Buffer.from(id)
            }
            const _type = Contact.getType(_id);
            if (_type != type && type != null) {
                throw new Error(`Cannot change contact type from ${_type} to ${type}`);
            }
            type = _type;
        }

        if (type !== ContactType.INDIVIDUAL && data?.lastName != null) {
            data.firstName = null;
        }

        super(id, data, (data != null && 'firstName' in data && 'lastName' in data) ? ['fullName'] : [], isNew);
    }

    static async read<Attrs extends ReadAttributes<Contact>>(options: ReadOptions<Contact, Attrs>): Promise<ModelSet<ReadResult<Contact, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Contact>>(options: ReadUniqueOptions<Contact, Attrs>): Promise<ReadResult<Contact, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Contact>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Contact>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Contact>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Contact, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static searchWhere(tenetId: Buffer | undefined, searchString: string): ReadWhere<Contact> {
        const userWhere: ReadWhere<Contact> = {
            OR: [
                {
                    fullName: {
                        contains: searchString, mode: 'insensitive'
                    }
                },
                {
                    emails: {
                        some: {
                            email: {
                                contains: searchString, mode: 'insensitive'
                            }
                        }
                    }
                },
            ]
        }

        if (isPhoneNumber(searchString)) {
            userWhere.OR!.push({
                phones: {
                    some: {
                        number: {
                            contains: searchString.replaceAll(/[\S.+\-()]/g, ''), mode: 'insensitive'
                        }
                    }
                }
            });
        }

        // Either match the contact by its name, email, or phone number OR match if the name is a member of a household/company
        return {
            AND: [
                {
                    OR: [
                        userWhere,
                        {
                            type: ContactType.HOUSEHOLD,
                            householdMembers: {
                                some: userWhere
                            }
                        },
                        {
                            type: ContactType.COMPANY,
                            employees: {
                                some: userWhere
                            }
                        },
                        {
                            type: ContactType.INDIVIDUAL,
                            OR: [
                                {
                                    company: {
                                        fullName: {
                                            contains: searchString, mode: 'insensitive'
                                        }
                                    }
                                },
                                {
                                    household: {
                                        fullName: {
                                            contains: searchString, mode: 'insensitive'
                                        }
                                    }
                                }
                            ]
                        }
                    ]
                },
                {
                    tenetId
                }
            ]
        };
    }

    static getType(guid: Buffer): ContactType {
        const firstByte = guid.toString('hex').substring(0, 2);
        if (firstByte === '01') {
            return ContactType.INDIVIDUAL;
        } else if (firstByte === '02') {
            return ContactType.HOUSEHOLD;
        } else if (firstByte === '03') {
            return ContactType.COMPANY;
        }
        throw new Error('Invalid contact GUID');
    }

    /**
     * Generates a new random GUID for a contact based on the type.
     * @param type The main body of the GUID is 24 bytes of random data.
     * The first byte identifies the type of contact.
     *
     * Individuals: 0x01
     * Households: 0x02
     * Companies: 0x03
     *
     * @returns The generated GUID
     */
    static generateContactGuid(type?: ContactType) {
        const guid = generateGuid();
        const newBuffer = Buffer.alloc(13);
        switch (type) {
            case ContactType.INDIVIDUAL:
                newBuffer.writeUInt8(0x01, 0);
                break;
            case ContactType.HOUSEHOLD:
                newBuffer.writeUInt8(0x02, 0);
                break;
            case ContactType.COMPANY:
                newBuffer.writeUInt8(0x03, 0);
                break;
        }
        newBuffer.set(guid, 1);
        return newBuffer;
    }

    @on('update', 'before')
    public async preventUpdateType(property: string) {
        return !(property === 'type' && !this.isNew());
    }

    protected prepareDirty() {
        if (this.isNew()) {
            this.relationAsSource ??= [];

            switch (this.type) {
                case ContactType.INDIVIDUAL:
                    if (this.householdId) {
                        this.relationAsSource.push(new Contact(this.householdId, {
                            contactRelationType: ContactRelationshipType.HOUSEHOLD,
                            relationId: this.guid
                        }));

                        const headOfHouseholdId = this.household?.headOfHouseholdId;

                        if (headOfHouseholdId && this.householdStatus != null) {
                            this.relationAsSource.push(new Contact(headOfHouseholdId, {
                                contactRelationType: this.householdStatus,
                                relationId: this.guid
                            }));
                        }
                    }
                    if (this.companyId && this.companyStatus) {
                        this.relationAsSource.push(new Contact(this.companyId, {
                            contactRelationType: this.companyStatus,
                            relationId: this.guid
                        }));
                    }
                    break;

                case ContactType.HOUSEHOLD:
                    if (this.headOfHouseholdId) {
                        this.relationAsSource.push(new Contact(this.headOfHouseholdId, {
                            contactRelationType: ContactRelationshipType.HEAD_OF_HOUSEHOLD,
                            relationId: this.guid
                        }));
                    }
                    if (this.companyId && this.companyStatus) {
                        this.relationAsSource.push(new Contact(this.companyId, {
                            contactRelationType: this.companyStatus,
                            relationId: this.guid
                        }));
                    }
                    break;

                case ContactType.COMPANY:
                    if (this.primaryContactId) {
                        this.relationAsSource.push(new Contact(this.primaryContactId, {
                            contactRelationType: ContactRelationshipType.PRIMARY_CONTACT,
                            relationId: this.guid
                        }));
                    }
                    break
            }
        }
    }

    @on('update', 'after')
    public async update_householdRelationships(property: string, value: HouseholdRelationshipStatus, old: HouseholdRelationshipStatus | null, isBatch: boolean) {
        const client = Model.getPrisma();
        if (property === 'householdStatus' && this.type === ContactType.INDIVIDUAL && this.householdStatus !== HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD) {
            if (isBatch) {
                if (!this.isLoaded('household') && !this.household?.isLoaded('headOfHousehold')) {
                    throw new ProgrammingError('Cannot update household status in batch operation without loading household and head of household');
                }
            } else {
                await this.safeLoad('household');
            }

            if (this.household && this.householdStatus && this.household.headOfHouseholdId) {
                if (old) {
                    return this.batchResult(
                        client.contactRelationship.upsert({
                            where: {
                                sourceId_targetId_type: {
                                    sourceId: this.guid,
                                    targetId: this.household.headOfHouseholdId,
                                    type: old
                                }
                            },
                            update: {
                                type: value
                            },
                            create: {
                                id: generateGuid(),
                                sourceId: this.guid,
                                targetId: this.household.headOfHouseholdId,
                                type: value
                            }
                        })
                    )
                } else {
                    return this.batchResult(
                        client.contactRelationship.upsert({
                            where: {
                                sourceId_targetId_type: {
                                    sourceId: this.guid,
                                    targetId: this.household.headOfHouseholdId,
                                    type: value
                                }
                            },
                            update: {},
                            create: {
                                id: generateGuid(),
                                sourceId: this.guid,
                                targetId: this.household.headOfHouseholdId,
                                type: value
                            }
                        })
                    )
                }
            }
        }
    }

    @on('update', 'after')
    public async update_importantContactData(property: string, value: Buffer | null, old: Buffer | null) {
        if (property === 'headOfHouseholdId' && this.type === ContactType.HOUSEHOLD) {
            const client = Model.getPrisma();
            const promises: PrismaPromise<any>[] = [];
            if (old != null) {
                promises.push(client.contact.update({
                    where: {
                        id: old
                    },
                    data: {
                        householdStatus: null
                    }
                }))
            }
            if (value != null) {
                promises.push(client.contact.update({
                    where: {
                        id: value
                    },
                    data: {
                        householdStatus: HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD,
                        householdId: this.guid
                    }
                }))
            }
            return this.batchResult(promises);
        } else if (property === 'primaryContactId' && this.type === ContactType.COMPANY) {
            const client = Model.getPrisma();
            if (value != null) {
                return this.batchResult(client.contact.update({
                    where: {
                        id: value
                    },
                    data: {
                        companyId: this.guid
                    }
                }))
            }
        }
    }

    @on('create', 'after')
    public async create_importantContactData() {
        if (this.type === ContactType.HOUSEHOLD && this.headOfHouseholdId != null) {
            const client = Model.getPrisma();
            return this.batchResult(client.contact.update({
                where: {
                    id: this.headOfHouseholdId
                },
                data: {
                    householdStatus: HouseholdRelationshipStatus.HEAD_OF_HOUSEHOLD,
                    householdId: this.guid
                }
            }))
        } else if (this.type === ContactType.COMPANY && this.primaryContactId != null) {
            const client = Model.getPrisma();
            return this.batchResult(client.contact.update({
                where: {
                    id: this.primaryContactId
                },
                data: {
                    companyStatus: CompanyRelationshipStatus.OWNS_COMPANY,
                    companyId: this.guid
                }
            }))
        }
    }

    @on('update', 'after')
    public async update_companyRelationships(property: string, value: CompanyRelationshipStatus | Buffer, old: CompanyRelationshipStatus | Buffer, isBatch: boolean) {
        const client = Model.getPrisma();
        if (property === 'companyStatus' && this.type !== ContactType.COMPANY) {
            if (isBatch) {
                if (!this.isLoaded('companyId')) {
                    throw new ProgrammingError('Cannot update company status in batch operation without loading company id');
                }
            } else {
                await this.safeLoad('companyId');
            }

            let companyId = this.companyId;
            if (this.isDirty('companyId')) {
                companyId = this.getOld('companyId');
            }

            if (this.companyId && value) {
                if (companyId == null) {
                    if (old == null) {
                        return this.batchResult(
                            client.contactRelationship.upsert({
                                where: {
                                    sourceId_targetId_type: {
                                        sourceId: this.guid,
                                        targetId: this.companyId,
                                        type: value as CompanyRelationshipStatus
                                    }
                                },
                                update: {},
                                create: {
                                    id: generateGuid(),
                                    sourceId: this.guid,
                                    targetId: this.companyId,
                                    type: value as CompanyRelationshipStatus
                                }
                            })
                        )
                    } else {
                        return this.batchResult(
                            client.contactRelationship.upsert({
                                where: {
                                    sourceId_targetId_type: {
                                        sourceId: this.guid,
                                        targetId: this.companyId,
                                        type: old as CompanyRelationshipStatus
                                    }
                                },
                                create: {
                                    id: generateGuid(),
                                    sourceId: this.guid,
                                    targetId: this.companyId,
                                    type: value as CompanyRelationshipStatus
                                },
                                update: {
                                    type: value as CompanyRelationshipStatus,
                                },
                            })
                        )
                    }
                } else if (companyId) {
                    return this.batchResult(
                        client.contactRelationship.upsert({
                            where: {
                                sourceId_targetId_type: {
                                    sourceId: this.guid,
                                    targetId: companyId,
                                    type: value as CompanyRelationshipStatus
                                }
                            },
                            update: {},
                            create: {
                                id: generateGuid(),
                                sourceId: this.guid,
                                targetId: companyId,
                                type: value as CompanyRelationshipStatus
                            }
                        })
                    )
                }
            }
        } else if (property === 'companyId') {
            if (isBatch) {
                if (!this.isLoaded('companyStatus')) {
                    throw new ProgrammingError('Cannot update company in batch operation without loading company status');
                }
            } else {
                await this.safeLoad('companyStatus');
            }

            let status: CompanyRelationshipStatus | undefined = undefined;
            if (this.companyStatus) {
                status = this.companyStatus;
            } else if (this._old['companyStatus']) {
                status = this._old['companyStatus'];
            } else {
                console.warn('Company status is not set so we can\'t update the relationship');
            }

            if (status != null) {
                if (value == null && old != null) {
                    return this.batchResult(
                        client.contactRelationship.delete({
                            where: {
                                sourceId_targetId_type: {
                                    sourceId: this.guid,
                                    targetId: old as Buffer,
                                    type: status
                                }
                            }
                        })
                    )
                } else if (!this.isDirty('companyStatus')) {
                    if (old != null) {
                        // If the company status is dirty, that portion of code will handle the update
                        return this.batchResult(
                            client.contactRelationship.upsert({
                                where: {
                                    sourceId_targetId_type: {
                                        sourceId: this.guid,
                                        targetId: old as Buffer,
                                        type: status
                                    }
                                },
                                create: {
                                    id: generateGuid(),
                                    sourceId: this.guid,
                                    targetId: value as Buffer,
                                    type: status
                                },
                                update: {
                                    targetId: value as Buffer,
                                }
                            })
                        )
                    } else {
                        if (value) {
                            // If the company status is dirty, that portion of code will handle the update
                            return this.batchResult(
                                client.contactRelationship.upsert({
                                    where: {
                                        sourceId_targetId_type: {
                                            targetId: value as Buffer,
                                            sourceId: this.guid,
                                            type: status
                                        }
                                    },
                                    update: {},
                                    create: {
                                        id: generateGuid(),
                                        targetId: value as Buffer,
                                        sourceId: this.guid,
                                        type: status
                                    },
                                })
                            )
                        }
                    }
                }
            }
        }
    }

    @on('update', 'after')
    public async update_headOfHousehold(property: string, value: Buffer | null, old: Buffer | null) {
        const client = Model.getPrisma();
        if (property === 'headOfHouseholdId' && this.type === ContactType.HOUSEHOLD) {
            return this.batchResult(
                client.contactRelationship.upsert({
                    where: {
                        sourceId_targetId_type: {
                            sourceId: this.guid,
                            targetId: old as Buffer ?? Buffer.from('this definitely does not exist'),
                            type: ContactRelationshipType.HEAD_OF_HOUSEHOLD
                        }
                    },
                    create: {
                        id: generateGuid(),
                        sourceId: this.guid,
                        targetId: value as Buffer,
                        type: ContactRelationshipType.HEAD_OF_HOUSEHOLD
                    },
                    update: {
                        targetId: value as Buffer
                    }
                })
            )
        }
    }

    @on('update', 'after')
    public async update_primaryContact(property: string, value: Buffer | null, old: Buffer | null) {
        const client = Model.getPrisma();
        if (property === 'primaryContactId' && this.type === ContactType.COMPANY) {
            return this.batchResult(
                client.contactRelationship.upsert({
                    where: {
                        sourceId_targetId_type: {
                            sourceId: this.guid,
                            targetId: old as Buffer ?? Buffer.from('this definitely does not exist'),
                            type: ContactRelationshipType.PRIMARY_CONTACT
                        }
                    },
                    create: {
                        id: generateGuid(),
                        sourceId: this.guid,
                        targetId: value as Buffer,
                        type: ContactRelationshipType.PRIMARY_CONTACT
                    },
                    update: {
                        targetId: value as Buffer
                    }
                })
            )
        }
    }

    @on('update', 'after')
    public async update_household(property: string, value: Buffer | null, old: Buffer | null) {
        const client = Model.getPrisma();
        if (property === 'householdId' && this.type === ContactType.INDIVIDUAL) {
            return this.batchResult(
                client.contactRelationship.upsert({
                    where: {
                        sourceId_targetId_type: {
                            sourceId: this.guid,
                            targetId: old as Buffer ?? Buffer.from('this definitely does not exist'),
                            type: ContactRelationshipType.HOUSEHOLD
                        }
                    },
                    create: {
                        id: generateGuid(),
                        sourceId: this.guid,
                        targetId: value as Buffer,
                        type: ContactRelationshipType.HOUSEHOLD
                    },
                    update: {
                        targetId: value as Buffer
                    }
                })
            )
        }
    }

    static async search<Attrs extends ReadAttributes<Contact>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer, sortBy?: ReadOrder<Contact>): Promise<SearchResult<Contact, Attrs>> {
        if (tenetId == null) {
            throw new Error('Tenet ID is required to search contacts');
        }

        return await quickTrace(`${this.className()}#search`, async () => {
            const fullWhere = Contact.searchWhere(tenetId, searchString);

            // Search by contact name, email, and office name
            return Promise.all([Contact.read({
                where: fullWhere,
                orderBy: sortBy ?? {
                    firstName: 'asc',
                    lastName: 'asc'
                },
                select,
                limit: count,
                offset
            }), Contact.count(fullWhere)])
        })
    }

    async addContactRelationship(relationship: ContactRelationshipType, contact: Contact) {
        if (this.isDeleted()) {
            throw new DeletedObjectError('Attempted to modify deleted object')
        }
        if (this.isNew()) {
            throw new UncommitedObjectError('Attempted to add relationship to an uncommitted object')
        }
        if (this.isReadOnly()) {
            throw new ReadOnlyError('Attempted to add relationship to a readonly object')
        }

        const client = Model.getPrisma();

        await client.contactRelationship.upsert({
            where: {
                sourceId_targetId_type: {
                    sourceId: this.guid,
                    targetId: contact.guid,
                    type: relationship
                }
            },
            update: {},
            create: {
                id: generateGuid(),
                sourceId: this.guid,
                targetId: contact.guid,
                type: relationship
            }
        })
    }

    @on('read', 'after')
    public static onAIRead(properties: ModelQueryable<Contact>[], obj: Contact, aiRead: boolean) {
        if (properties.includes('phones') && obj.phones != null) {
            obj.phones.forEach((phone) => ContactPhone.onAIRead(['number'], phone, aiRead));
        }
    }

    @on('delete', 'after')
    public async handleDelete() {
        // Delete notes, and delete activities/opportunities that would otherwise be orphaned
        // If the activity/opportunity is NOT orphaned, remove the contact from it.
        const client = Model.getPrisma();

        return this.batchResult([
            client.note.updateMany({
                where: {
                    contactId: this.guid
                },
                data: {
                    deleted: true,
                    deletedAt: new Date()
                }
            }),
            client.activity.updateMany({
                where: {
                    contacts: {
                        every: {
                            contactId: this.guid
                        }
                    }
                },
                data: {
                    deleted: true,
                    deletedAt: new Date()
                }
            }),
            client.opportunity.updateMany({
                where: {
                    contacts: {
                        every: {
                            contactId: this.guid
                        }
                    }
                },
                data: {
                    deleted: true,
                    deletedAt: new Date()
                }
            }),
            client.activityContactJoin.deleteMany({
                where: {
                    contactId: this.guid
                }
            }),
            client.contactOpportunityJoin.deleteMany({
                where: {
                    contactId: this.guid
                }
            }),
        ])
    }

    static className = (): ModelKeys => 'contact';
}

models.contact = Contact;