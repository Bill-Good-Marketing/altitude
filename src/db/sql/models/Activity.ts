/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models, dbClient} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, persisted, Default, jointable, on} from '~/db/sql/decorators';
import ai, {AIContext} from '~/ai/AI';
import {ActivityType, TaskScheduleType, ActivityPriority, ActivityStatus, ContactTimelineEventType, ContactTimelineEventJoinType, ActivityTypeNameMapping} from '~/common/enum/enumerations';
import {ActivityStep} from '~/db/sql/models/ActivityStep';
import {ActivityWaypoint} from '~/db/sql/models/ActivityWaypoint';
import {ActivityTemplate} from '~/db/sql/models/ActivityTemplate';
import {User} from '~/db/sql/models/User';
import {Contact} from '~/db/sql/models/Contact';
import {Tenet} from '~/db/sql/models/Tenet';
import {Attachment} from '~/db/sql/models/Attachment';
import {Note} from '~/db/sql/models/Note';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {Opportunity} from '~/db/sql/models/Opportunity';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";
import {generateGuid} from "~/util/db/guid";
import {areDatesEqual, dateGreater} from '~/util/time/date';
import {differenceInDays} from "date-fns";
import {englishList} from "~/util/strings";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityDefaultData = {
	title?: string;
	type?: ActivityType;
	steps?: ActivityStep[];
	waypoints?: ActivityWaypoint[];
	activities?: Activity[];
	parentActivity?: Activity | null;
	parentActivityId?: Buffer | null;
	parentWaypoint?: ActivityWaypoint | null;
	parentWaypointId?: Buffer | null;
	template?: ActivityTemplate | null;
	templateId?: Buffer | null;
	taskScheduleType?: TaskScheduleType | null;
	startDate?: Date;
	endDate?: Date;
	completedAt?: Date | null;
	description?: string | null;
	priority?: ActivityPriority;
	status?: ActivityStatus;
	assignedBy?: User;
	assignedById?: Buffer;
	phoneNumber?: string | null;
	location?: string | null;
	holdReason?: string | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	contacts?: Contact[];
	users?: User[];
	tenet?: Tenet;
	tenetId?: Buffer;
	attachments?: Attachment[];
	notes?: Note[];
	events?: ContactTimelineEvent[];
	deleted?: boolean;
	deletedAt?: Date | null;
	order?: number | null;
	opportunity?: Opportunity | null;
	opportunityId?: Buffer | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */


/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityData = ActivityDefaultData & {}
/* End automatically generated type for `data` field in constructor */

// NOTE TO SELF: If I ever add create hooks to activities, I will need to add them in Contacts.addActivity as well.
export class Activity extends Model<Activity> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public title?: string;
	
	@ai.property('ActivityType', "Activity type, either task or schedule item", false, false)
	@required declare public type?: ActivityType;
	
	@ai.property('activityStep', "Steps required to complete this activity", true, false)
	@wrap('activityStep', 'activity', 'activityId', false, true) declare public steps?: ActivityStep[];
	
	@ai.property('activityWaypoint', "Waypoints required to complete this activity if it's a path", true, false)
	@wrap('activityWaypoint', 'activity', 'activityId', false, true) declare public waypoints?: ActivityWaypoint[];
	
	@ai.property('activity', "Child activities of this activity, if it's a waypoints or path", true, false)
	@wrap('activity', 'parentActivity', 'parentActivityId', false, true) declare public activities?: Activity[];
	
	@ai.property('activity', "Parent activity of this activity", false, true)
	@wrap('activity', 'activities', 'parentActivityId', true, false) declare public parentActivity?: Activity | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public parentActivityId?: Buffer | null;
	
	@ai.property('activityWaypoint', "Parent waypoint of this activity", false, true)
	@wrap('activityWaypoint', 'childActivities', 'parentWaypointId', true, false) declare public parentWaypoint?: ActivityWaypoint | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public parentWaypointId?: Buffer | null;
	
	@wrap('activityTemplate', 'activities', 'templateId', true, false) declare public template?: ActivityTemplate | null;
	@persisted declare public templateId?: Buffer | null;
	
	@ai.property('TaskScheduleType', "Task/Schedule item subtype. Not applicable to notes", false, true)
	@persisted declare public taskScheduleType?: TaskScheduleType | null;
	
	@ai.property('date', null, false, false)
	@required declare public startDate?: Date;
	
	@ai.property('date', "The due date for this activity, for task/schedule items only", false, false)
	@required declare public endDate?: Date;
	
	@ai.property('date', null, false, true)
	@persisted declare public completedAt?: Date | null;
	
	@ai.property('string', null, false, true)
	@persisted declare public description?: string | null;
	
	@ai.property('ActivityPriority', null, false, false)
	@persisted @Default(ActivityPriority.MEDIUM) declare public priority?: ActivityPriority;
	
	@ai.property('ActivityStatus', null, false, false)
	@required declare public status?: ActivityStatus;
	
	@wrap('user', 'assignedActivities', 'assignedById', true, false) declare public assignedBy?: User;
	@required declare public assignedById?: Buffer;
	
	@ai.property('string', null, false, true)
	@persisted declare public phoneNumber?: string | null;
	
	@ai.property('string', null, false, true)
	@persisted declare public location?: string | null;
	
	@ai.property('string', "For schedule items only of type/subtype hold", false, true)
	@persisted declare public holdReason?: string | null;
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	
	@ai.property('contact', null, false, false)
	@jointable('contact', 'contactRelation', 'activityId', 'contactId', 'activityId_contactId', 'activities')
	declare public contacts?: Contact[];
	
	@ai.property('user', null, false, false)
	@jointable('user', 'userRelation', 'activityId', 'userId', 'activityId_userId', 'activities')
	declare public users?: User[];
	
	@wrap('tenet', 'activities', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	@wrap('attachment', 'activity', 'activityId', false, true) declare public attachments?: Attachment[];
	
	@ai.property('note', null, true, false)
	@wrap('note', 'activity', 'activityId', false, true) declare public notes?: Note[];
	
	@ai.property('contactTimelineEvent', "Timeline of interactions with this activity", true, false)
	@wrap('contactTimelineEvent', 'activity', 'activityId', false, true) declare public events?: ContactTimelineEvent[];
	
	@persisted @Default(false) declare public deleted?: boolean;
	@persisted declare public deletedAt?: Date | null;
	
	@ai.property('number', "Order within the waypoint-type activitiy or individual path waypoint", false, true)
	@persisted declare public order?: number | null;
	
	@ai.property('opportunity', "Associated opportunity", false, true)
	@wrap('opportunity', 'activities', 'opportunityId', true, false) declare public opportunity?: Opportunity | null;
	
	@ai.property('id', null, false, true)
	@persisted declare public opportunityId?: Buffer | null;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */

    constructor(id?: Buffer | string | Uint8Array, data?: ActivityData) {
        if (id == null && data?.type == null) {
            throw new Error('Activity must have either an ID or a type');
        }

        const isNew = id == null;

        if (id == null && data?.type != null) {
            id = Activity.generateActivityGuid(data?.type);
        } else if (id != null) {
            let _id = null as Buffer | null;
            if (Buffer.isBuffer(id)) {
                _id = id;
            } else if (typeof id === 'string') {
                _id = Buffer.from(id, 'hex');
            } else {
                _id = Buffer.from(id)
            }
            const _type = Activity.getType(_id);
            if (_type != data?.type && data?.type != null) {
                throw new Error(`Cannot change activity type from ${_type} to ${data?.type}`);
            }
            if (data == null) {
                data = {};
            }
            data.type = _type;
        }

        super(id, data, [], isNew);

        if (this.isNew()) {
            if (this.status == null) {
                if (this.type !== ActivityType.SCHEDULED) {
                    this.status = ActivityStatus.NOT_STARTED;
                } else {
                    this.status = ActivityStatus.SCHEDULED;
                }
            }
        }
    }

    static getType(guid: Buffer): ActivityType {
        const firstByte = guid.toString('hex').substring(0, 2);
        switch (firstByte) {
            case '01':
                return ActivityType.PATH;
            case '02':
                return ActivityType.WAYPOINT;
            case '03':
                return ActivityType.TASK;
            case '04':
                return ActivityType.SCHEDULED;
        }
        return ActivityType.PATH;
    }

    static generateActivityGuid(type: ActivityType) {
        const guid = generateGuid();
        const newBuffer = Buffer.alloc(13);
        switch (type) {
            case ActivityType.PATH:
                newBuffer.writeUInt8(0x01, 0);
                break;
            case ActivityType.WAYPOINT:
                newBuffer.writeUInt8(0x02, 0);
                break;
            case ActivityType.TASK:
                newBuffer.writeUInt8(0x03, 0);
                break;
            case ActivityType.SCHEDULED:
                newBuffer.writeUInt8(0x04, 0);
                break;
        }
        newBuffer.set(guid, 1);
        return newBuffer;
    }

    static async read<Attrs extends ReadAttributes<Activity>>(options: ReadOptions<Activity, Attrs>): Promise<ModelSet<ReadResult<Activity, Attrs>>> {
        return Model._read(this, options);
    }

    static async readUnique<Attrs extends ReadAttributes<Activity>>(options: ReadUniqueOptions<Activity, Attrs>): Promise<ReadResult<Activity, Attrs> | null> {
        return await Model._readUnique(this, options);
    }

    static async count(where?: ReadWhere<Activity>): Promise<number> {
        return Model._count(this, where);
    }

    static async exists(where: ReadWhere<Activity>): Promise<boolean> {
        return Model._exists(this, where);
    }

    static async getById<Attrs extends ReadAttributes<Activity>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Activity, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }

    static async search<Attrs extends ReadAttributes<Activity>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<Activity, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<Activity> = {
                OR: [
                    {
                        title: {
                            contains: searchString, mode: 'insensitive'
                        }
                    },
                    {
                        description: {
                            contains: searchString, mode: 'insensitive'
                        }
                    },
                    {
                        location: {
                            contains: searchString, mode: 'insensitive'
                        }
                    },
                    {
                        waypoints: {
                            some: {
                                title: {
                                    contains: searchString, mode: 'insensitive'
                                }
                            }
                        }
                    },
                    {
                        parentActivity: {
                            title: {
                                contains: searchString, mode: 'insensitive'
                            }
                        }
                    },
                    {
                        activities: {
                            some: {
                                title: {
                                    contains: searchString, mode: 'insensitive'
                                }
                            }
                        }
                    }
                ],
                tenetId
            };

            // Search by activity name, email, and office name
            return Promise.all([Activity.read({
                where,
                orderBy: {
                    title: 'asc'
                },
                select,
                limit: count,
                offset
            }), Activity.count(where)])
        })
    }

    public async validate(): Promise<{ msg: string; result: boolean }> {
        if (this.isNew()) {
            if (this.type === ActivityType.TASK || this.type === ActivityType.SCHEDULED) {
                if (this.endDate == null) {
                    return {
                        result: false,
                        msg: `${ActivityTypeNameMapping[this.type]} {0} must have an due date.`
                    }
                }
            }

            if (this.parentActivityId != null && this.order == null) {
                return {
                    result: false,
                    msg: `{0} must have a display order when associated with a parent activity.`
                }
            }
        }

        if (this.isDirty('startDate') || this.isDirty('endDate')) {
            if (!this.isLoaded('endDate')) {
                await this.safeLoad('endDate');
            }
            if (!this.isLoaded('startDate')) {
                await this.safeLoad('startDate');
            }

            if (this.startDate == null || this.endDate == null) {
                return {
                    result: false,
                    msg: 'Invalid {0}, start date and due date are required'
                }
            }

            const start = this.startDate!;
            const end = this.endDate!;

            if (dateGreater(start, end, this.type === ActivityType.SCHEDULED ? 'minute' : 'day')) {
                this.logger.error(`Start date for ${this.type === ActivityType.SCHEDULED ? 'scheduled ' : ''}activity cannot be after due date (${this.startDate.toISOString()} > ${this.endDate.toISOString()})`);
                return {
                    result: false,
                    msg: `Invalid {0}, start date cannot be after due date (${this.startDate.toISOString()} > ${this.endDate.toISOString()})`
                }
            }
        }

        return super.validate();
    }

    @on('create', 'before')
    public async updateEventsWithWaypoint() {
        if (this.parentWaypointId != null && this.events != null) {
            for (const event of this.events) {
                event.waypointId = this.parentWaypointId;
            }
        }
    }

    @on('update', 'after')
    public async updateWaypointWithEvents(property: string, value: Buffer, old: Buffer | undefined) {
        if (property === 'parentWaypointId' && (old == null || !value.equals(old))) {
            return this.batchResult(dbClient.contactTimelineEvent.updateMany({
                where: {
                    activityId: this.guid
                },
                data: {
                    waypointId: value
                }
            }))
        }
    }

    protected prepareDirty() {
        for (const event of this.events ?? []) {
            if (event.waypointId == null && this.parentWaypointId != null && event.isNew()) {
                event.waypointId = this.parentWaypointId;
            }
            if (event.opportunityId == null && this.opportunityId != null && event.isNew()) {
                event.opportunityId = this.opportunityId;
            }
        }

        if (this.isNew()) {
            if (this.assignedById != null) {
                if (this.events == null) {
                    this.events = [];
                }

                if (!this.events.find(event => event.eventType === ContactTimelineEventType.ACTIVITY_CREATED)) {
                    this.events.push(new ContactTimelineEvent(undefined, {
                        eventType: ContactTimelineEventType.ACTIVITY_CREATED,
                        userId: this.assignedById,
                        tenetId: this.tenetId,
                        contacts: this.contacts?.map(contact => new Contact(contact.guid, {contactTimelineRelationshipType: ContactTimelineEventJoinType.ACTIVITY_CONTACT})),
                    }));
                }
            }
        }
    }

    static className = (): ModelKeys => 'activity';

    @on('delete', 'after')
    public async delete_deleteSubActivities() {
        if (!this.isLoaded('type')) {
            console.warn('Cannot process deletion of activities because type is not loaded');
        } else if (this.type === ActivityType.PATH || this.type === ActivityType.WAYPOINT) {
            return this.batchResult(dbClient.activity.updateMany({
                where: {
                    parentActivityId: this.guid
                },
                data: {
                    deleted: true,
                    deletedAt: new Date()
                }
            }))
        }
    }

    @ai.function('Check availability in the schedule of the current user', [{
        name: 'checkStart',
        type: 'date'
    }, {
        name: 'checkEnd',
        type: 'date'
    }, {
        name: 'duration',
        description: 'The duration of the activity in minutes',
        type: 'number',
        optional: true
    }, {
        name: 'context',
        type: 'context',
    }], 'string')
    public static async checkScheduleAvailability(checkStart: Date, checkEnd: Date, duration: number | undefined, context: AIContext) {
        // TODO: Implement work week schedule

        const tzOffset = context.tzOffset ?? 0;

        const activities = await Activity.read({
            where: {
                OR: [
                    {
                        startDate: {
                            gte: checkStart,
                            lte: checkEnd
                        },
                    },
                    {
                        endDate: {
                            gte: checkStart,
                            lte: checkEnd
                        }
                    }
                ],
                type: ActivityType.SCHEDULED,
                deleted: false,
                tenetId: context.tenetId ?? undefined,
                users: {
                    some: {
                        id: context.user.guid
                    }
                }
            },
            select: {
                id: true,
                startDate: true,
                endDate: true,
            }
        })

        const schedule = activities.toArray().sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

        let availablePeriods: [Date, Date][] = [] // [start, end]

        let start = checkStart;

        const WORKDAY_START = 7.5 * 60;
        const WORKDAY_END = 17.5 * 60;

        // Transform to user's timezone (args in UTC)
        start.setUTCHours(start.getUTCHours(), start.getUTCMinutes() - tzOffset, 0, 0)
        checkEnd.setUTCHours(checkEnd.getUTCHours(), checkEnd.getUTCMinutes() - tzOffset, 0, 0)

        if (start.getUTCHours() < WORKDAY_START / 60) {
            start.setUTCHours(0, WORKDAY_START, 0, 0);
        }

        if (checkEnd.getUTCHours() > WORKDAY_END / 60) {
            checkEnd.setUTCHours(0, WORKDAY_END, 0, 0);
        }

        for (const activity of schedule) {
            if (activity.startDate > activity.endDate) {
                // Shouldn't ever happen, but just in case
                continue
            }

            const actStart = new Date(activity.startDate);
            // Transform to user's timezone (db is in UTC)
            actStart.setUTCHours(actStart.getUTCHours(), actStart.getUTCMinutes() - tzOffset, 0, 0)
            const actEnd = new Date(activity.endDate);
            actEnd.setUTCHours(actEnd.getUTCHours(), actEnd.getUTCMinutes() - tzOffset, 0, 0)

            if (actStart > checkEnd) {
                // Shouldn't ever happen, but just in case
                break;
            }

            if (start < actStart) {
                let _startMod = start;

                if (!areDatesEqual(start, actStart, true)) {
                    if (differenceInDays(start, actStart) > 1) {
                        // We have days that are completely free
                        for (let i = 1; i < differenceInDays(start, actStart); i++) {
                            const _start = new Date(start);
                            _start.setDate(_start.getDate() + i);
                            _start.setUTCHours(0, WORKDAY_START , 0, 0); // Set to start of work day in the user's timezone

                            const _end = new Date(_start);
                            _end.setUTCHours(0, WORKDAY_END, 0, 0); // Set to start of work day in the user's timezone
                            availablePeriods.push([_start, _end]);
                        }
                    }

                    _startMod = new Date(actStart);
                    _startMod.setUTCHours(0, WORKDAY_START, 0, 0); // Set to start of work day in the user's timezone

                    if (_startMod < actStart) {
                        availablePeriods.push([start, _startMod]);
                    } else {
                        // No available time
                        start = actEnd;
                    }
                    continue;
                }

                // Available
                availablePeriods.push([start, actStart]);

                start = actEnd;
            } else {
                start = actEnd;
            }
        }

        if (start < checkEnd) {
            availablePeriods.push([start, checkEnd]);
        }

        availablePeriods = availablePeriods.filter(period => {
            if (period[0].getUTCHours() <= WORKDAY_START / 60 && period[1].getUTCHours() <= WORKDAY_START / 60) {
                return false;
            } else if (period[0].getUTCHours() < WORKDAY_START / 60) {
                // The start is before the start of the work day, so we'll just make it the start of the work day
                period[0].setUTCHours(0, WORKDAY_START, 0, 0);
            }
            if (period[0].getUTCHours() >= WORKDAY_END / 60 && period[1].getUTCHours() >= WORKDAY_END / 60) {
                return false;
            } else if (period[1].getUTCHours() > WORKDAY_END / 60) {
                // The end is after the end of the work day, so we'll just make it the end of the work day
                period[1].setUTCHours(0, WORKDAY_END, 0, 0);
            }
            if (duration) {
                return period[1].getTime() - period[0].getTime() >= duration * 60 * 1000
            }
            return true;
        })


        // Group by day
        const periodsGrouped: Array<[Date, Date][]> = [];
        let currentGroup: [Date, Date][] | null = null;
        for (const period of availablePeriods) {
            if (currentGroup == null) {
                currentGroup = [[period[0], period[1]]];
            } else if (areDatesEqual(period[0], currentGroup[0][0], true)) {
                currentGroup.push([period[0], period[1]]);
            } else {
                periodsGrouped.push(currentGroup);
                currentGroup = [[period[0], period[1]]];
            }
        }

        if (currentGroup != null) {
            periodsGrouped.push(currentGroup);
        }


        const availability = periodsGrouped.map(group => {
            const groupStart = group[0][0]

            const periods = group.map(period => {
                const [start, end] = period;

                return `${start.toLocaleTimeString('en-US', {
                    hour12: true,
                    timeZone: 'UTC',
                    minute: 'numeric',
                    hour: 'numeric',
                }).replaceAll(':00', '').replaceAll(' ', '')}-${end.toLocaleTimeString('en-US', {
                    hour12: true,
                    timeZone: 'UTC',
                    minute: 'numeric',
                    hour: 'numeric',
                }).replaceAll(':00', '').replaceAll(' ', '')}`;
            })

            return `${groupStart.toLocaleDateString('default', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                weekday: 'short',
                timeZone: 'UTC' // The UTC time is offset to the user's timezone so we need to display as UTC as that's artificially set to the user's timezone
            })}: ${englishList(periods)}`;
        }).join('\n');

        if (availability.length === 0) {
            return 'No availability'
        }
        return availability
    }
}

models.activity = Activity;