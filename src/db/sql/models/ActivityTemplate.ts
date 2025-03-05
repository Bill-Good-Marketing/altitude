/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, wrap} from '~/db/sql/decorators';
import {ActivityType, ActivityPriority, ActivityStatus, TaskScheduleType, DateOffsetType} from '~/common/enum/enumerations';
import {ActivityTemplateStep} from '~/db/sql/models/ActivityTemplateStep';
import {ActivityWaypointTemplate} from '~/db/sql/models/ActivityWaypointTemplate';
import {Activity} from '~/db/sql/models/Activity';
import {TemplateAssignment} from '~/db/sql/models/TemplateAssignment';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityTemplateDefaultData = {
	title?: string;
	description?: string | null;
	type?: ActivityType;
	defaultPriority?: ActivityPriority;
	defaultStatus?: ActivityStatus;
	steps?: ActivityTemplateStep[];
	taskScheduleType?: TaskScheduleType | null;
	dateOffsetType?: DateOffsetType;
	startDate?: number;
	endDate?: number;
	startRelativeTo?: ActivityTemplate | null;
	startRelativeToId?: Buffer | null;
	dependents?: ActivityTemplate[];
	parentWaypoint?: ActivityWaypointTemplate | null;
	parentWaypointId?: Buffer | null;
	parentActivity?: ActivityTemplate | null;
	parentActivityId?: Buffer | null;
	waypoints?: ActivityWaypointTemplate[];
	childActivities?: ActivityTemplate[];
	activities?: Activity[];
	createdAt?: Date | null;
	updatedAt?: Date | null;
	assignments?: TemplateAssignment[];
	tenet?: Tenet;
	tenetId?: Buffer;
	order?: number | null
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityTemplateData = ActivityTemplateDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ActivityTemplate extends Model<ActivityTemplate> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public title?: string;
	@persisted declare public description?: string | null;
	@required declare public type?: ActivityType;
	@required declare public defaultPriority?: ActivityPriority;
	@required declare public defaultStatus?: ActivityStatus;
	@wrap('activityTemplateStep', 'activityTemplate', 'activityTemplateId', false, true) declare public steps?: ActivityTemplateStep[];
	@persisted declare public taskScheduleType?: TaskScheduleType | null;
	@required declare public dateOffsetType?: DateOffsetType;
	@required declare public startDate?: number;
	@required declare public endDate?: number;
	@wrap('activityTemplate', 'dependents', 'startRelativeToId', true, false) declare public startRelativeTo?: ActivityTemplate | null;
	@persisted declare public startRelativeToId?: Buffer | null;
	@wrap('activityTemplate', 'startRelativeTo', 'startRelativeToId', false, true) declare public dependents?: ActivityTemplate[];
	@wrap('activityWaypointTemplate', 'activities', 'parentWaypointId', true, false) declare public parentWaypoint?: ActivityWaypointTemplate | null;
	@persisted declare public parentWaypointId?: Buffer | null;
	@wrap('activityTemplate', 'childActivities', 'parentActivityId', true, false) declare public parentActivity?: ActivityTemplate | null;
	@persisted declare public parentActivityId?: Buffer | null;
	@wrap('activityWaypointTemplate', 'parentActivity', 'parentActivityId', false, true) declare public waypoints?: ActivityWaypointTemplate[];
	@wrap('activityTemplate', 'parentActivity', 'parentActivityId', false, true) declare public childActivities?: ActivityTemplate[];
	@wrap('activity', 'template', 'templateId', false, true) declare public activities?: Activity[];
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('templateAssignment', 'activityTemplate', 'activityTemplateId', false, true) declare public assignments?: TemplateAssignment[];
	@wrap('tenet', 'activityTemplates', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	@persisted declare public order?: number | null;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ActivityTemplateData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ActivityTemplate>>(options: ReadOptions<ActivityTemplate, Attrs>): Promise<ModelSet<ReadResult<ActivityTemplate, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ActivityTemplate>>(options: ReadUniqueOptions<ActivityTemplate, Attrs>): Promise<ReadResult<ActivityTemplate, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ActivityTemplate>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ActivityTemplate>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ActivityTemplate>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ActivityTemplate, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ActivityTemplate>>(searchString: string, select: Attrs, count: number, offset: number, tenetId?: Buffer): Promise<SearchResult<ActivityTemplate, Attrs>> {
		const where: ReadWhere<ActivityTemplate> = {
			tenetId,
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
					waypoints: {
						some: {
							title: {
								contains: searchString, mode: 'insensitive'
							}
						}
					},
				},
				{
					parentActivity: {
						title: {
							contains: searchString, mode: 'insensitive'
						}
					},
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
		};

		return Promise.all([
			ActivityTemplate.read({
				where,
				orderBy: {
					title: 'asc'
				},
				select,
				limit: count,
				offset
			}), ActivityTemplate.count(where)
		])
    }
    
    static className = (): ModelKeys => 'activityTemplate';
}

models.activityTemplate = ActivityTemplate;
        