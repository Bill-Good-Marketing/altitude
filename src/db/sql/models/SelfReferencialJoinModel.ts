/* BEGIN GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */
import {Model, models} from '~/db/sql/SQLBase';
import ModelSet from '~/util/db/ModelSet';
import {ReadOptions, ReadUniqueOptions, SearchResult, ReadResult} from '~/db/sql/types/model';
import {ReadWhere} from '~/db/sql/types/where';
import {ReadAttributes} from '~/db/sql/types/select';
import {ModelKeys} from '~/db/sql/keys';
import {jointable, join} from '~/db/sql/decorators';
/* END GENERATED IMPORTS: DO NOT MODIFY OR REMOVE THIS COMMENT */

/* BEGIN GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
type SelfReferencialJoinModelDefaultData = {
	joinProperty?: string;
	joinId?: Buffer;
	joinsAsSource?: SelfReferencialJoinModel[];
	joinsAsTarget?: SelfReferencialJoinModel[]
}
/* END GENERATED TYPES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    
/* Automatically generated type for `data` field in constructor. Can be modified */
type SelfReferencialJoinModelData = SelfReferencialJoinModelDefaultData & {
}
/* End automatically generated type for `data` field in constructor */
        
export class SelfReferencialJoinModel extends Model<SelfReferencialJoinModel> {
    /* BEGIN GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    @jointable('selfReferencialJoinModel', 'target', 'sourceId', 'targetId', true, 'joinsAsTarget')
	declare public joinsAsSource?: SelfReferencialJoinModel[];
	
	@join('joinProperty', ['joinsAsTarget', 'joinsAsSource'], 'selfReferencialJoinModel')
	declare public joinProperty?: string;
	
	@join('id', ['joinsAsTarget', 'joinsAsSource'], 'selfReferencialJoinModel')
	declare public joinId?: Buffer;
	
	@jointable('selfReferencialJoinModel', 'source', 'targetId', 'sourceId', true, 'joinsAsSource')
	declare public joinsAsTarget?: SelfReferencialJoinModel[];
    /* END GENERATED PROPERTIES: DO NOT MODIFY OR REMOVE THIS COMMENT */
    
    constructor(id?: Buffer | string | Uint8Array, data?: SelfReferencialJoinModelData) {
        super(id, data);
    }
    
    static async read<Attrs extends ReadAttributes<SelfReferencialJoinModel>>(options: ReadOptions<SelfReferencialJoinModel, Attrs>): Promise<ModelSet<ReadResult<SelfReferencialJoinModel, Attrs>>> {
		return Model._read(this, options);
    }
    
    static async readUnique<Attrs extends ReadAttributes<SelfReferencialJoinModel>>(options: ReadUniqueOptions<SelfReferencialJoinModel, Attrs>): Promise<ReadResult<SelfReferencialJoinModel, Attrs> | null> {
        return await Model._readUnique(this, options);
    }
    
    static async count(where?: ReadWhere<SelfReferencialJoinModel>): Promise<number> {
        return Model._count(this, where);
    }
    
    static async exists(where: ReadWhere<SelfReferencialJoinModel>): Promise<boolean> {
        return Model._exists(this, where);
    }
    
    static async getById<Attrs extends ReadAttributes<SelfReferencialJoinModel>>(id: Buffer | string, attributes?: Attrs): Promise<ReadResult<SelfReferencialJoinModel, Attrs> | null> {
        return Model._getById(this, id, attributes);
    }
    
    static async search<Attrs extends ReadAttributes<SelfReferencialJoinModel>>(): Promise<SearchResult<SelfReferencialJoinModel, Attrs>> {
        return [new ModelSet(), 0]
    }
    
    static className = (): ModelKeys => 'selfReferencialJoinModel';
}

models.selfReferencialJoinModel = SelfReferencialJoinModel;
        