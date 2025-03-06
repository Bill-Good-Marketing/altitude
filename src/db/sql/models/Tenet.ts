/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, wrap} from '~/db/sql/decorators';
import {User} from '~/db/sql/models/User';
import {Log} from '~/db/sql/models/Log';
import {Contact} from '~/db/sql/models/Contact';
import {Activity} from '~/db/sql/models/Activity';
import {Address} from '~/db/sql/models/Address';
import {ContactEmail} from '~/db/sql/models/ContactEmail';
import {ContactPhone} from '~/db/sql/models/ContactPhone';
import {ImportantDate} from '~/db/sql/models/ImportantDate';
import {Attachment} from '~/db/sql/models/Attachment';
import {Note} from '~/db/sql/models/Note';
import {AuditEvent} from '~/db/sql/models/AuditEvent';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {ActivityStep} from '~/db/sql/models/ActivityStep';
import {ActivityWaypoint} from '~/db/sql/models/ActivityWaypoint';
import {TemplateAssignment} from '~/db/sql/models/TemplateAssignment';
import {ActivityWaypointTemplate} from '~/db/sql/models/ActivityWaypointTemplate';
import {ActivityTemplate} from '~/db/sql/models/ActivityTemplate';
import {ActivityTemplateStep} from '~/db/sql/models/ActivityTemplateStep';
import {Opportunity} from '~/db/sql/models/Opportunity';
import {ProductType} from '~/db/sql/models/ProductType';
import {ActivityTemplateStepAssignment} from '~/db/sql/models/ActivityTemplateStepAssignment';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {quickTrace} from "~/util/tracing";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type TenetDefaultData = {
	name?: string;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	users?: User[];
	logs?: Log[];
	contacts?: Contact[];
	activities?: Activity[];
	addresses?: Address[];
	contactEmails?: ContactEmail[];
	contactPhones?: ContactPhone[];
	importantDates?: ImportantDate[];
	attachments?: Attachment[];
	notes?: Note[];
	auditEvents?: AuditEvent[];
	contactTimelineEvents?: ContactTimelineEvent[];
	activitySteps?: ActivityStep[];
	activityWaypoints?: ActivityWaypoint[];
	templateAssignments?: TemplateAssignment[];
	activityWaypointTemplates?: ActivityWaypointTemplate[];
	activityTemplates?: ActivityTemplate[];
	activityTemplateSteps?: ActivityTemplateStep[];
	opportunities?: Opportunity[];
	products?: ProductType[];
	activityTemplateStepAssignment?: ActivityTemplateStepAssignment[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type TenetData = TenetDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class Tenet extends Model<Tenet> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public name?: string;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('user', 'tenet', 'tenetId', false, true) declare public users?: User[];
	@wrap('log', 'tenet', 'tenetId', false, true) declare public logs?: Log[];
	@wrap('contact', 'tenet', 'tenetId', false, true) declare public contacts?: Contact[];
	@wrap('activity', 'tenet', 'tenetId', false, true) declare public activities?: Activity[];
	@wrap('address', 'tenet', 'tenetId', false, true) declare public addresses?: Address[];
	@wrap('contactEmail', 'tenet', 'tenetId', false, true) declare public contactEmails?: ContactEmail[];
	@wrap('contactPhone', 'tenet', 'tenetId', false, true) declare public contactPhones?: ContactPhone[];
	@wrap('importantDate', 'tenet', 'tenetId', false, true) declare public importantDates?: ImportantDate[];
	@wrap('attachment', 'tenet', 'tenetId', false, true) declare public attachments?: Attachment[];
	@wrap('note', 'tenet', 'tenetId', false, true) declare public notes?: Note[];
	@wrap('auditEvent', 'tenet', 'tenetId', false, true) declare public auditEvents?: AuditEvent[];
	@wrap('contactTimelineEvent', 'tenet', 'tenetId', false, true) declare public contactTimelineEvents?: ContactTimelineEvent[];
	@wrap('activityStep', 'tenet', 'tenetId', false, true) declare public activitySteps?: ActivityStep[];
	@wrap('activityWaypoint', 'tenet', 'tenetId', false, true) declare public activityWaypoints?: ActivityWaypoint[];
	@wrap('templateAssignment', 'tenet', 'tenetId', false, true) declare public templateAssignments?: TemplateAssignment[];
	@wrap('activityWaypointTemplate', 'tenet', 'tenetId', false, true) declare public activityWaypointTemplates?: ActivityWaypointTemplate[];
	@wrap('activityTemplate', 'tenet', 'tenetId', false, true) declare public activityTemplates?: ActivityTemplate[];
	@wrap('activityTemplateStep', 'tenet', 'tenetId', false, true) declare public activityTemplateSteps?: ActivityTemplateStep[];
	@wrap('opportunity', 'tenet', 'tenetId', false, true) declare public opportunities?: Opportunity[];
	@wrap('productType', 'tenet', 'tenetId', false, true) declare public products?: ProductType[];
	@wrap('activityTemplateStepAssignment', 'tenet', 'tenetId', false, true) declare public activityTemplateStepAssignment?: ActivityTemplateStepAssignment[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: TenetData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<Tenet>>(options: ReadOptions<Tenet, Attrs>): Promise<ModelSet<ReadResult<Tenet, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<Tenet>>(options: ReadUniqueOptions<Tenet, Attrs>): Promise<ReadResult<Tenet, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<Tenet>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<Tenet>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<Tenet>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<Tenet, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<Tenet>>(searchString: string, select: Attrs, count: number, offset: number): Promise<SearchResult<Tenet, Attrs>> {
        return await quickTrace(`${this.className()}#search`, async () => {
            const where: ReadWhere<Tenet> = {
                OR: [
                    {
                        name: {
                            contains: searchString, mode: 'insensitive'
                        }
                    },
                    {
                        users: {
                            some: {
                                OR: [
                                    {
                                        email: {
                                            contains: searchString, mode: 'insensitive'
                                        }
                                    },
                                    {
                                        fullName: {
                                            contains: searchString, mode: 'insensitive'
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            }

            // Search by tenet name and users' email and full name
            return Promise.all([Tenet.read({
                where,
                orderBy: {
                    name: 'asc'
                },
                select,
                limit: count,
                offset
            }), Tenet.count(where)])
        })
    }
    
    static className = (): ModelKeys => 'tenet';
}

models.tenet = Tenet;
        