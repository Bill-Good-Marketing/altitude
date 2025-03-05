/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, jointable, wrap} from '~/db/sql/decorators';
import {ActivityStatus} from '~/common/enum/enumerations';
import {User} from '~/db/sql/models/User';
import ai from '~/ai/AI';
import {Activity} from '~/db/sql/models/Activity';
import {ActivityWaypointTemplate} from '~/db/sql/models/ActivityWaypointTemplate';
import {ContactTimelineEvent} from '~/db/sql/models/ContactTimelineEvent';
import {Tenet} from '~/db/sql/models/Tenet';
import {Note} from '~/db/sql/models/Note';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {dateGreater} from "~/util/time/date";

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityWaypointDefaultData = {
	title?: string;
	description?: string | null;
	summary?: string | null;
	status?: ActivityStatus;
	order?: number;
	actualStart?: Date;
	dueDate?: Date;
	actualEnd?: Date | null;
	users?: User[];
	activity?: Activity;
	activityId?: Buffer;
	childActivities?: Activity[];
	template?: ActivityWaypointTemplate | null;
	templateId?: Buffer | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	events?: ContactTimelineEvent[];
	tenet?: Tenet;
	tenetId?: Buffer;
	Note?: Note[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityWaypointData = ActivityWaypointDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ActivityWaypoint extends Model<ActivityWaypoint> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public title?: string;
	@persisted declare public description?: string | null;
	@persisted declare public summary?: string | null;
	@required declare public status?: ActivityStatus;
	@required declare public order?: number;
	@required declare public actualStart?: Date;
	@required declare public dueDate?: Date;
	@persisted declare public actualEnd?: Date | null;
	
	@ai.property('user', "Users who are involved in this waypoint", false, false)
	@jointable('user', 'userRelation', 'waypointId', 'userId', 'userId_waypointId', 'waypoints')
	declare public users?: User[];
	
	@ai.property('activity', "Parent activity of this waypoint", false, false)
	@wrap('activity', 'waypoints', 'activityId', true, false) declare public activity?: Activity;
	
	@ai.property('id', null, false, false)
	@required declare public activityId?: Buffer;
	
	@ai.property('activity', "Activities associated with this waypoint", true, false)
	@wrap('activity', 'parentWaypoint', 'parentWaypointId', false, true) declare public childActivities?: Activity[];
	
	@wrap('activityWaypointTemplate', 'waypoints', 'templateId', true, false) declare public template?: ActivityWaypointTemplate | null;
	@persisted declare public templateId?: Buffer | null;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('contactTimelineEvent', 'waypoint', 'waypointId', false, true) declare public events?: ContactTimelineEvent[];
	@wrap('tenet', 'activityWaypoints', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	@wrap('note', 'waypoint', 'waypointId', false, true) declare public Note?: Note[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ActivityWaypointData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ActivityWaypoint>>(options: ReadOptions<ActivityWaypoint, Attrs>): Promise<ModelSet<ReadResult<ActivityWaypoint, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ActivityWaypoint>>(options: ReadUniqueOptions<ActivityWaypoint, Attrs>): Promise<ReadResult<ActivityWaypoint, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ActivityWaypoint>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ActivityWaypoint>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ActivityWaypoint>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ActivityWaypoint, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ActivityWaypoint>>(): Promise<SearchResult<ActivityWaypoint, Attrs>> {
        return [new ModelSet(), 0]; // No search for waypoints
    }

	prepareDirty() {
		for (const event of this.events ?? []) {
			if (event.activityId == null && this.activityId != null && event.isNew()) {
				event.activityId = this.activityId;
			}
		}
	}

	public async validate(): Promise<{ msg: string; result: boolean }> {
		if (this.isDirty('actualStart') || this.isDirty('dueDate')) {
			if (!this.isLoaded('dueDate')) {
				await this.safeLoad('dueDate');
			}
			if (!this.isLoaded('actualStart')) {
				await this.safeLoad('actualStart');
			}

			if (this.dueDate == null || this.actualStart == null) {
				return {
					result: false,
					msg: 'Invalid {0}, due date and actual start date are required'
				}
			}

			if (dateGreater(this.actualStart!, this.dueDate!, 'day')) {
				return {
					result: false,
					msg: 'Invalid {0}, due date cannot be after actual start date'
				}
			}
		}

		return super.validate();
	}
    
    static className = (): ModelKeys => 'activityWaypoint';
}

models.activityWaypoint = ActivityWaypoint;
        