/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, wrap} from '~/db/sql/decorators';
import {ActivityStatus, DateOffsetType} from '~/common/enum/enumerations';
import {ActivityTemplate} from '~/db/sql/models/ActivityTemplate';
import {ActivityWaypoint} from '~/db/sql/models/ActivityWaypoint';
import {TemplateAssignment} from '~/db/sql/models/TemplateAssignment';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityWaypointTemplateDefaultData = {
	title?: string;
	description?: string | null;
	defaultStatus?: ActivityStatus;
	order?: number;
	dateOffsetType?: DateOffsetType;
	dueDate?: number;
	parentActivity?: ActivityTemplate;
	parentActivityId?: Buffer;
	activities?: ActivityTemplate[];
	waypoints?: ActivityWaypoint[];
	createdAt?: Date | null;
	updatedAt?: Date | null;
	assignments?: TemplateAssignment[];
	tenet?: Tenet;
	tenetId?: Buffer
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityWaypointTemplateData = ActivityWaypointTemplateDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ActivityWaypointTemplate extends Model<ActivityWaypointTemplate> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public title?: string;
	@persisted declare public description?: string | null;
	@required declare public defaultStatus?: ActivityStatus;
	@required declare public order?: number;
	@required declare public dateOffsetType?: DateOffsetType;
	@required declare public dueDate?: number;
	@wrap('activityTemplate', 'waypoints', 'parentActivityId', true, false) declare public parentActivity?: ActivityTemplate;
	@required declare public parentActivityId?: Buffer;
	@wrap('activityTemplate', 'parentWaypoint', 'parentWaypointId', false, true) declare public activities?: ActivityTemplate[];
	@wrap('activityWaypoint', 'template', 'templateId', false, true) declare public waypoints?: ActivityWaypoint[];
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('templateAssignment', 'waypointTemplate', 'waypointTemplateId', false, true) declare public assignments?: TemplateAssignment[];
	@wrap('tenet', 'activityWaypointTemplates', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ActivityWaypointTemplateData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ActivityWaypointTemplate>>(options: ReadOptions<ActivityWaypointTemplate, Attrs>): Promise<ModelSet<ReadResult<ActivityWaypointTemplate, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ActivityWaypointTemplate>>(options: ReadUniqueOptions<ActivityWaypointTemplate, Attrs>): Promise<ReadResult<ActivityWaypointTemplate, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ActivityWaypointTemplate>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ActivityWaypointTemplate>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ActivityWaypointTemplate>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ActivityWaypointTemplate, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ActivityWaypointTemplate>>(): Promise<SearchResult<ActivityWaypointTemplate, Attrs>> {
        return [new ModelSet(), 0]; // No search for waypoint templates
    }
    
    static className = (): ModelKeys => 'activityWaypointTemplate';
}

models.activityWaypointTemplate = ActivityWaypointTemplate;
        