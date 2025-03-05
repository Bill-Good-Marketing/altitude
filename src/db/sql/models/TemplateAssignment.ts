/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {User} from '~/db/sql/models/User';
import {wrap, persisted, required} from '~/db/sql/decorators';
import {Role} from '~/common/enum/enumerations';
import {ActivityTemplate} from '~/db/sql/models/ActivityTemplate';
import {ActivityWaypointTemplate} from '~/db/sql/models/ActivityWaypointTemplate';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type TemplateAssignmentDefaultData = {
	specificUser?: User | null;
	specificUserId?: Buffer | null;
	specificRole?: Role | null;
	activityTemplate?: ActivityTemplate | null;
	activityTemplateId?: Buffer | null;
	waypointTemplate?: ActivityWaypointTemplate | null;
	waypointTemplateId?: Buffer | null;
	createdAt?: Date | null;
	updatedAt?: Date | null;
	tenet?: Tenet;
	tenetId?: Buffer
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type TemplateAssignmentData = TemplateAssignmentDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class TemplateAssignment extends Model<TemplateAssignment> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @wrap('user', 'templateAssignments', 'specificUserId', true, false) declare public specificUser?: User | null;
	@persisted declare public specificUserId?: Buffer | null;
	@persisted declare public specificRole?: Role | null;
	@wrap('activityTemplate', 'assignments', 'activityTemplateId', true, false) declare public activityTemplate?: ActivityTemplate | null;
	@persisted declare public activityTemplateId?: Buffer | null;
	@wrap('activityWaypointTemplate', 'assignments', 'waypointTemplateId', true, false) declare public waypointTemplate?: ActivityWaypointTemplate | null;
	@persisted declare public waypointTemplateId?: Buffer | null;
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('tenet', 'templateAssignments', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: TemplateAssignmentData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<TemplateAssignment>>(options: ReadOptions<TemplateAssignment, Attrs>): Promise<ModelSet<ReadResult<TemplateAssignment, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<TemplateAssignment>>(options: ReadUniqueOptions<TemplateAssignment, Attrs>): Promise<ReadResult<TemplateAssignment, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<TemplateAssignment>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<TemplateAssignment>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<TemplateAssignment>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<TemplateAssignment, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<TemplateAssignment>>(): Promise<SearchResult<TemplateAssignment, Attrs>> {
        return [new ModelSet(), 0]; // No search for waypoint templates
    }

    async validate(): Promise<{ msg: string; result: boolean }> {
        if (this.isDirty('specificUserId') || this.isDirty('specificRole')) {
            if (!this.isLoaded('specificUserId')) {
                await this.safeLoad('specificUserId');
            }
            if (!this.isLoaded('specificRole')) {
                await this.safeLoad('specificRole');
            }

            if (this.specificUserId == null && this.specificRole == null) {
                return {
                    result: false,
                    msg: 'Invalid {0}, either a user or a role must be specified'
                }
            } else if (this.specificUserId != null && this.specificRole != null) {
                return {
                    result: false,
                    msg: 'Invalid {0}, only one of a user or a role must be specified'
                }
            }
        }

        return super.validate();
    }

    static className = (): ModelKeys => 'templateAssignment';
}

models.templateAssignment = TemplateAssignment;
        