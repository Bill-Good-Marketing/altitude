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
import {ActivityTemplateStep} from '~/db/sql/models/ActivityTemplateStep';
import {Tenet} from '~/db/sql/models/Tenet';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityTemplateStepAssignmentDefaultData = {
	specificUser?: User | null;
	specificUserId?: Buffer | null;
	specificRole?: Role | null;
	activityTemplateStep?: ActivityTemplateStep;
	activityTemplateStepId?: Buffer;
	tenet?: Tenet;
	tenetId?: Buffer
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityTemplateStepAssignmentData = ActivityTemplateStepAssignmentDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ActivityTemplateStepAssignment extends Model<ActivityTemplateStepAssignment> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @wrap('user', 'templateStepAssignments', 'specificUserId', true, false) declare public specificUser?: User | null;
	@persisted declare public specificUserId?: Buffer | null;
	@persisted declare public specificRole?: Role | null;
	@wrap('activityTemplateStep', 'assignedTo', 'activityTemplateStepId', true, false) declare public activityTemplateStep?: ActivityTemplateStep;
	@required declare public activityTemplateStepId?: Buffer;
	@wrap('tenet', 'activityTemplateStepAssignment', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ActivityTemplateStepAssignmentData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ActivityTemplateStepAssignment>>(options: ReadOptions<ActivityTemplateStepAssignment, Attrs>): Promise<ModelSet<ReadResult<ActivityTemplateStepAssignment, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ActivityTemplateStepAssignment>>(options: ReadUniqueOptions<ActivityTemplateStepAssignment, Attrs>): Promise<ReadResult<ActivityTemplateStepAssignment, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ActivityTemplateStepAssignment>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ActivityTemplateStepAssignment>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ActivityTemplateStepAssignment>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ActivityTemplateStepAssignment, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ActivityTemplateStepAssignment>>(): Promise<SearchResult<ActivityTemplateStepAssignment, Attrs>> {
        return [new ModelSet(), 0]; // No search for activity template step assignments
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
    
    static className = (): ModelKeys => 'activityTemplateStepAssignment';
}

models.activityTemplateStepAssignment = ActivityTemplateStepAssignment;
        