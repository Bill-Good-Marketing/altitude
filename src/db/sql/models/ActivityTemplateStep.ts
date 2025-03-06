/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {required, persisted, Default, wrap} from '~/db/sql/decorators';
import {ActivityStepType} from '~/common/enum/enumerations';
import {ActivityTemplate} from '~/db/sql/models/ActivityTemplate';
import {Tenet} from '~/db/sql/models/Tenet';
import {ActivityTemplateStepAssignment} from '~/db/sql/models/ActivityTemplateStepAssignment';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type ActivityTemplateStepDefaultData = {
	order?: number;
	title?: string;
	type?: ActivityStepType;
	activityTemplate?: ActivityTemplate;
	activityTemplateId?: Buffer;
	tenet?: Tenet;
	tenetId?: Buffer;
	assignedTo?: ActivityTemplateStepAssignment[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type ActivityTemplateStepData = ActivityTemplateStepDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class ActivityTemplateStep extends Model<ActivityTemplateStep> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @required declare public order?: number;
	@required declare public title?: string;
	@persisted @Default(ActivityStepType.CHECK) declare public type?: ActivityStepType;
	@wrap('activityTemplate', 'steps', 'activityTemplateId', true, false) declare public activityTemplate?: ActivityTemplate;
	@required declare public activityTemplateId?: Buffer;
	@wrap('tenet', 'activityTemplateSteps', 'tenetId', true, false) declare public tenet?: Tenet;
	@required declare public tenetId?: Buffer;
	@wrap('activityTemplateStepAssignment', 'activityTemplateStep', 'activityTemplateStepId', false, true) declare public assignedTo?: ActivityTemplateStepAssignment[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: ActivityTemplateStepData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<ActivityTemplateStep>>(options: ReadOptions<ActivityTemplateStep, Attrs>): Promise<ModelSet<ReadResult<ActivityTemplateStep, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<ActivityTemplateStep>>(options: ReadUniqueOptions<ActivityTemplateStep, Attrs>): Promise<ReadResult<ActivityTemplateStep, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<ActivityTemplateStep>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<ActivityTemplateStep>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<ActivityTemplateStep>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<ActivityTemplateStep, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<ActivityTemplateStep>>(): Promise<SearchResult<ActivityTemplateStep, Attrs>> {
        return [new ModelSet(), 0]; // No search for waypoint templates
    }
    
    static className = (): ModelKeys => 'activityTemplateStep';
}

models.activityTemplateStep = ActivityTemplateStep;
        