/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, wrap, jointable, persisted, Default} from '~/db/sql/decorators';
import ai from '~/ai/AI';
import {Activity} from '~/db/sql/models/Activity';
import {User} from '~/db/sql/models/User';
import {Tenet} from '~/db/sql/models/Tenet';
import {ActivityStepType} from '~/common/enum/enumerations';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityStepDefaultData = {
	title?: string;
	completed?: boolean;
	activity?: Activity;
	activityId?: Buffer;
	assignedTo?: User[];
	createdAt?: Date | null;
	updatedAt?: Date | null;
	tenet?: Tenet;
	tenetId?: Buffer;
	type?: ActivityStepType;
	order?: number
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityStepData = ActivityStepDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ActivityStep extends Model<ActivityStep> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @ai.property('string', null, false, false)
	@required declare public title?: string;
	
	@ai.property('boolean', null, false, false)
	@required declare public completed?: boolean;
	
	@ai.property('activity', "Parent activity of this step", false, false)
	@wrap('activity', 'steps', 'activityId', true, false) declare public activity?: Activity;
	
	@ai.property('id', null, false, false)
	@required declare public activityId?: Buffer;
	
	@ai.property('user', "Assigned users, if empty this is the same as the parent activity", false, false)
	@jointable('user', 'userRelation', 'activityStepId', 'userId', 'activityStepId_userId', 'activitySteps')
	declare public assignedTo?: User[];
	
	@persisted declare public createdAt?: Date;
	@persisted declare public updatedAt?: Date;
	@wrap('tenet', 'activitySteps', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	
	@ai.property('ActivityStepType', "Type of step, either checkbox, attachment, or form", false, false)
	@persisted @Default(ActivityStepType.CHECK) declare public type?: ActivityStepType;
	
	@ai.property('number', "Step order", false, false)
	@required declare public order?: number;
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ActivityStepData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ActivityStep>>(options: ReadOptions<ActivityStep, Attrs>): Promise<ModelSet<ReadResult<ActivityStep, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ActivityStep>>(options: ReadUniqueOptions<ActivityStep, Attrs>): Promise<ReadResult<ActivityStep, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ActivityStep>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ActivityStep>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ActivityStep>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ActivityStep, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ActivityStep>>(): Promise<SearchResult<ActivityStep, Attrs>> {
        return [new ModelSet(), 0]; // No search for waypoint templates
    }

    static fromArray(steps: string[], tenetId: Buffer, completed = false) {
        return steps.map((step, index) => new ActivityStep(undefined, {
            title: step,
            completed,
            tenetId: tenetId,
            order: index,
        }))
    }
    
    static className = (): ModelKeys => 'activityStep';
}

models.activityStep = ActivityStep;
        