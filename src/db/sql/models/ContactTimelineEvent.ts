/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult, ReadSubResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {persisted, wrap, jointable, join, required, on} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {Activity} from '~/db/sql/models/Activity';
import {ActivityWaypoint} from '~/db/sql/models/ActivityWaypoint';
import {Opportunity} from '~/db/sql/models/Opportunity';
import {Note} from '~/db/sql/models/Note';
import {Contact} from '~/db/sql/models/Contact';
import {ContactTimelineEventJoinType, ContactTimelineEventType, ContactRelationshipType, ContactTimelineEventTypeNameMapping} from '~/common/enum/enumerations';
import {User} from '~/db/sql/models/User';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {FeedItem} from "~/app/(authenticated)/contacts/[guid]/components/Feed";
import {ProgrammingError} from "~/common/errors";
import {isEmptyString} from "~/util/strings";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ContactTimelineEventDefaultData = {
	activityId?: Buffer | null;
	activity?: Activity | null;
	waypoint?: ActivityWaypoint | null;
	waypointId?: Buffer | null;
	opportunity?: Opportunity | null;
	opportunityId?: Buffer | null;
	noteId?: Buffer | null;
	note?: Note | null;
	extraInfo?: string | null;
	contactTimelineRelationshipType?: ContactTimelineEventJoinType;
	contacts?: Contact[];
	userId?: Buffer;
	user?: User;
	tenetId?: Buffer;
	tenet?: Tenet;
	eventType?: ContactTimelineEventType;
	relationshipType?: string | null;
	createdAt?: Date | null;
	updatedAt?: Date | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* Automatically generated type for `data` field in constructor. Can be modified */
type ContactTimelineEventData = ContactTimelineEventDefaultData & {
    contactTimelineRelationshipType?: ContactTimelineEventJoinType;
};
/* End automatically generated type for `data` field in constructor */

export const TimelineSelect: ReadAttributes<ContactTimelineEvent> = {
    id: true,
    extraInfo: true,
    eventType: true,
    relationshipType: true,
    createdAt: true,
    contacts: {
        select: {
            id: true,
            fullName: true,
            contactTimelineRelationshipType: true,
            type: true,
            deleted: true,
        },
        where: {
            deleted: undefined
        }
    },
    activity: {
        select: {
            id: true,
            title: true,
            description: true,
            startDate: true,
            endDate: true,
            type: true,
            deleted: true,
            users: {
                select: {
                    id: true,
                    fullName: true
                },
            },
        },
    },
    waypoint: {
        select: {
            title: true,
        },
    },
    note: {
        select: {
            content: true,
            noteType: true,
        },
    },
    user: {
        select: {
            id: true,
            fullName: true
        },
    },
    opportunity: {
        select: {
            title: true,
            value: true,
            probability: true,
            status: true,
            expectedCloseDate: true,
            actualCloseDate: true,
            deleted: true,
            teamMembers: {
                select: {
                    fullName: true
                }
            },
            description: true,
        }
    },
}

export function toFeedItem(event: ReadResult<ContactTimelineEvent, typeof TimelineSelect> | ReadSubResult<ContactTimelineEvent, {
    select: typeof TimelineSelect
}>): FeedItem {
    return {
        guid: event.guid.toString('hex'),
        type: event.eventType,
        extraInfo: event.extraInfo ?? undefined,
        user: event.user.fullName,
        eventAt: event.createdAt,
        activity: event.activity ? {
            guid: event.activity.guid.toString('hex'),
            title: event.activity.title,
            description: event.activity.description ?? undefined,
            start: event.activity.startDate,
            end: event.activity.endDate,
            type: event.activity.type,
            assigned: event.activity.users.map(user => user.fullName!),
            deleted: event.activity.deleted,
        } : undefined,
        contacts: event.contacts.map(contact => ({
            name: contact.fullName,
            href: `/contacts/${contact.guid.toString('hex')}`,
            type: contact.contactTimelineRelationshipType,
            contactType: contact.type,
            deleted: contact.deleted,
        })),
        note: event.note ? {
            content: event.note.content,
            guid: event.note.guid.toString('hex'),
            noteType: event.note.noteType,
        } : undefined,
        relationshipType: event.relationshipType as ContactRelationshipType ?? undefined,
        opportunity: event.opportunity ? {
            guid: event.opportunity.guid.toString('hex'),
            title: event.opportunity.title,
            value: event.opportunity.value,
            probability: event.opportunity.probability,
            status: event.opportunity.status,
            expectedCloseDate: event.opportunity.expectedCloseDate,
            actualCloseDate: event.opportunity.actualCloseDate,
            deleted: event.opportunity.deleted,
            assigned: event.opportunity.teamMembers!.map(user => user.fullName!),
            description: event.opportunity.description,
        } : undefined,
        waypoint: event.waypoint ? {
            title: event.waypoint.title,
        } : undefined
    }
}

export class ContactTimelineEvent extends Model<ContactTimelineEvent> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('id', null, false, true)
	@persisted declare public activityId?: Buffer | null;
	
	@ai.property('activity', "If associated with an activity, the activity this event is associated with", false, true)
	@wrap('activity', 'events', 'activityId', true, false) declare public activity?: Activity | null;
	
	@ai.property('activityWaypoint', "If the activity is associated with an waypoint, the waypoint this event is associated with", false, true)
	@wrap('activityWaypoint', 'events', 'waypointId', true, false) declare public waypoint?: ActivityWaypoint | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public waypointId?: Buffer | null;
	
	@ai.property('opportunity', "If associated with an opportunity, the opportunity this event is associated with", false, true)
	@wrap('opportunity', 'events', 'opportunityId', true, false) declare public opportunity?: Opportunity | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public opportunityId?: Buffer | null;
	
	@ai.property('id', "If associated with a note, the note this event is associated with", false, true)
	@persisted declare public noteId?: Buffer | null;
	
	@ai.property('note', "If associated with a note, the note this event is associated with", false, true)
	@wrap('note', 'events', 'noteId', true, false) declare public note?: Note | null;
	
	@ai.property('string', "Info about the event, like what was updated", false, true)
	@persisted declare public extraInfo?: string | null;
	
	@ai.property('contact', "The associated contacts", false, false)
	@jointable('contact', 'contactRelation', 'contactEventId', 'contactId', 'contactEventId_contactId', 'timelineEvents')
	declare public contacts?: Contact[];
	
	@join('type', 'timelineEvents', 'contact')
	@ai.property('ContactTimelineEventJoinType', "Describes how this contact relates to a contact event.", false, false)
	declare public contactTimelineRelationshipType?: ContactTimelineEventJoinType;
	
	@ai.property('id', null, false, false)
	@required declare public userId?: Buffer;
	
	@ai.property('user', "The user who caused this event", false, false)
	@wrap('user', 'events', 'userId', true, false) declare public user?: User;
	
	@required declare public tenetId?: Buffer;
	@wrap('tenet', 'contactTimelineEvents', 'tenetId', true, false) declare public tenet?: Tenet;
	
	@ai.property('ContactTimelineEventType', null, false, false)
	@required declare public eventType?: ContactTimelineEventType;
	
	@ai.property('string', "If the event is a relationship, the name of the relationship", false, true)
	@persisted declare public relationshipType?: string | null;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: ContactTimelineEventData) {
        super(id, data);
    }

    static async read<Attrs extends ReadAttributes<ContactTimelineEvent>>(options: ReadOptions<ContactTimelineEvent, Attrs>): Promise<ModelSet<ReadResult<ContactTimelineEvent, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<ContactTimelineEvent>>(options: ReadUniqueOptions<ContactTimelineEvent, Attrs>): Promise<ReadResult<ContactTimelineEvent, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<ContactTimelineEvent>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<ContactTimelineEvent>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<ContactTimelineEvent>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ContactTimelineEvent, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<ContactTimelineEvent>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ContactTimelineEvent, Attrs>> {
        const where: ReadWhere<ContactTimelineEvent> = {
            OR: [
                {
                    extraInfo: {
                        contains: searchString, mode: 'insensitive'
                    }
                },
                {
                    activity: {
                        title: {
                            contains: searchString, mode: 'insensitive'
                        }
                    }
                },
                {
                    contacts: {
                        some: {
                            fullName: {
                                contains: searchString, mode: 'insensitive'
                            }
                        }
                    }
                },
                {
                    user: {
                        fullName: {
                            contains: searchString, mode: 'insensitive'
                        }
                    }
                }
            ],
            tenetId
        };

        return await Promise.all([ContactTimelineEvent.read({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            select,
            limit: count,
            offset
        }), ContactTimelineEvent.count(where)])
    }

    async validate(): Promise<{ msg: string; result: boolean }> {
        if (this.isNew()) {
            if ((this.contacts == null || this.contacts?.length === 0) && this.activityId == null && this.waypointId == null && this.opportunityId == null) {
                return {
                    result: false,
                    msg: '{0} must have at least one contact. This is a developer error, please contact the site administrator.'
                }
            }

            if (this.contacts == null) {
                this.contacts = [];
            }

            switch (this.eventType) {
                case ContactTimelineEventType.RELATIONSHIP_ADDED:
                case ContactTimelineEventType.RELATIONSHIP_REMOVED:
                    if (isEmptyString(this.relationshipType)) {
                        return {
                            result: false,
                            msg: '{0} must have a relationship type. This is a developer error, please contact the site administrator.'
                        }
                    }

                    const from = this.contacts.find(contact => contact.contactTimelineRelationshipType === ContactTimelineEventJoinType.RELATIONSHIP_FROM);
                    const to = this.contacts.find(contact => contact.contactTimelineRelationshipType === ContactTimelineEventJoinType.RELATIONSHIP_TO);
                    if (from == null || to == null) {
                        return {
                            result: false,
                            msg: '{0} must have a relationship from and to contact. This is a developer error, please contact the site administrator.'
                        }
                    }
                    break;

                case ContactTimelineEventType.ACTIVITY_REMOVED:
                case ContactTimelineEventType.ACTIVITY_CREATED:
                case ContactTimelineEventType.ACTIVITY_COMPLETED:
                case ContactTimelineEventType.ACTIVITY_CANCELLED:
                case ContactTimelineEventType.ACTIVITY_FAILED:
                case ContactTimelineEventType.ACTIVITY_STATUS_CHANGED:
                case ContactTimelineEventType.ACTIVITY_STEP_CHANGED:
                case ContactTimelineEventType.ACTIVITY_ADDED_TO:
                case ContactTimelineEventType.ACTIVITY_REMOVED_FROM:
                    if (this.activityId == null && this.activity == null) {
                        return {
                            result: false,
                            msg: '{0} must have an activity. This is a developer error, please contact the site administrator.'
                        }
                    }
                    break;

                case ContactTimelineEventType.WAYPOINT_CREATED:
                    if ((this.activityId == null && this.activity == null) || (this.waypointId == null && this.waypoint == null)) {
                        if (this.activityId == null && this.activity == null) {
                            return {
                                result: false,
                                msg: '{0} must have an activity. This is a developer error, please contact the site administrator.'
                            }
                        }

                        return {
                            result: false,
                            msg: '{0} must have a waypoint. This is a developer error, please contact the site administrator.'
                        }
                    }
                    break;

                case ContactTimelineEventType.MEMBER_ADDED:
                case ContactTimelineEventType.MEMBER_REMOVED:
                    const parent = this.contacts.find(contact => contact.contactTimelineRelationshipType === ContactTimelineEventJoinType.MEMBER_PARENT);
                    const child = this.contacts.find(contact => contact.contactTimelineRelationshipType === ContactTimelineEventJoinType.MEMBER_CONTACT);
                    if (parent == null || child == null) {
                        return {
                            result: false,
                            msg: `{0} must have a parent${parent ? ` (Specified)` : ` (Unspecified)`} and child${child ? ` (Specified)` : ` (Unspecified)`} contact. This is a developer error, please contact the site administrator.`
                        }
                    }
                    break;

                case ContactTimelineEventType.OPPORTUNITY_CREATED:
                case ContactTimelineEventType.OPPORTUNITY_REMOVED:
                case ContactTimelineEventType.OPPORTUNITY_WON:
                case ContactTimelineEventType.OPPORTUNITY_LOST:
                case ContactTimelineEventType.OPPORTUNITY_CANCELLED:
                case ContactTimelineEventType.OPPORTUNITY_STATUS_CHANGED:
                    if (this.opportunityId == null && this.opportunity == null) {
                        return {
                            result: false,
                            msg: '{0} must have an opportunity. This is a developer error, please contact the site administrator.'
                        }
                    }
                    break;

                case ContactTimelineEventType.EMAIL_SENT:
                case ContactTimelineEventType.EMAIL_RECEIVED:
                    // TODO: Implement
                    break;

                case ContactTimelineEventType.NOTE:
                    if (this.note == null && this.noteId == null) {
                        return {
                            result: false,
                            msg: '{0} must have a note. This is a developer error, please contact the site administrator.'
                        }
                    }
                    break;


                case ContactTimelineEventType.CONTACT_CREATED:
                case ContactTimelineEventType.CONTACT_REMOVED:
                    const contact = this.contacts[0];
                    if (contact == null) {
                        return {
                            result: false,
                            msg: '{0} must have a contact. This is a developer error, please contact the site administrator.'
                        }
                    }
                    break;

                default:
                    return {
                        result: false,
                        msg: `Invalid {0}, ${ContactTimelineEventTypeNameMapping[this.eventType!]} is an unvalidated event type. This is a developer error, please contact the site administrator.`
                    }

            }
        }

        const result = await super.validate();
        if (!result.result) {
            return {
                result: false,
                msg: result.msg + ' This is a developer error, please contact the site administrator.'
            }
        }
        return result;
    }

    @on('update', 'before')
    async onUpdate() {
        return false; // Prevent updating the event
    }

    @on('create', 'before')
    async onCreate() {
        if (this.contacts == null) {
            return;
        }

        if (this.activity != null && this.activity.parentWaypointId != null && this.eventType !== ContactTimelineEventType.ACTIVITY_CREATED) {
            if (!this.activity.isLoaded('parentWaypointId') && !this.activity.isNew()) {
                console.warn('It\'s highly recommended to create events with an associated activity that has a loaded waypoint id so that the event can be associated with the activity\'s waypoint if need be.')
                return;
            }

            this.waypointId = this.activity.parentWaypointId;
        } else if (this.activityId != null && this.activity == null && this.waypointId == null) {
            console.warn('It\'s highly recommended to create events with an associated activity object and not just the id so that the event can be associated with the activity\'s waypoint if need be.')
        }
    }

    private getContactTimelineRelationshipType(contact: Contact): ContactTimelineEventJoinType {
        switch (this.eventType) {
            case ContactTimelineEventType.NOTE:
                return ContactTimelineEventJoinType.CONTACT_TARGET;

            case ContactTimelineEventType.RELATIONSHIP_ADDED:
            case ContactTimelineEventType.RELATIONSHIP_REMOVED:
                if (contact.contactTimelineRelationshipType != null) {
                    if (contact.contactTimelineRelationshipType !== ContactTimelineEventJoinType.RELATIONSHIP_FROM
                        && contact.contactTimelineRelationshipType !== ContactTimelineEventJoinType.RELATIONSHIP_TO) {
                        throw new ProgrammingError(`Invalid timeline relationship type ${contact.contactTimelineRelationshipType} for ${contact.fullName}. Please specify the relationship type as RELATIONSHIP_FROM or RELATIONSHIP_TO explicitly.`);
                    }
                    return contact.contactTimelineRelationshipType;
                }
                throw new ProgrammingError(`Ambiguous timeline relationship type for ${contact.fullName}. Please specify the relationship type as RELATIONSHIP_FROM or RELATIONSHIP_TO explicitly.`);

            case ContactTimelineEventType.ACTIVITY_REMOVED:
            case ContactTimelineEventType.ACTIVITY_CREATED:
            case ContactTimelineEventType.ACTIVITY_COMPLETED:
            case ContactTimelineEventType.ACTIVITY_FAILED:
            case ContactTimelineEventType.ACTIVITY_CANCELLED:
            case ContactTimelineEventType.ACTIVITY_STATUS_CHANGED:
            case ContactTimelineEventType.ACTIVITY_STEP_CHANGED:
            case ContactTimelineEventType.WAYPOINT_CREATED:
                return ContactTimelineEventJoinType.ACTIVITY_CONTACT;

            case ContactTimelineEventType.MEMBER_ADDED:
            case ContactTimelineEventType.MEMBER_REMOVED:
                if (contact.contactTimelineRelationshipType != null) {
                    if (contact.contactTimelineRelationshipType !== ContactTimelineEventJoinType.MEMBER_PARENT
                        && contact.contactTimelineRelationshipType !== ContactTimelineEventJoinType.MEMBER_CONTACT) {
                        throw new ProgrammingError(`Invalid timeline relationship type ${contact.contactTimelineRelationshipType} for ${contact.fullName}. Please specify the relationship type as MEMBER_PARENT or MEMBER_CONTACT explicitly.`);
                    }
                    return contact.contactTimelineRelationshipType;
                }
                throw new ProgrammingError(`Ambiguous timeline relationship type for ${contact.fullName}. Please specify the relationship type as MEMBER_PARENT or MEMBER_CONTACT explicitly.`);


            case ContactTimelineEventType.OPPORTUNITY_CREATED:
            case ContactTimelineEventType.OPPORTUNITY_REMOVED:
                return ContactTimelineEventJoinType.OPPORTUNITY_CONTACT;

            case ContactTimelineEventType.EMAIL_SENT:
            case ContactTimelineEventType.EMAIL_RECEIVED:
                return ContactTimelineEventJoinType.CONTACT_TARGET;

            case ContactTimelineEventType.CONTACT_CREATED:
            case ContactTimelineEventType.CONTACT_REMOVED:
                return ContactTimelineEventJoinType.CONTACT_TARGET;
        }


        throw new ProgrammingError(`Unhandled timeline relationship type ${this.eventType}.`);
    }

    protected prepareDirty() {
        if (this.contacts == null) {
            return;
        }
        this.contacts = this.contacts.map(contact => {
            if (contact.isNew()) {
                contact.contactTimelineRelationshipType = this.getContactTimelineRelationshipType(contact);
                return contact;
            } else {
                return new Contact(contact.guid, {
                    contactTimelineRelationshipType: this.getContactTimelineRelationshipType(contact)
                })
            }
        })
    }

    static className = (): ModelKeys => 'contactTimelineEvent';
}

models.contactTimelineEvent = ContactTimelineEvent;
        